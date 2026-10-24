
-- Additive: brand theming + the ui_v2 rollout flag (UX-D020)
alter table public.store_settings
  add column if not exists brand jsonb not null default '{}'::jsonb,
  add column if not exists ui_v2 boolean not null default false;
comment on column public.store_settings.brand is 'Vendor brand: {"primary":"#RRGGBB","accent":"#RRGGBB"}; contrast is derived in the client (src/theme/brand.ts).';
comment on column public.store_settings.ui_v2 is 'Rollout flag for the Bazaar Glass UI; removed after one stable release.';

-- Fix: store_settings was readable in full by anon (policy using (true)). Restrict by COLUMN so the storefront
-- keeps working and operational/tax fields stop being public (DATABASE.md section 4 says "safe columns only").
revoke select on public.store_settings from anon, authenticated;
grant select (id, store_name, slug, logo_path, favicon_path, theme, brand, ui_v2, contact_phone, whatsapp_number,
              contact_email, default_locale, supported_locales, currency, payment_settings, policies,
              free_delivery_threshold_paisa, updated_at)
  on public.store_settings to anon, authenticated;
-- PAN/VAT appear on invoices, which only signed-in customers and staff can open.
grant select (business_info) on public.store_settings to authenticated;

-- Staff with settings.manage read the full row (including operational fields) through one audited function.
create or replace function public.admin_store_settings() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not app_private.has_permission('settings.manage') then raise exception 'FORBIDDEN'; end if;
  return (select to_jsonb(s) from public.store_settings s where s.id = 1);
end $$;
revoke execute on function public.admin_store_settings() from public, anon;
grant execute on function public.admin_store_settings() to authenticated;
