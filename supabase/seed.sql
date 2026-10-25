-- DEVELOPMENT ONLY. Never run against a real project (audit P1-4). Idempotent. Run after every migration.
-- Gives a local/live test database:
--   1. Super Admin in platform_admins (admin@amanaryal.com)
--   2. myshop tenant record and dedicated admin user in tenant_members (admin@myshop.amanaryal.com)
--   3. family-mart tenant record and dedicated admin user in tenant_members (admin@family-mart.amanaryal.com)
--   4. Flagship store (ecommerce) and brochure demo (demo-bakery)

update public.platform_settings set network_name = 'Aman Aryal Network', network_tagline = 'Local multi-vendor shopping platform.' where id = 1;

-- ============================================================
-- 0. Deterministic Auth Users for Testing / Seeding
-- ============================================================
insert into auth.users (id, email)
values
  ('a0000000-0000-0000-0000-000000000001', 'admin@amanaryal.com'),
  ('a0000000-0000-0000-0000-000000000002', 'admin@myshop.amanaryal.com'),
  ('a0000000-0000-0000-0000-000000000003', 'admin@family-mart.amanaryal.com')
on conflict (id) do nothing;

-- ============================================================
-- 1. Super Admin (platform_admins)
-- ============================================================
insert into public.platform_admins (user_id)
values ('a0000000-0000-0000-0000-000000000001')
on conflict (user_id) do nothing;

-- Also promote owner email if already signed in
insert into public.platform_admins (user_id)
select id from auth.users where lower(email) in ('admin@amanaryal.com', 'amnaryal@gmail.com')
on conflict (user_id) do nothing;

-- ============================================================
-- 2. Brochure (directory) business, hub only
-- ============================================================
insert into public.tenants (slug, business_name, tagline, business_type, status, brand_primary)
values ('demo-bakery', 'Demo Bakery', 'Fresh every morning (demo data).', 'Bakery', 'active', '#E8A317')
on conflict (slug) do nothing;

-- ============================================================
-- 3. Flagship store: all features
-- ============================================================
insert into public.tenants (slug, business_name, tagline, business_type, status, brand_primary, features)
values ('ecommerce', 'Ecommerce Flagship', 'The flagship demo store.', 'General store', 'active', '#374151',
  '{"coupons":true,"campaigns":true,"ledger":true,"messaging":true,"min_order_qty":true,"reviews":true,"pos_export":true}')
on conflict (slug) do update set
  status = 'active',
  features = '{"coupons":true,"campaigns":true,"ledger":true,"messaging":true,"min_order_qty":true,"reviews":true,"pos_export":true}';

-- ============================================================
-- 4. Vendor Store: myshop (All features, dedicated admin in tenant_members)
-- ============================================================
insert into public.tenants (slug, business_name, tagline, business_type, status, brand_primary, email, features)
values ('myshop', 'My Shop', 'Your one-stop community store.', 'Retail', 'active', '#2563EB', 'admin@myshop.amanaryal.com',
  '{"coupons":true,"campaigns":true,"ledger":true,"messaging":true,"min_order_qty":true,"reviews":true,"pos_export":true}')
on conflict (slug) do update set
  status = 'active',
  email = 'admin@myshop.amanaryal.com',
  features = '{"coupons":true,"campaigns":true,"ledger":true,"messaging":true,"min_order_qty":true,"reviews":true,"pos_export":true}';

-- ============================================================
-- 5. Vendor Store: family-mart (Grocery subset, dedicated admin in tenant_members)
-- ============================================================
insert into public.tenants (slug, business_name, tagline, business_type, status, brand_primary, email, features)
values ('family-mart', 'Family Mart', 'Everyday groceries, delivered.', 'Grocery', 'active', '#0F766E', 'admin@family-mart.amanaryal.com',
  '{"coupons":true,"campaigns":false,"ledger":false,"messaging":false,"min_order_qty":true,"reviews":true,"pos_export":false}')
on conflict (slug) do update set
  status = 'active',
  email = 'admin@family-mart.amanaryal.com',
  features = '{"coupons":true,"campaigns":false,"ledger":false,"messaging":false,"min_order_qty":true,"reviews":true,"pos_export":false}';

