-- Tenant isolation for the single shared database (Phase 4 of the multi-tenant unification).
-- NOT APPLIED to any live database. Idempotent: safe to re-run. Review with the owner, then apply (see SECURITY.md section 9).
--
-- Model
--   * tenants / tenant_members / platform_admins decide WHO may act for WHICH store.
--   * Every store table gets tenant_id (NOT NULL, FK, index). The existing rows become the flagship tenant `ecommerce`.
--   * "Which store is this request for?" is app_private.current_tenant_id(): the RPC-pinned `app.tenant_id` setting, else the
--     `x-tenant-id` request header (set by the browser client), else the flagship. An unknown id resolves to NULL (no rows).
--   * One RESTRICTIVE policy (tenant_scope) on each store table ANDs onto every existing policy, so reads and writes are confined to
--     the current tenant, and the public sees only ACTIVE tenants. Staff permission checks (has_permission) become per-tenant, which
--     fixes every existing policy and SECURITY DEFINER RPC at once. The header only selects a tenant: permission is still verified
--     against membership of THAT tenant, so a forged header grants nothing.
--   * quote_checkout / place_order gain a leading p_tenant_id; the old signatures become internal (EXECUTE revoked).
--   * Storage writes must be under "<tenant_id>/"; pre-existing un-prefixed objects stay readable and are managed by the flagship.

-- ============================================================ 0. tenancy tables
create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null check (slug ~ '^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$'),
  business_name text not null,
  status text not null default 'draft' check (status in ('draft','active','suspended')),
  owner_id uuid references auth.users(id) on delete set null,
  custom_domain text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.tenants add column if not exists features jsonb not null default '{}'::jsonb;

create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.tenant_members (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'staff' check (role in ('owner','manager','staff','editor','viewer')),
  created_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);
create index if not exists idx_tenant_members_user on public.tenant_members (user_id);

-- The flagship demo store. Every pre-existing row below is assigned to it.
insert into public.tenants (slug, business_name, status, features)
values ('ecommerce', 'Ecommerce', 'active',
  '{"coupons":true,"campaigns":true,"ledger":true,"messaging":true,"min_order_qty":true,"reviews":true,"pos_export":true}')
on conflict (slug) do nothing;
update public.tenants set features = '{"coupons":true,"campaigns":true,"ledger":true,"messaging":true,"min_order_qty":true,"reviews":true,"pos_export":true}'
  where slug = 'ecommerce';

-- ============================================================ 1. helpers (SECURITY DEFINER, fixed search_path)
create or replace function public.is_platform_admin() returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.platform_admins a where a.user_id = (select auth.uid())); $$;

create or replace function public.is_tenant_member(p_tenant_id uuid, p_roles text[] default array['owner','manager','staff','editor','viewer'])
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.tenant_members m where m.tenant_id = p_tenant_id and m.user_id = (select auth.uid()) and m.role = any(p_roles))
      or exists (select 1 from public.tenants t where t.id = p_tenant_id and t.owner_id = (select auth.uid()) and 'owner' = any(p_roles))
      or exists (select 1 from public.tenant_staff s where s.tenant_id = p_tenant_id and s.user_id = (select auth.uid()) and s.role = any(p_roles));
$$;

-- The brochure-site policies (control-plane baseline) call the app_private versions: point them at the same logic.
create or replace function app_private.is_platform_admin() returns boolean
language sql stable security definer set search_path = ''
as $$ select public.is_platform_admin(); $$;
create or replace function app_private.is_tenant_member(p_tenant uuid, p_roles text[] default array['owner','manager','staff','editor','viewer'])
returns boolean language sql stable security definer set search_path = ''
as $$ select public.is_tenant_member(p_tenant, p_roles); $$;

revoke all on function public.is_platform_admin(), public.is_tenant_member(uuid, text[]) from public;
grant execute on function public.is_platform_admin(), public.is_tenant_member(uuid, text[]) to anon, authenticated;
grant execute on function app_private.is_platform_admin(), app_private.is_tenant_member(uuid, text[]) to anon, authenticated;

