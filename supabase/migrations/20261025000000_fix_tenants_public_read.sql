-- Migration: 20261025000000_fix_tenants_public_read.sql
-- Fix: Enable public anonymous read for active tenants and upsert default vendor tenants

-- 1. Ensure 'name' column exists alongside 'business_name' for compatibility
alter table public.tenants add column if not exists name text;

-- 2. Enable Row Level Security on public.tenants
alter table public.tenants enable row level security;

-- 3. Drop existing / recursive SELECT policies on public.tenants
drop policy if exists tenants_public_read on public.tenants;
drop policy if exists "tenants_public_read" on public.tenants;
drop policy if exists "tenants_public_read_active" on public.tenants;
drop policy if exists "Allow public select active tenants" on public.tenants;
drop policy if exists tenants_member_read on public.tenants;
drop policy if exists tenant_scope on public.tenants;

-- 4. Add policy that allows SELECT access to anon and authenticated users for ALL rows where status = 'active'
create policy tenants_public_read on public.tenants
  for select
  to anon, authenticated
  using (status = 'active');

-- 5. Safe non-recursive member policy (checks tenant_members, not tenants table itself)
create policy tenants_member_read on public.tenants
  for select
  to authenticated
  using (
    exists (
      select 1 from public.tenant_members m
      where m.tenant_id = id and m.user_id = (select auth.uid())
    )
    or exists (
      select 1 from public.platform_admins a
      where a.user_id = (select auth.uid())
    )
  );

-- 6. Grant SELECT permission on tenants to anon and authenticated
grant usage on schema public to anon, authenticated;
grant select on public.tenants to anon, authenticated;

-- 7. Fix helper to avoid infinite recursion when querying tenants relation
create or replace function public.is_tenant_member(p_tenant_id uuid, p_roles text[] default array['owner','manager','staff','editor','viewer'])
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.tenant_members m where m.tenant_id = p_tenant_id and m.user_id = (select auth.uid()) and m.role = any(p_roles))
      or exists (select 1 from public.tenant_staff s where s.tenant_id = p_tenant_id and s.user_id = (select auth.uid()) and s.role = any(p_roles));
$$;

create or replace function app_private.is_tenant_member(p_tenant uuid, p_roles text[] default array['owner','manager','staff','editor','viewer'])
returns boolean language sql stable security definer set search_path = ''
as $$ select public.is_tenant_member(p_tenant, p_roles); $$;

grant execute on function public.is_tenant_member(uuid, text[]) to anon, authenticated;
grant execute on function app_private.is_tenant_member(uuid, text[]) to anon, authenticated;

-- 8. Upsert missing tenant data (myshop and family-mart) with status = 'active'
insert into public.tenants (id, slug, business_name, name, status, features)
values
  ('20000000-0000-0000-0000-000000000000', 'myshop', 'My Shop', 'My Shop', 'active', '{"coupons": true, "reviews": true}'::jsonb),
  ('20000000-0000-0000-0000-000000000001', 'family-mart', 'Family Mart', 'Family Mart', 'active', '{"coupons": true, "reviews": true}'::jsonb)
on conflict (slug) do update set
  business_name = excluded.business_name,
  name = excluded.name,
  status = 'active',
  features = excluded.features;

-- Ensure name is filled for all rows
update public.tenants set name = business_name where name is null;

-- Ensure corresponding store_settings row exists if store_settings table is present
insert into public.store_settings (tenant_id, store_name, slug)
select id, coalesce(name, business_name), slug
from public.tenants
where slug in ('myshop', 'family-mart')
on conflict do nothing;
