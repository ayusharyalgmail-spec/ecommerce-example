create schema if not exists app_private;

create or replace function app_private.ledger_can(p_level text)
returns boolean
language plpgsql stable security definer
set search_path = pg_catalog, public
as $$
declare v_role text;
begin
  select role into v_role from public.staff_members where user_id = auth.uid() and is_active;
  if v_role is null then return false; end if;
  if p_level = 'adjust' then return v_role in ('owner', 'manager'); end if;
  return v_role in ('owner', 'manager', 'staff');
end $$;
revoke all on function app_private.ledger_can(text) from public;
grant execute on function app_private.ledger_can(text) to authenticated;

create table if not exists public.ledger_customers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(btrim(name)) between 1 and 120),
  phone       text check (phone is null or phone ~ '^\+9779\d{9}$'),
  notes       text check (notes is null or char_length(notes) <= 1000),
  is_archived boolean not null default false,
  created_by  uuid default auth.uid() references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);
create unique index if not exists ledger_customers_phone_live
  on public.ledger_customers (phone) where phone is not null and not is_archived;

create table if not exists public.ledger_entries (
  id              uuid primary key default gen_random_uuid(),
  customer_id     uuid not null references public.ledger_customers(id),
  kind            text not null check (kind in ('sale', 'payment', 'refund', 'adjustment')),
  delta_paisa     bigint not null check (delta_paisa <> 0),
  method          text check (method in ('cash', 'bank', 'esewa', 'khalti', 'other')),
  reference       text check (reference is null or char_length(reference) <= 120),
  note            text check (note is null or char_length(note) <= 500),
  bill_ref        text check (bill_ref is null or char_length(bill_ref) <= 60),
  idempotency_key uuid not null,
  created_by      uuid default auth.uid() references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  constraint ledger_sign_matches_kind check (
    (kind = 'sale' and delta_paisa > 0) or
    (kind in ('payment', 'refund') and delta_paisa < 0) or
    kind = 'adjustment'),
  constraint ledger_payment_has_method check (kind not in ('payment', 'refund') or method is not null),
  constraint ledger_adjustment_has_note check (kind <> 'adjustment' or note is not null)
);
create unique index if not exists ledger_entries_idem on public.ledger_entries (idempotency_key);
create index if not exists ledger_entries_customer on public.ledger_entries (customer_id, created_at desc);
create index if not exists ledger_entries_day on public.ledger_entries (created_at);

create or replace function app_private.ledger_immutable()
returns trigger language plpgsql set search_path = pg_catalog as $$
begin
  raise exception 'ledger_immutable: post an adjustment instead of editing or deleting' using errcode = 'P0001';
end $$;
drop trigger if exists ledger_no_update on public.ledger_entries;
create trigger ledger_no_update before update or delete on public.ledger_entries
  for each row execute function app_private.ledger_immutable();

alter table public.ledger_customers enable row level security;
alter table public.ledger_entries   enable row level security;

drop policy if exists ledger_customers_read on public.ledger_customers;
create policy ledger_customers_read on public.ledger_customers
  for select to authenticated using (app_private.ledger_can('view'));
drop policy if exists ledger_customers_insert on public.ledger_customers;
create policy ledger_customers_insert on public.ledger_customers
  for insert to authenticated with check (app_private.ledger_can('write'));
drop policy if exists ledger_customers_update on public.ledger_customers;
create policy ledger_customers_update on public.ledger_customers
  for update to authenticated using (app_private.ledger_can('write')) with check (app_private.ledger_can('write'));

drop policy if exists ledger_entries_read on public.ledger_entries;
create policy ledger_entries_read on public.ledger_entries
  for select to authenticated using (app_private.ledger_can('view'));

revoke all on public.ledger_customers, public.ledger_entries from anon, authenticated;
grant select, insert, update on public.ledger_customers to authenticated;
grant select on public.ledger_entries to authenticated;

create or replace view public.ledger_customer_balances with (security_invoker = true) as
select c.id, c.name, c.phone, c.is_archived,
       coalesce(sum(e.delta_paisa), 0)::bigint as balance_paisa,
       max(e.created_at) as last_activity,
       max(e.created_at) filter (where e.kind = 'payment') as last_payment