create or replace function app_private.flagship_tenant_id() returns uuid
language sql stable security definer set search_path = ''
as $$ select id from public.tenants where slug = 'ecommerce'; $$;

-- Which store is this request for? NULL means "unknown tenant": every scoped table then returns no rows.
create or replace function app_private.current_tenant_id() returns uuid
language plpgsql stable security definer set search_path = ''
as $$
declare v text; t uuid;
begin
  v := nullif(current_setting('app.tenant_id', true), '');
  if v is null then
    begin v := nullif(nullif(current_setting('request.headers', true), '')::json ->> 'x-tenant-id', '');
    exception when others then v := null; end;
  end if;
  if v is null then return app_private.flagship_tenant_id(); end if;
  begin t := v::uuid; exception when others then return null; end;
  return (select id from public.tenants where id = t);
end $$;

create or replace function app_private.tenant_feature(p_tenant uuid, p_key text) returns boolean
language sql stable security definer set search_path = ''
as $$ select coalesce(t.slug = 'ecommerce' or (t.features ->> p_key) = 'true', false) from public.tenants t where t.id = p_tenant; $$;

create or replace function app_private.tenant_is_active(p_tenant uuid) returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.tenants t where t.id = p_tenant and t.status = 'active'); $$;

-- Staff permissions are per tenant. The one-argument form (used by every existing policy and RPC) now means "in the current tenant".
create or replace function app_private.has_permission(p text, p_tenant uuid) returns boolean
language plpgsql stable security definer set search_path = ''
as $$ begin
  return exists (select 1 from public.staff_members s
    where s.user_id = auth.uid() and s.tenant_id = p_tenant and s.is_active
      and (p = any(app_private.role_permissions(s.role)) or p = any(s.permissions)));
end $$;

create or replace function app_private.has_permission(p text) returns boolean
language sql stable security definer set search_path = ''
as $$ select app_private.has_permission(p, (select app_private.current_tenant_id())); $$;
grant execute on function app_private.has_permission(text), app_private.has_permission(text, uuid), app_private.current_tenant_id(),
  app_private.tenant_is_active(uuid), app_private.tenant_feature(uuid, text) to anon, authenticated;

