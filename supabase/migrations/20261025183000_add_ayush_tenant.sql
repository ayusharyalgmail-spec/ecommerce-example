-- Migration: 20261025183000_add_ayush_tenant.sql
-- Upsert ayush tenant, store_settings, and default configuration for ayush.amanaryal.com

insert into public.tenants (id, slug, business_name, name, tagline, business_type, status, brand_primary, email, features)
values (
  '20000000-0000-0000-0000-000000000003',
  'ayush',
  'Ayush',
  'Ayush',
  'Everyday essentials, delivered locally.',
  'General store',
  'active',
  '#2563EB',
  'ayusharyalgmail@gmail.com',
  '{"coupons":true,"campaigns":true,"ledger":true,"messaging":true,"min_order_qty":true,"reviews":true,"pos_export":true}'::jsonb
)
on conflict (slug) do update set
  business_name = excluded.business_name,
  name = excluded.name,
  tagline = excluded.tagline,
  status = 'active',
  features = excluded.features;

-- Ensure corresponding store_settings row exists
insert into public.store_settings (tenant_id, store_name, slug)
select id, coalesce(name, business_name), slug
from public.tenants
where slug = 'ayush'
on conflict do nothing;

-- Add default delivery zone and category for ayush if they do not exist
do $$
declare
  v_ayush_id uuid;
begin
  select id into v_ayush_id from public.tenants where slug = 'ayush';
  if v_ayush_id is not null then
    if not exists (select 1 from public.delivery_zones where tenant_id = v_ayush_id) then
      insert into public.delivery_zones (tenant_id, name_en, fee_paisa)
      values (v_ayush_id, 'Standard Delivery', 5000);
    end if;

    if not exists (select 1 from public.categories where tenant_id = v_ayush_id and slug = 'essentials') then
      insert into public.categories (tenant_id, slug, name_en)
      values (v_ayush_id, 'essentials', 'Essentials');
    end if;
  end if;
end $$;