from public.ledger_customers c
left join public.ledger_entries e on e.customer_id = c.id
group by c.id;
revoke all on public.ledger_customer_balances from anon;
grant select on public.ledger_customer_balances to authenticated;

create or replace function app_private.ledger_lock_balance(p_customer uuid)
returns bigint language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_arch boolean; v_bal bigint;
begin
  select is_archived into v_arch from public.ledger_customers where id = p_customer for update;
  if not found then raise exception 'customer_not_found' using errcode = 'P0002'; end if;
  if v_arch then raise exception 'customer_archived' using errcode = 'P0001'; end if;
  select coalesce(sum(delta_paisa), 0) into v_bal from public.ledger_entries where customer_id = p_customer;
  return v_bal;
end $$;
revoke all on function app_private.ledger_lock_balance(uuid) from public, anon, authenticated;

create or replace function public.ledger_record_sale(
  p_customer uuid, p_total_paisa bigint, p_paid_paisa bigint, p_method text,
  p_bill_ref text, p_note text, p_key uuid)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_bal bigint;
begin
  if not app_private.ledger_can('write') then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_key is null then raise exception 'invalid_key' using errcode = '22023'; end if;
  if p_total_paisa is null or p_total_paisa <= 0 then raise exception 'invalid_amount' using errcode = '22023'; end if;
  if p_paid_paisa is null or p_paid_paisa < 0 or p_paid_paisa > p_total_paisa then
    raise exception 'invalid_paid_amount' using errcode = '22023'; end if;
  if p_paid_paisa > 0 and p_method is null then raise exception 'method_required' using errcode = '22023'; end if;
  v_bal := app_private.ledger_lock_balance(p_customer);
  if exists (select 1 from public.ledger_entries where idempotency_key = p_key) then
    return jsonb_build_object('balance_paisa', v_bal, 'duplicate', true);
  end if;
  insert into public.ledger_entries (customer_id, kind, delta_paisa, bill_ref, note, idempotency_key)
  values (p_customer, 'sale', p_total_paisa, nullif(btrim(p_bill_ref), ''), nullif(btrim(p_note), ''), p_key);
  v_bal := v_bal + p_total_paisa;
  if p_paid_paisa > 0 then
    insert into public.ledger_entries (customer_id, kind, delta_paisa, method, bill_ref, idempotency_key)
    values (p_customer, 'payment', -p_paid_paisa, p_method, nullif(btrim(p_bill_ref), ''), gen_random_uuid());
    v_bal := v_bal - p_paid_paisa;
  end if;
  return jsonb_build_object('balance_paisa', v_bal, 'duplicate', false);
end $$;

create or replace function public.ledger_record_payment(
  p_customer uuid, p_amount_paisa bigint, p_method text, p_reference text, p_note text, p_key uuid)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_bal bigint;
begin
  if not app_private.ledger_can('write') then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_key is null then raise exception 'invalid_key' using errcode = '22023'; end if;
  if p_amount_paisa is null or p_amount_paisa <= 0 then raise exception 'invalid_amount' using errcode = '22023'; end if;
  if p_method is null then raise exception 'method_required' using errcode = '22023'; end if;
  v_bal := app_private.ledger_lock_balance(p_customer);
  if exists (select 1 from public.ledger_entries where idempotency_key = p_key) then
    return jsonb_build_object('balance_paisa', v_bal, 'duplicate', true);
  end if;
  if p_amount_paisa > v_bal then raise exception 'overpayment' using errcode = 'P0001'; end if;
  insert into public.ledger_entries (customer_id, kind, delta_paisa, method, reference, note, idempotency_key)
  values (p_customer, 'payment', -p_amount_paisa, p_method, nullif(btrim(p_reference), ''), nullif(btrim(p_note), ''), p_key);
  return jsonb_build_object('balance_paisa', v_bal - p_amount_paisa, 'duplicate', false);
end $$;

