-- Tenant hardening (formerly the platform-app control-plane baseline, now merged into the single Supabase project).
-- Runs AFTER 20261021100516_multi_tenant_platform.sql, which created the tenant tables with weak policies
-- (owner FOR ALL, any authenticated user may write tenant-assets). This file drops every policy on those tables
-- and recreates the hardened set, so it is safe to re-run. Fixes: P0-2 (tenant-scoped storage), P1-1 (no policy
-- recursion), P1-2 (no client INSERT/DELETE on tenants, content-column UPDATE only), P2-3, P2-4.
-- No vendor seed data here: see ../seed.sql (development only).
-- NOT APPLIED to any live database. Review, then apply together with the owner.

create schema if not exists app_private;
grant usage on schema app_private to anon, authenticated;

-- ============================================================ tables
create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null check (slug ~ '^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$'),
  business_name text not null,
  business_name_ne text,
  tagline text, tagline_ne text,
  about text, about_ne text,
  logo_path text, cover_path text,
  phone text, whatsapp text, email text, website text,
  address text, address_ne text, municipality text, district text, province text,
  latitude numeric, longitude numeric, map_embed_url text,
  brand_primary text default '#F5A524',
  brand_config jsonb default '{}',
  social_links jsonb default '{}',
  business_type text, business_type_ne text,
  status text not null default 'draft' check (status in ('draft','active','suspended')),
  owner_id uuid references auth.users(id) on delete set null,
  custom_domain text unique,
  seo_title text, seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_tenants_status on public.tenants (status) where status = 'active';
create index if not exists idx_tenants_owner on public.tenants (owner_id);

create or replace function public.set_tenant_updated_at() returns trigger
language plpgsql set search_path = ''
as $$ begin new.updated_at = now(); return new; end $$;
drop trigger if exists trg_tenants_updated on public.tenants;
create trigger trg_tenants_updated before update on public.tenants
  for each row execute function public.set_tenant_updated_at();

create table if not exists public.tenant_hours (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6),
  open_time time, close_time time,
  is_closed boolean not null default false,
  unique (tenant_id, day_of_week)
);

create table if not exists public.tenant_services (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name_en text not null, name_ne text,
  description_en text, description_ne text,
  price_display text, image_path text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_tenant_services_tenant on public.tenant_services (tenant_id);

create table if not exists public.tenant_gallery (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  storage_path text not null,
  caption_en text, caption_ne text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_tenant_gallery_tenant on public.tenant_gallery (tenant_id);

create table if not exists public.tenant_inquiries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null, phone text, email text,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_tenant_inquiries_tenant on public.tenant_inquiries (tenant_id, created_at desc);

create table if not exists public.tenant_staff (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'editor' check (role in ('owner','editor','viewer')),
  created_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);

create table if not exists public.platform_settings (
  id int primary key default 1 check (id = 1),
  network_name text not null default 'Local Business Network',
  network_name_ne text,
  network_tagline text default 'Local businesses, online.',
  network_tagline_ne text,
  cta_text text default 'Get Your Business Online',
  cta_text_ne text,
  contact_email text, contact_phone text,
  featured_tenant_ids uuid[] default '{}',
  created_at timestamptz not null default now()
);
insert into public.platform_settings (id) values (1) on conflict do nothing;

create table if not exists public.tenant_analytics (
  id bigserial primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  page text not null default '/',
  referrer text,
  created_at timestamptz not null default now()
);
create index if not exists idx_tenant_analytics_tenant_date on public.tenant_analytics (tenant_id, created_at desc);

create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ============================================================ access helpers (SECURITY DEFINER, so policies never recurse)
create or replace function app_private.is_platform_admin() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.platform_admins a where a.user_id = (select auth.uid())); $$;

create or replace function app_private.is_tenant_member(p_tenant uuid, p_roles text[] default array['owner','editor','viewer'])
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.tenants t where t.id = p_tenant and t.owner_id = (select auth.uid()) and 'owner' = any(p_roles))
      or exists (select 1 from public.tenant_staff ts where ts.tenant_id = p_tenant and ts.user_id = (select auth.uid()) and ts.role = any(p_roles));
$$;

create or replace function app_private.is_tenant_owner(p_tenant uuid) returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.tenants t where t.id = p_tenant and t.owner_id = (select auth.uid())); $$;

create or replace function app_private.tenant_is_active(p_tenant uuid) returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.tenants t where t.id = p_tenant and t.status = 'active'); $$;

