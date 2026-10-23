-- place_order accepts any of ('cod','manual') even when that method is switched off in store_settings,
-- so the storefront toggle was enforced by the UI only. Enforce it in the database. Additive: no data changes.
-- Raises the same code place_order already uses, so the client maps it to err.VALIDATION_FAILED.

create or replace function app_private.orders_payment_method_enabled()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare v_ps jsonb;
begin
  select payment_settings into v_ps from public.store_settings where id = 1;
  if new.payment_method = 'cod' and coalesce((v_ps->>'cod_enabled')::boolean, true) is false then
    raise exception 'VALIDATION_FAILED: payment';
  end if;
  if new.payment_method = 'manual' and coalesce((v_ps->>'manual_enabled')::boolean, true) is false then
    raise exception 'VALIDATION_FAILED: payment';
  end if;
  return new;
end $$;

revoke all on function app_private.orders_payment_method_enabled() from public, anon, authenticated;

drop trigger if exists orders_payment_method_enabled on public.orders;
create trigger orders_payment_method_enabled
  before insert on public.orders
  for each row execute function app_private.orders_payment_method_enabled();