-- Link Dedicated Admin Users in tenant_members & seed operational store data
do $$
declare
  v_myshop_id uuid;
  v_fm_id uuid;
begin
  select id into v_myshop_id from public.tenants where slug = 'myshop';
  select id into v_fm_id from public.tenants where slug = 'family-mart';

  -- --- Dedicated Admin for myshop ---
  insert into public.tenant_members (tenant_id, user_id, role)
    values (v_myshop_id, 'a0000000-0000-0000-0000-000000000002', 'owner')
    on conflict (tenant_id, user_id) do update set role = 'owner';
  insert into public.staff_members (user_id, role, tenant_id)
    values ('a0000000-0000-0000-0000-000000000002', 'owner', v_myshop_id)
    on conflict (user_id) do update set tenant_id = v_myshop_id, role = 'owner';

  -- Operational data for myshop
  insert into public.store_settings (tenant_id, store_name, slug, payment_settings)
    values (v_myshop_id, 'My Shop', 'myshop', '{"cod_enabled":true,"manual_enabled":true}')
    on conflict do nothing;
  insert into public.delivery_zones (tenant_id, name_en, name_ne, fee_paisa)
    select v_myshop_id, 'Kathmandu Valley', 'काठमाडौं उपत्यका', 10000
    where not exists (select 1 from public.delivery_zones z where z.tenant_id = v_myshop_id);
  insert into public.categories (tenant_id, slug, name_en, name_ne)
    values (v_myshop_id, 'general', 'General', 'सामान्य')
    on conflict do nothing;
  insert into public.products (tenant_id, slug, sku, name_en, name_ne, price_paisa, stock_quantity, status, min_purchase_qty, category_id, published_at)
    select v_myshop_id, 'wireless-mouse', 'MS-MOUSE-1', 'Wireless Mouse', 'वायरलेस माउस', 150000, 25, 'published', 1, c.id, now()
      from public.categories c where c.tenant_id = v_myshop_id and c.slug = 'general' on conflict do nothing;

  -- --- Dedicated Admin for family-mart ---
  insert into public.tenant_members (tenant_id, user_id, role)
    values (v_fm_id, 'a0000000-0000-0000-0000-000000000003', 'owner')
    on conflict (tenant_id, user_id) do update set role = 'owner';
  insert into public.staff_members (user_id, role, tenant_id)
    values ('a0000000-0000-0000-0000-000000000003', 'owner', v_fm_id)
    on conflict (user_id) do update set tenant_id = v_fm_id, role = 'owner';

  -- Operational data for family-mart
  insert into public.store_settings (tenant_id, store_name, slug, payment_settings)
    values (v_fm_id, 'Family Mart', 'family-mart', '{"cod_enabled":true,"manual_enabled":false}')
    on conflict do nothing;
  insert into public.delivery_zones (tenant_id, name_en, name_ne, fee_paisa)
    select v_fm_id, 'Dumarwana town', 'दुमरवाना बजार', 5000
    where not exists (select 1 from public.delivery_zones z where z.tenant_id = v_fm_id);
  insert into public.categories (tenant_id, slug, name_en, name_ne)
    values (v_fm_id, 'groceries', 'Groceries', 'किराना')
    on conflict do nothing;
  insert into public.products (tenant_id, slug, sku, name_en, name_ne, price_paisa, stock_quantity, status, min_purchase_qty, category_id, published_at)
    select v_fm_id, 'basmati-rice-5kg', 'FM-RICE-5', 'Basmati rice 5 kg', 'बासमती चामल ५ केजी', 120000, 40, 'published', 1, c.id, now()
      from public.categories c where c.tenant_id = v_fm_id and c.slug = 'groceries' on conflict do nothing;
  insert into public.products (tenant_id, slug, sku, name_en, name_ne, price_paisa, stock_quantity, status, min_purchase_qty, category_id, published_at)
    select v_fm_id, 'sugar-1kg', 'FM-SUGAR-1', 'Sugar 1 kg (min 3)', 'चिनी १ केजी (न्यूनतम ३)', 9500, 100, 'published', 3, c.id, now()
      from public.categories c where c.tenant_id = v_fm_id and c.slug = 'groceries' on conflict do nothing;
end $$;