revoke all on function app_private.is_platform_admin(), app_private.is_tenant_member(uuid, text[]),
  app_private.is_tenant_owner(uuid), app_private.tenant_is_active(uuid) from public;
grant execute on function app_private.is_platform_admin(), app_private.is_tenant_member(uuid, text[]),
  app_private.is_tenant_owner(uuid), app_private.tenant_is_active(uuid) to anon, authenticated;

-- ============================================================ RLS
-- Drop every existing policy on the tenant tables and the tenant-assets storage policies (idempotent re-creation).
do $$ declare r record; begin
  for r in select schemaname, tablename, policyname from pg_policies
    where (schemaname = 'public' and tablename in ('tenants','tenant_hours','tenant_services','tenant_gallery','tenant_inquiries','tenant_staff','platform_settings','tenant_analytics','platform_admins'))
       or (schemaname = 'storage' and tablename = 'objects' and policyname like 'tenant_assets_%')
  loop execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename); end loop;
end $$;
alter table public.tenants           enable row level security;
alter table public.tenant_hours      enable row level security;
alter table public.tenant_services   enable row level security;
alter table public.tenant_gallery    enable row level security;
alter table public.tenant_inquiries  enable row level security;
alter table public.tenant_staff      enable row level security;
alter table public.platform_settings enable row level security;
alter table public.tenant_analytics  enable row level security;
alter table public.platform_admins   enable row level security;
revoke all on public.platform_admins from anon, authenticated;   -- reached only through the functions below

-- tenants: public sees active ones; members see and edit their own content; nobody creates/deletes from the client
create policy tenants_public_read on public.tenants for select using (status = 'active');
create policy tenants_member_read on public.tenants for select to authenticated
  using (app_private.is_tenant_member(id) or app_private.is_platform_admin());
create policy tenants_member_update on public.tenants for update to authenticated
  using (app_private.is_tenant_member(id, array['owner','editor']))
  with check (app_private.is_tenant_member(id, array['owner','editor']));
revoke insert, delete, truncate on public.tenants from anon, authenticated;
revoke update on public.tenants from anon, authenticated;
grant update (
  business_name, business_name_ne, tagline, tagline_ne, about, about_ne, logo_path, cover_path,
  phone, whatsapp, email, website, address, address_ne, municipality, district, province,
  latitude, longitude, map_embed_url, brand_primary, brand_config, social_links,
  business_type, business_type_ne, seo_title, seo_description
) on public.tenants to authenticated;

-- content tables: public read while the tenant is active, owner/editor write
create policy hours_public_read on public.tenant_hours for select using (app_private.tenant_is_active(tenant_id));
create policy hours_member_all on public.tenant_hours for all to authenticated
  using (app_private.is_tenant_member(tenant_id, array['owner','editor']))
  with check (app_private.is_tenant_member(tenant_id, array['owner','editor']));
create policy services_public_read on public.tenant_services for select using (app_private.tenant_is_active(tenant_id));
create policy services_member_all on public.tenant_services for all to authenticated
  using (app_private.is_tenant_member(tenant_id, array['owner','editor']))
  with check (app_private.is_tenant_member(tenant_id, array['owner','editor']));
create policy gallery_public_read on public.tenant_gallery for select using (app_private.tenant_is_active(tenant_id));
create policy gallery_member_all on public.tenant_gallery for all to authenticated
  using (app_private.is_tenant_member(tenant_id, array['owner','editor']))
  with check (app_private.is_tenant_member(tenant_id, array['owner','editor']));

-- inquiries: anyone may write to an active business (length-checked); members read; owner/editor mark read
create policy inquiries_public_insert on public.tenant_inquiries for insert
  with check (app_private.tenant_is_active(tenant_id) and char_length(name) between 1 and 120
              and char_length(message) between 1 and 4000 and is_read = false);
create policy inquiries_member_read on public.tenant_inquiries for select to authenticated
  using (app_private.is_tenant_member(tenant_id));
create policy inquiries_member_update on public.tenant_inquiries for update to authenticated
  using (app_private.is_tenant_member(tenant_id, array['owner','editor']))
  with check (app_private.is_tenant_member(tenant_id, array['owner','editor']));

-- staff list: you see your own row; only the owner manages members
create policy staff_self_read on public.tenant_staff for select to authenticated using (user_id = (select auth.uid()));
create policy staff_owner_all on public.tenant_staff for all to authenticated
  using (app_private.is_tenant_owner(tenant_id)) with check (app_private.is_tenant_owner(tenant_id));

