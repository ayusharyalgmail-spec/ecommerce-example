-- Phase 3: homepage banners (additive). categories.image_path already exists.
-- Public reads only active, in-window banners; staff with settings.manage write; every change is audited.

create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  title_en text not null check (char_length(title_en) between 1 and 80),
  title_ne text check (char_length(title_ne) <= 120),
  subtitle_en text check (char_length(subtitle_en) <= 160),
  subtitle_ne text check (char_length(subtitle_ne) <= 240),
  cta_label_en text check (char_length(cta_label_en) <= 30),
  cta_label_ne text check (char_length(cta_label_ne) <= 50),
  link_url text check (link_url is null or link_url ~ '^/[^/\\]'),   -- internal paths only, no open redirects
  image_path text not null check (char_length(image_path) <= 300),   -- object path inside the public store-assets bucket
  image_alt_en text check (char_length(image_alt_en) <= 160),
  image_alt_ne text check (char_length(image_alt_ne) <= 240),
  sort_order int not null default 0,
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create index if not exists banners_active_order_idx on public.banners (is_active, sort_order);

alter table public.banners enable row level security;

drop policy if exists banners_read on public.banners;
create policy banners_read on public.banners for select to public using (
  (is_active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now()))
  or app_private.has_permission('settings.manage')
);

drop policy if exists banners_write on public.banners;
create policy banners_write on public.banners for all to authenticated
  using (app_private.has_permission('settings.manage'))
  with check (app_private.has_permission('settings.manage'));

create trigger trg_banners_touch before update on public.banners
  for each row execute function app_private.touch_updated_at();

-- Generic audit trigger (SECURITY DEFINER because audit_logs has no insert policy for clients).
create or replace function app_private.audit_row() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.audit_logs (actor_type, actor_id, action, entity_type, entity_id, before, after)
  values ('staff', auth.uid(), lower(tg_op), tg_table_name,
          coalesce((to_jsonb(new)->>'id'), (to_jsonb(old)->>'id')),
          case when tg_op = 'INSERT' then null else to_jsonb(old) end,
          case when tg_op = 'DELETE' then null else to_jsonb(new) end);
  return coalesce(new, old);
end $$;
revoke all on function app_private.audit_row() from public, anon, authenticated;

create trigger trg_banners_audit after insert or update or delete on public.banners
  for each row execute function app_private.audit_row();
create trigger trg_categories_audit after insert or update or delete on public.categories
  for each row execute function app_private.audit_row();

-- Staff may upload and delete banner and category artwork in the public store-assets bucket.
drop policy if exists "staff upload store assets" on storage.objects;
create policy "staff upload store assets" on storage.objects for insert to authenticated
  with check (bucket_id = 'store-assets' and (
    (name like 'banners/%' and app_private.has_permission('settings.manage')) or
    (name like 'categories/%' and app_private.has_permission('products.manage'))));

drop policy if exists "staff delete store assets" on storage.objects;
create policy "staff delete store assets" on storage.objects for delete to authenticated
  using (bucket_id = 'store-assets' and (
    (name like 'banners/%' and app_private.has_permission('settings.manage')) or
    (name like 'categories/%' and app_private.has_permission('products.manage'))));