-- ============================================================ 2. tenant_id on every store table
do $$
declare t text; v_flag uuid := app_private.flagship_tenant_id();
begin
  foreach t in array array[
    'audit_logs','banners','cart_items','carts','categories','coupon_redemptions','coupons','customer_addresses','delivery_zones',
    'ledger_customers','ledger_entries','msg_campaign_reads','msg_campaigns','msg_conversations','msg_guests','msg_messages',
    'msg_notifications','msg_preferences','notification_deliveries','notification_events','notification_preferences','order_items',
    'order_status_events','order_verifications','orders','payment_records','product_images','products','push_subscriptions','reviews',
    'staff_invites','staff_members','stock_movements','store_settings','wishlists','break_glass_sessions']
  loop
    -- A constant default adds the column without rewriting triggers or immutable ledgers; existing rows become the flagship.
    execute format('alter table public.%I add column if not exists tenant_id uuid not null default %L', t, v_flag);
    execute format('alter table public.%I alter column tenant_id set default app_private.current_tenant_id()', t);
    if not exists (select 1 from pg_constraint where conrelid = format('public.%I', t)::regclass and conname = t || '_tenant_id_fkey') then
      execute format('alter table public.%I add constraint %I foreign key (tenant_id) references public.tenants(id) on delete restrict', t, t || '_tenant_id_fkey');
    end if;
    execute format('create index if not exists %I on public.%I (tenant_id)', 'idx_' || t || '_tenant', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists tenant_scope on public.%I', t);
    -- AND-ed onto every permissive policy: confines reads and writes to the current tenant; the public only ever sees active tenants.
    execute format($p$create policy tenant_scope on public.%I as restrictive for all
      using (tenant_id = (select app_private.current_tenant_id())
             and (app_private.tenant_is_active(tenant_id) or public.is_tenant_member(tenant_id) or public.is_platform_admin()))
      with check (tenant_id = (select app_private.current_tenant_id())
             and (app_private.tenant_is_active(tenant_id) or public.is_tenant_member(tenant_id)))$p$, t);
  end loop;
end $$;

-- Uniqueness is per store now (two shops can both sell sku "RICE-5" or slug "rice").
do $$
begin
  alter table public.categories drop constraint if exists categories_slug_key;
  alter table public.coupons drop constraint if exists coupons_code_key;
  alter table public.products drop constraint if exists products_sku_key;
  alter table public.products drop constraint if exists products_slug_key;
  alter table public.orders drop constraint if exists orders_order_number_key;
end $$;
create unique index if not exists categories_tenant_slug_key on public.categories (tenant_id, slug);
create unique index if not exists coupons_tenant_code_key on public.coupons (tenant_id, code);
create unique index if not exists products_tenant_sku_key on public.products (tenant_id, sku);
create unique index if not exists products_tenant_slug_key on public.products (tenant_id, slug);
create unique index if not exists orders_tenant_order_number_key on public.orders (tenant_id, order_number);
drop index if exists public.ledger_customers_phone_live;
create unique index if not exists ledger_customers_tenant_phone_live on public.ledger_customers (tenant_id, phone) where phone is not null and not is_archived;
-- one settings row per store
do $$ begin
  if exists (select 1 from pg_constraint where conname = 'store_settings_pkey' and conrelid = 'public.store_settings'::regclass
             and pg_get_constraintdef(oid) = 'PRIMARY KEY (id)') then
    alter table public.store_settings drop constraint store_settings_pkey;
    alter table public.store_settings add constraint store_settings_pkey primary key (tenant_id);
  end if;
end $$;

-- ============================================================ 3. staff_members <-> tenant_members
insert into public.tenant_members (tenant_id, user_id, role)
  select s.tenant_id, s.user_id, s.role from public.staff_members s where s.is_active and s.role in ('owner','manager','staff')
  on conflict do nothing;
insert into public.tenant_members (tenant_id, user_id, role)
  select ts.tenant_id, ts.user_id, ts.role from public.tenant_staff ts on conflict do nothing;
insert into public.tenant_members (tenant_id, user_id, role)
  select t.id, t.owner_id, 'owner' from public.tenants t where t.owner_id is not null on conflict do nothing;

create or replace function app_private.mirror_staff_member() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'DELETE' or not new.is_active then
    delete from public.tenant_members where tenant_id = coalesce(old.tenant_id, new.tenant_id) and user_id = coalesce(old.user_id, new.user_id);
  end if;
  if tg_op <> 'DELETE' and new.is_active then
    insert into public.tenant_members (tenant_id, user_id, role) values (new.tenant_id, new.user_id, new.role)
      on conflict (tenant_id, user_id) do update set role = excluded.role;
  end if;
  return coalesce(new, old);
end $$;
revoke all on function app_private.mirror_staff_member() from public, anon, authenticated;
drop trigger if exists trg_staff_members_mirror on public.staff_members;
create trigger trg_staff_members_mirror after insert or update or delete on public.staff_members
  for each row execute function app_private.mirror_staff_member();

alter table public.tenant_members enable row level security;
drop policy if exists members_read on public.tenant_members;
create policy members_read on public.tenant_members for select to authenticated
  using (user_id = (select auth.uid()) or public.is_tenant_member(tenant_id, array['owner','manager']) or public.is_platform_admin());
revoke insert, update, delete, truncate on public.tenant_members from anon, authenticated;   -- changed only by staff_members mirroring and platform_* functions
revoke all on public.tenant_members from anon;

-- tenants.features: owners may not edit their own flags (that is a platform decision); keep the content-column grant list as is.
revoke update (features) on public.tenants from anon, authenticated;

-- ============================================================ 4. storefront lookups (features included)
create or replace function public.get_tenant_by_slug(p_slug text) returns json
language sql stable security definer set search_path = ''
as $$
  select row_to_json(t) from (
    select id, slug, business_name, business_name_ne, tagline, tagline_ne, about, about_ne, logo_path, cover_path,
           phone, whatsapp, email, website, address, address_ne, municipality, district, province,
           latitude, longitude, map_embed_url, brand_primary, brand_config, social_links,
           business_type, business_type_ne, seo_title, seo_description, custom_domain, status,
           case when slug = 'ecommerce' then '{"coupons":true,"campaigns":true,"ledger":true,"messaging":true,"min_order_qty":true,"reviews":true,"pos_export":true}'::jsonb else features end as features
      from public.tenants where slug = p_slug and status = 'active'
  ) t;
$$;
create or replace function public.get_tenant_by_domain(p_domain text) returns json
language sql stable security definer set search_path = ''
as $$
  select public.get_tenant_by_slug(slug) from public.tenants where lower(custom_domain) = lower(p_domain) and status = 'active';
$$;
revoke all on function public.get_tenant_by_slug(text), public.get_tenant_by_domain(text) from public;
grant execute on function public.get_tenant_by_slug(text), public.get_tenant_by_domain(text) to anon, authenticated;

-- ============================================================ 5. make the existing store functions tenant-aware
-- Functions that read the single store_settings row (id = 1) now read the current tenant's row. Done on the live definition so no
-- other behaviour is touched; each patch is asserted so a changed definition fails loudly instead of silently staying global.
do $$
declare r record; v text;
begin
  for r in select p.oid, n.nspname, p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where (n.nspname, p.proname) in (('public','place_order'),('public','admin_store_settings'),('app_private','orders_payment_method_enabled'))
             and pg_get_functiondef(p.oid) ~ 'store_settings( s)? where (s\.)?id ?= ?1'
  loop
    v := regexp_replace(pg_get_functiondef(r.oid), 'store_settings( s)? where (s\.)?id ?= ?1', 'store_settings\1 where \2tenant_id = (select app_private.current_tenant_id())', 'g');
    v := regexp_replace(v, 'from public\.coupons where code = p_coupon for update', 'from public.coupons where code = p_coupon and tenant_id = (select app_private.current_tenant_id()) for update', 'g');
    if v ~ 'store_settings( s)? where (s\.)?id ?= ?1' then raise exception 'tenant patch failed for %.%', r.nspname, r.proname; end if;
    execute v;
  end loop;
  -- cron: each order expires by ITS tenant's setting
  for r in select p.oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname = 'release_expired_orders' and pg_get_functiondef(p.oid) ~ 'store_settings where id ?= ?1'
  loop
    v := regexp_replace(pg_get_functiondef(r.oid), 'public\.store_settings where id ?= ?1', 'public.store_settings s where s.tenant_id = orders.tenant_id', 'g');
    if v ~ 'store_settings where id ?= ?1' then raise exception 'tenant patch failed for release_expired_orders'; end if;
    execute v;
  end loop;
end $$;

-- quote_checkout (internal core): same pricing as 20261024120000, confined to the current tenant, honouring the feature flags.
create or replace function public.quote_checkout(p_items jsonb, p_zone_id uuid, p_coupon text default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_tid uuid := (select app_private.current_tenant_id());
  v_list bigint := 0; v_disc bigint := 0; v_goods bigint; v_cdisc bigint := 0;
  v_fee bigint; v_thr bigint; z record; c record; it record; v_lines jsonb := '[]'::jsonb;
begin
  if v_tid is null or not app_private.tenant_is_active(v_tid) then raise exception 'NOT_FOUND: tenant'; end if;
  for it in select (e->>'productId')::uuid pid, (e->>'quantity')::int q from jsonb_array_elements(p_items) e loop
    declare pr record; begin
      select * into pr from public.products where id = it.pid and status = 'published' and tenant_id = v_tid;
      if not found then raise exception 'NOT_FOUND: product %', it.pid; end if;
      if it.q is null or it.q < 1 then raise exception 'VALIDATION_FAILED: quantity %', it.pid; end if;
      if it.q < pr.min_purchase_qty and app_private.tenant_feature(v_tid, 'min_order_qty') then raise exception 'MIN_QUANTITY: % %', it.pid, pr.min_purchase_qty; end if;
      if pr.stock_quantity - pr.reserved_quantity < it.q then raise exception 'INSUFFICIENT_STOCK: %', it.pid; end if;
      v_list := v_list + pr.price_paisa * it.q;
      v_disc := v_disc + (pr.price_paisa - coalesce(pr.discount_price_paisa, pr.price_paisa)) * it.q;
      v_lines := v_lines || jsonb_build_object('productId', pr.id, 'name_en', pr.name_en, 'quantity', it.q,
        'unitPrice_paisa', coalesce(pr.discount_price_paisa, pr.price_paisa),
        'lineTotal_paisa', coalesce(pr.discount_price_paisa, pr.price_paisa) * it.q);
    end;
  end loop;
  v_goods := v_list - v_disc;
  if p_coupon is not null then
    if not app_private.tenant_feature(v_tid, 'coupons') then raise exception 'COUPON_UNAVAILABLE'; end if;
    select * into c from public.coupons where code = p_coupon and tenant_id = v_tid and is_active
      and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now())
      and (max_redemptions is null or redemption_count < max_redemptions) and min_subtotal_paisa <= v_goods;
    if not found then raise exception 'COUPON_UNAVAILABLE'; end if;
    v_cdisc := case c.type when 'percent' then least(floor(v_goods * c.value / 100.0)::bigint, coalesce(c.max_discount_paisa, v_goods))
                           else least(c.value::bigint, v_goods) end;
  end if;
  select * into z from public.delivery_zones where id = p_zone_id and tenant_id = v_tid and is_active;
  if not found then raise exception 'NOT_FOUND: delivery zone'; end if;
  select coalesce(z.free_threshold_paisa, s.free_delivery_threshold_paisa) into v_thr from public.store_settings s where s.tenant_id = v_tid;
  v_fee := case when v_thr is not null and (v_goods - v_cdisc) >= v_thr then 0 else z.fee_paisa end;
  return jsonb_build_object('items', v_lines, 'itemsListTotal_paisa', v_list, 'itemDiscount_paisa', v_disc,
    'couponDiscount_paisa', v_cdisc, 'deliveryFee_paisa', v_fee, 'total_paisa', v_goods - v_cdisc + v_fee);
end $$;

-- Public entry points. Totals are still computed by the internal cores; these only fix WHICH store the call is for.
create or replace function public.quote_checkout(p_tenant_id uuid, p_items jsonb, p_zone_id uuid, p_coupon text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if p_tenant_id is null or not app_private.tenant_is_active(p_tenant_id) then raise exception 'NOT_FOUND: tenant'; end if;
  perform set_config('app.tenant_id', p_tenant_id::text, true);
  return public.quote_checkout(p_items, p_zone_id, p_coupon);
end $$;

create or replace function public.place_order(p_tenant_id uuid, p_idempotency_key text, p_items jsonb, p_zone_id uuid, p_coupon text,
  p_payment_method text, p_name text, p_phone text, p_email text, p_recipient text, p_ship_phone text,
  p_address text, p_landmark text, p_municipality text, p_district text, p_locale text default 'en')
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if p_tenant_id is null or not app_private.tenant_is_active(p_tenant_id) then raise exception 'NOT_FOUND: tenant'; end if;
  perform set_config('app.tenant_id', p_tenant_id::text, true);
  return public.place_order(p_idempotency_key, p_items, p_zone_id, p_coupon, p_payment_method, p_name, p_phone, p_email, p_recipient,
    p_ship_phone, p_address, p_landmark, p_municipality, p_district, p_locale);
end $$;

-- The old signatures stay as internal cores only the wrappers (SECURITY DEFINER, same owner) can call.
revoke execute on function public.quote_checkout(jsonb, uuid, text) from public, anon, authenticated;
revoke execute on function public.place_order(text, jsonb, uuid, text, text, text, text, text, text, text, text, text, text, text, text) from public, anon, authenticated;
revoke execute on function public.quote_checkout(uuid, jsonb, uuid, text), public.place_order(uuid, text, jsonb, uuid, text, text, text, text, text, text, text, text, text, text, text, text) from public;
grant execute on function public.quote_checkout(uuid, jsonb, uuid, text), public.place_order(uuid, text, jsonb, uuid, text, text, text, text, text, text, text, text, text, text, text, text) to anon, authenticated;

-- ============================================================ 6. platform operations
create or replace function public.platform_create_store(p_slug text, p_name text, p_owner_email text default null, p_custom_domain text default null,
  p_brand text default null, p_logo_path text default null, p_features jsonb default '{}'::jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_owner uuid; v_feat jsonb := '{}'::jsonb; k text;
begin
  if not public.is_platform_admin() then raise exception 'FORBIDDEN: platform admin only'; end if;
  if p_brand is not null and p_brand !~ '^#[0-9A-Fa-f]{6}$' then raise exception 'VALIDATION_FAILED: brand'; end if;
  if p_logo_path is not null and p_logo_path !~ '^https?://' then raise exception 'VALIDATION_FAILED: logo'; end if;
  foreach k in array array['coupons','campaigns','ledger','messaging','min_order_qty','reviews','pos_export'] loop
    v_feat := v_feat || jsonb_build_object(k, coalesce((p_features ->> k)::boolean, false));
  end loop;
  if p_owner_email is not null and p_owner_email <> '' then select id into v_owner from auth.users where lower(email) = lower(p_owner_email) limit 1; end if;
  insert into public.tenants (slug, business_name, status, owner_id, custom_domain, brand_primary, logo_path, features)
    values (p_slug, p_name, 'draft', v_owner, nullif(lower(p_custom_domain), ''), coalesce(p_brand, '#F5A524'), p_logo_path, v_feat)
    returning id into v_id;
  insert into public.store_settings (tenant_id, store_name, slug) values (v_id, p_name, p_slug) on conflict do nothing;
  if v_owner is not null then
    insert into public.tenant_members (tenant_id, user_id, role) values (v_id, v_owner, 'owner') on conflict do nothing;
    -- store admin rights (staff_members has one row per user): skip silently if this person already runs another store
    insert into public.staff_members (user_id, role, tenant_id) values (v_owner, 'owner', v_id) on conflict (user_id) do nothing;
  elsif p_owner_email is not null and p_owner_email <> '' then
    insert into public.staff_invites (email, role, tenant_id) values (p_owner_email, 'owner', v_id) on conflict (email) do nothing;
  end if;
  return v_id;
end $$;

create or replace function public.platform_set_tenant_features(p_tenant uuid, p_features jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare v_feat jsonb := '{}'::jsonb; k text;
begin
  if not public.is_platform_admin() then raise exception 'FORBIDDEN: platform admin only'; end if;
  foreach k in array array['coupons','campaigns','ledger','messaging','min_order_qty','reviews','pos_export'] loop
    v_feat := v_feat || jsonb_build_object(k, coalesce((p_features ->> k)::boolean, false));
  end loop;
  update public.tenants set features = v_feat where id = p_tenant;
  if not found then raise exception 'NOT_FOUND: tenant'; end if;
end $$;

revoke all on function public.platform_create_store(text, text, text, text, text, text, jsonb), public.platform_set_tenant_features(uuid, jsonb) from public, anon;
grant execute on function public.platform_create_store(text, text, text, text, text, text, jsonb), public.platform_set_tenant_features(uuid, jsonb) to authenticated;

-- ============================================================ 7. storage: writes under "<tenant_id>/"
create or replace function app_private.storage_tenant(p_name text) returns uuid
language sql immutable set search_path = ''
as $$ select case when split_part(p_name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' and position('/' in p_name) > 0
                  then split_part(p_name, '/', 1)::uuid end; $$;
grant execute on function app_private.storage_tenant(text) to anon, authenticated;

-- both buckets are public (anyone can fetch an object URL); row visibility is also what lets staff delete their own files
drop policy if exists "public read catalogue images" on storage.objects;
create policy "public read catalogue images" on storage.objects for select using (bucket_id in ('product-images', 'store-assets'));

drop policy if exists "staff upload product images" on storage.objects;
drop policy if exists "staff delete product images" on storage.objects;
drop policy if exists "tenant staff upload product images" on storage.objects;
drop policy if exists "tenant staff delete product images" on storage.objects;
create policy "tenant staff upload product images" on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and app_private.storage_tenant(name) is not null
              and app_private.has_permission('products.manage', app_private.storage_tenant(name)));
-- legacy un-prefixed objects belong to the flagship
create policy "tenant staff delete product images" on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and app_private.has_permission('products.manage', coalesce(app_private.storage_tenant(name), app_private.flagship_tenant_id())));

drop policy if exists "staff upload store assets" on storage.objects;
drop policy if exists "staff delete store assets" on storage.objects;
drop policy if exists "tenant staff upload store assets" on storage.objects;
drop policy if exists "tenant staff delete store assets" on storage.objects;
create policy "tenant staff upload store assets" on storage.objects for insert to authenticated
  with check (bucket_id = 'store-assets' and app_private.storage_tenant(name) is not null and (
    (split_part(name, '/', 2) = 'banners' and app_private.has_permission('settings.manage', app_private.storage_tenant(name))) or
    (split_part(name, '/', 2) = 'categories' and app_private.has_permission('products.manage', app_private.storage_tenant(name)))));
create policy "tenant staff delete store assets" on storage.objects for delete to authenticated
  using (bucket_id = 'store-assets' and (
    case when split_part(name, '/', 1) = 'banners' or split_part(name, '/', 2) = 'banners'
         then app_private.has_permission('settings.manage', coalesce(app_private.storage_tenant(name), app_private.flagship_tenant_id()))
         when split_part(name, '/', 1) = 'categories' or split_part(name, '/', 2) = 'categories'
         then app_private.has_permission('products.manage', coalesce(app_private.storage_tenant(name), app_private.flagship_tenant_id()))
         else false end));

drop policy if exists "anyone uploads payment proof" on storage.objects;
drop policy if exists "staff read payment proofs" on storage.objects;
drop policy if exists "tenant uploads payment proof" on storage.objects;
drop policy if exists "tenant staff read payment proofs" on storage.objects;
create policy "tenant uploads payment proof" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'payment-proofs' and app_private.storage_tenant(name) is not null and split_part(name, '/', 2) = 'proofs'
              and app_private.tenant_is_active(app_private.storage_tenant(name)));
create policy "tenant staff read payment proofs" on storage.objects for select to authenticated
  using (bucket_id = 'payment-proofs' and app_private.has_permission('orders.verify_payment', coalesce(app_private.storage_tenant(name), app_private.flagship_tenant_id())));

drop policy if exists "staff upload message images" on storage.objects;
drop policy if exists "staff delete message images" on storage.objects;
drop policy if exists "tenant staff upload message images" on storage.objects;
drop policy if exists "tenant staff delete message images" on storage.objects;
create policy "tenant staff upload message images" on storage.objects for insert to authenticated
  with check (bucket_id = 'store-assets' and app_private.storage_tenant(name) is not null and split_part(name, '/', 2) = 'messages'
              and app_private.has_permission('messages.manage', app_private.storage_tenant(name)));
create policy "tenant staff delete message images" on storage.objects for delete to authenticated
  using (bucket_id = 'store-assets' and (name like 'messages/%' or split_part(name, '/', 2) = 'messages')
         and app_private.has_permission('messages.manage', coalesce(app_private.storage_tenant(name), app_private.flagship_tenant_id())));

-- submit_payment_proof accepts the tenant-prefixed proof path as well as the legacy one.
do $$
declare r record; v text;
begin
  for r in select p.oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname = 'submit_payment_proof' and pg_get_functiondef(p.oid) like '%^proofs/[0-9a-f-]{36}%'
  loop
    v := replace(pg_get_functiondef(r.oid), '^proofs/[0-9a-f-]{36}', '^([0-9a-f-]{36}/)?proofs/[0-9a-f-]{36}');
    if v like '%^proofs/[0-9a-f-]{36}%' then raise exception 'tenant patch failed for submit_payment_proof'; end if;
    execute v;
  end loop;
end $$;