-- platform settings: public read, platform admin write
create policy platform_public_read on public.platform_settings for select using (true);
create policy platform_admin_write on public.platform_settings for update to authenticated
  using (app_private.is_platform_admin()) with check (app_private.is_platform_admin());

-- analytics: page views only for active tenants, bounded text; members read
create policy analytics_public_insert on public.tenant_analytics for insert
  with check (app_private.tenant_is_active(tenant_id) and char_length(page) <= 300 and coalesce(char_length(referrer), 0) <= 300);
create policy analytics_member_read on public.tenant_analytics for select to authenticated
  using (app_private.is_tenant_member(tenant_id));

-- ============================================================ functions
create or replace function public.get_tenant_by_slug(p_slug text) returns json
language sql stable security definer set search_path = ''
as $$
  select row_to_json(t) from (
    select id, slug, business_name, business_name_ne, tagline, tagline_ne, about, about_ne, logo_path, cover_path,
           phone, whatsapp, email, website, address, address_ne, municipality, district, province,
           latitude, longitude, map_embed_url, brand_primary, brand_config, social_links,
           business_type, business_type_ne, seo_title, seo_description, custom_domain
      from public.tenants where slug = p_slug and status = 'active'
  ) t;
$$;
revoke all on function public.get_tenant_by_slug(text) from public;
grant execute on function public.get_tenant_by_slug(text) to anon, authenticated;

-- Creating, activating and assigning businesses is a platform operation, not a client write.
create or replace function public.platform_create_tenant(p_slug text, p_name text, p_owner uuid default null) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare v_id uuid;
begin
  if not app_private.is_platform_admin() then raise exception 'FORBIDDEN: platform admin only'; end if;
  insert into public.tenants (slug, business_name, owner_id, status) values (p_slug, p_name, p_owner, 'draft') returning id into v_id;
  return v_id;
end $$;

create or replace function public.platform_set_tenant_status(p_tenant uuid, p_status text) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not app_private.is_platform_admin() then raise exception 'FORBIDDEN: platform admin only'; end if;
  if p_status not in ('draft','active','suspended') then raise exception 'VALIDATION_FAILED: status'; end if;
  update public.tenants set status = p_status where id = p_tenant;
  if not found then raise exception 'NOT_FOUND: tenant'; end if;
end $$;

create or replace function public.platform_assign_owner(p_tenant uuid, p_owner uuid) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not app_private.is_platform_admin() then raise exception 'FORBIDDEN: platform admin only'; end if;
  update public.tenants set owner_id = p_owner where id = p_tenant;
  if not found then raise exception 'NOT_FOUND: tenant'; end if;
end $$;

revoke all on function public.platform_create_tenant(text, text, uuid), public.platform_set_tenant_status(uuid, text),
  public.platform_assign_owner(uuid, uuid) from public, anon;
grant execute on function public.platform_create_tenant(text, text, uuid), public.platform_set_tenant_status(uuid, text),
  public.platform_assign_owner(uuid, uuid) to authenticated;

-- ============================================================ storage
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tenant-assets', 'tenant-assets', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set file_size_limit = 5242880, allowed_mime_types = array['image/jpeg','image/png','image/webp'];

-- Path contract (platform-app/src/platform/api.ts): tenants/<tenant_id>/<file...>
create policy tenant_assets_public_read on storage.objects for select using (bucket_id = 'tenant-assets');
create policy tenant_assets_member_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'tenant-assets' and (storage.foldername(name))[1] = 'tenants'
  and (storage.foldername(name))[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and app_private.is_tenant_member(((storage.foldername(name))[2])::uuid, array['owner','editor']));
create policy tenant_assets_member_update on storage.objects for update to authenticated using (
  bucket_id = 'tenant-assets' and (storage.foldername(name))[1] = 'tenants'
  and (storage.foldername(name))[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and app_private.is_tenant_member(((storage.foldername(name))[2])::uuid, array['owner','editor']));
create policy tenant_assets_member_delete on storage.objects for delete to authenticated using (
  bucket_id = 'tenant-assets' and (storage.foldername(name))[1] = 'tenants'
  and (storage.foldername(name))[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and app_private.is_tenant_member(((storage.foldername(name))[2])::uuid, array['owner','editor']));
