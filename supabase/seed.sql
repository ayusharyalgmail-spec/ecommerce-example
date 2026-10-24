-- DEVELOPMENT ONLY. Never run against a real project (audit P1-4). Idempotent. Run after every migration.
-- Gives a local database the hub directory plus the two stores used in the docs:
--   ecommerce   flagship demo store, every feature on   ->  /?tenant=ecommerce
--   family-mart vendor store, a feature subset          ->  /?tenant=family-mart
-- Staff accounts are NOT created here: sign in once, then run the "first platform admin" statement from README.md.

update public.platform_settings set network_name = 'Demo Network', network_tagline = 'Local businesses, online.' where id = 1;

-- Brochure (directory) business, hub only.
insert into public.tenants (slug, business_name, tagline, business_type, status, brand_primary)
values ('demo-bakery', 'Demo Bakery', 'Fresh every morning (demo data).', 'Bakery', 'active', '#E8A317')
on conflict (slug) do nothing;

-- Flagship store: all features. (The tenant-isolation migration already creates it; this keeps the seed self-explanatory.)
insert into public.tenants (slug, business_name, tagline, business_type, status, brand_primary, features)
values ('ecommerce', 'Ecommerce', 'The flagship demo store.', 'General store', 'active', '#374151',
  '{"coupons":true,"campaigns":true,"ledger":true,"messaging":true,"min_order_qty":true,"reviews":true,"pos_export":true}')
on conflict (slug) do update set
  status = 'active',
  features = '{"coupons":true,"campaigns":true,"ledger":true,"messaging":true,"min_order_qty":true,"reviews":true,"pos_export":true}';

-- Vendor store with a subset of features: no ledger, no messaging, no campaigns, no POS export.
insert into public.tenants (slug, business_name, tagline, business_type, status, brand_primary, features)
values ('family-mart', 'Family Mart', 'Everyday groceries, delivered.', 'Grocery', 'active', '#0F766E',
  '{"coupons":true,"campaigns":false,"ledger":false,"messaging":false,"min_order_qty":true,"reviews":true,"pos_export":false}')
on conflict (slug) do update set
  status = 'active',
  features = '{"coupons":true,"campaigns":false,"ledger":false,"messaging":false,"min_order_qty":true,"reviews":true,"pos_export":false}';

do $$
declare v uuid;
begin
  select id into v from public.tenants where slug = 'family-mart';
  insert into public.store_settings (tenant_id, store_name, slug, payment_settings)
    values (v, 'Family Mart', 'family-mart', '{"cod_enabled":true,"manual_enabled":false}') on conflict do nothing;
  insert into public.delivery_zones (tenant_id, name_en, name_ne, fee_paisa)
    select v, 'Dumarwana town', 'दुमरवाना बजार', 5000 where not exists (select 1 from public.delivery_zones z where z.tenant_id = v);
  insert into public.categories (tenant_id, slug, name_en, name_ne)
    values (v, 'groceries', 'Groceries', 'किराना') on conflict do nothing;
  insert into public.products (tenant_id, slug, sku, name_en, name_ne, price_paisa, stock_quantity, status, min_purchase_qty, category_id, published_at)
    select v, 'basmati-rice-5kg', 'FM-RICE-5', 'Basmati rice 5 kg', 'बासमती चामल ५ केजी', 120000, 40, 'published', 1, c.id, now()
      from public.categories c where c.tenant_id = v and c.slug = 'groceries' on conflict do nothing;
  insert into public.products (tenant_id, slug, sku, name_en, name_ne, price_paisa, stock_quantity, status, min_purchase_qty, category_id, published_at)
    select v, 'sugar-1kg', 'FM-SUGAR-1', 'Sugar 1 kg (min 3)', 'चिनी १ केजी (न्यूनतम ३)', 9500, 100, 'published', 3, c.id, now()
      from public.categories c where c.tenant_id = v and c.slug = 'groceries' on conflict do nothing;
end $$;