create or replace function public.ledger_adjust(p_customer uuid, p_delta_paisa bigint, p_reason text, p_key uuid)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_bal bigint;
begin
  if not app_private.ledger_can('adjust') then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_key is null then raise exception 'invalid_key' using errcode = '22023'; end if;
  if p_delta_paisa is null or p_delta_paisa = 0 then raise exception 'invalid_amount' using errcode = '22023'; end if;
  if p_reason is null or char_length(btrim(p_reason)) < 3 then raise exception 'reason_required' using errcode = '22023'; end if;
  v_bal := app_private.ledger_lock_balance(p_customer);
  if exists (select 1 from public.ledger_entries where idempotency_key = p_key) then
    return jsonb_build_object('balance_paisa', v_bal, 'duplicate', true);
  end if;
  insert into public.ledger_entries (customer_id, kind, delta_paisa, note, idempotency_key)
  values (p_customer, 'adjustment', p_delta_paisa, btrim(p_reason), p_key);
  return jsonb_build_object('balance_paisa', v_bal + p_delta_paisa, 'duplicate', false);
end $$;

create or replace function public.ledger_daily_summary(p_day date default null)
returns jsonb language plpgsql stable security definer set search_path = pg_catalog, public as $$
declare
  v_day date := coalesce(p_day, (now() at time zone 'Asia/Kathmandu')::date);
  v_from timestamptz := (v_day::timestamp at time zone 'Asia/Kathmandu');
  v_to   timestamptz := ((v_day + 1)::timestamp at time zone 'Asia/Kathmandu');
  r record;
  v_dues bigint;
begin
  if not app_private.ledger_can('view') then raise exception 'forbidden' using errcode = '42501'; end if;
  select
    coalesce(sum(delta_paisa) filter (where kind = 'sale'), 0)::bigint                  as sales,
    coalesce(-sum(delta_paisa) filter (where kind = 'payment'), 0)::bigint              as collected,
    coalesce(-sum(delta_paisa) filter (where kind = 'payment' and method = 'cash'), 0)::bigint as cash,
    coalesce(-sum(delta_paisa) filter (where kind = 'refund'), 0)::bigint               as refunds,
    count(*) filter (where kind = 'sale')                                               as sale_count
  into r
  from public.ledger_entries where created_at >= v_from and created_at < v_to;
  select coalesce(sum(b), 0) into v_dues from (
    select sum(e.delta_paisa) b from public.ledger_entries e group by e.customer_id having sum(e.delta_paisa) > 0) x;
  return jsonb_build_object(
    'day', v_day, 'sales_paisa', r.sales, 'collected_paisa', r.collected, 'cash_collected_paisa', r.cash,
    'refunds_paisa', r.refunds, 'sale_count', r.sale_count,
    'net_credit_change_paisa', r.sales - r.collected - r.refunds,
    'total_dues_paisa', v_dues);
end $$;

create or replace function public.ledger_daily_series(p_days int default 14)
returns table (day date, sales_paisa bigint, collected_paisa bigint)
language plpgsql stable security definer set search_path = pg_catalog, public as $$
declare v_today date := (now() at time zone 'Asia/Kathmandu')::date;
begin
  if not app_private.ledger_can('view') then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_days is null or p_days < 1 or p_days > 90 then raise exception 'invalid_range' using errcode = '22023'; end if;
  return query
  select d::date,
         coalesce(sum(e.delta_paisa) filter (where e.kind = 'sale'), 0)::bigint,
         coalesce(-sum(e.delta_paisa) filter (where e.kind = 'payment'), 0)::bigint
  from generate_series(v_today - (p_days - 1), v_today, interval '1 day') d
  left join public.ledger_entries e
    on e.created_at >= (d::timestamp at time zone 'Asia/Kathmandu')
   and e.created_at <  ((d + interval '1 day')::timestamp at time zone 'Asia/Kathmandu')
  group by d order by d;
end $$;

revoke all on function public.ledger_record_sale(uuid, bigint, bigint, text, text, text, uuid) from public, anon;
revoke all on function public.ledger_record_payment(uuid, bigint, text, text, text, uuid) from public, anon;
revoke all on function public.ledger_adjust(uuid, bigint, text, uuid) from public, anon;
revoke all on function public.ledger_daily_summary(date) from public, anon;
revoke all on function public.ledger_daily_series(int) from public, anon;
grant execute on function public.ledger_record_sale(uuid, bigint, bigint, text, text, text, uuid) to authenticated;
grant execute on function public.ledger_record_payment(uuid, bigint, text, text, text, uuid) to authenticated;
grant execute on function public.ledger_adjust(uuid, bigint, text, uuid) to authenticated;
grant execute on function public.ledger_daily_summary(date) to authenticated;
grant execute on function public.ledger_daily_series(int) to authenticated;