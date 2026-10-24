-- DEVELOPMENT ONLY. Never run against a real control-plane project (audit P1-4).
update public.platform_settings set network_name = 'Demo Network', network_tagline = 'Local businesses, online.' where id = 1;

insert into public.tenants (slug, business_name, tagline, business_type, status, brand_primary)
values ('demo-bakery', 'Demo Bakery', 'Fresh every morning (demo data).', 'Bakery', 'active', '#E8A317')
on conflict (slug) do nothing;

