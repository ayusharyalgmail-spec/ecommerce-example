
create extension if not exists pg_trgm;
create extension if not exists citext;
create extension if not exists pgcrypto;
create schema if not exists app_private;

create or replace function app_private.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create table public.store_settings (
  id smallint primary key default 1 check (id = 1),
  store_name text not null default 'My Store', slug text not null default 'my-store',
  logo_path text, favicon_path text,
  theme jsonb not null default '{}'::jsonb,
  contact_phone text, whatsapp_number text, contact_email text,
  default_locale text not null default 'en' check (default_locale in ('en','ne')),
  supported_locales text[] not null default '{en,ne}',
  currency text not null default 'NPR' check (currency = 'NPR'),
  business_info jsonb, policies jsonb,
  payment_settings jsonb not null default '{"cod_enabled":true,"manual_enabled":false}'::jsonb,
  free_delivery_threshold_paisa bigint check (free_delivery_threshold_paisa >= 0),
  unconfirmed_expiry_hours integer not null default 24 check (unconfirmed_expiry_hours between 1 and 720),
  low_stock_default integer not null default 5,
  max_pending_orders_per_phone integer not null default 3,
  deployed_version text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
insert into public.store_settings (id) values (1);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text, phone text check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  preferred_locale text check (preferred_locale in ('en','ne')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.staff_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email citext,
  role text not null check (role in ('owner','manager','staff')),
  permissions text[] not null default '{}',
  is_active boolean not null default true,
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories(id) on delete restrict,
  slug text not null unique, name_en text not null, name_ne text, image_path text,
  sort_order int not null default 0, is_active boolean not null default true,
  check (parent_id is distinct from id)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  sku text unique,
  category_id uuid references public.categories(id) on delete restrict,
  name_en text not null check (char_length(name_en) between 1 and 200),
  name_ne text, description_en text, description_ne text,
  price_paisa bigint not null check (price_paisa > 0),
  discount_price_paisa bigint,
  discount_label_en text, discount_label_ne text,
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  reserved_quantity integer not null default 0 check (reserved_quantity >= 0),
  low_stock_threshold integer not null default 5 check (low_stock_threshold >= 0),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  weight_grams integer check (weight_grams > 0),
  units_sold integer not null default 0 check (units_sold >= 0),
  rating_sum integer not null default 0 check (rating_sum >= 0),
  review_count integer not null default 0 check (review_count >= 0),
  search_vector tsvector generated always as (to_tsvector('simple'::regconfig,
    coalesce(name_en,'')||' '||coalesce(name_ne,'')||' '||coalesce(description_en,'')||' '||coalesce(description_ne,''))) stored,
  published_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint products_reserved_within_stock check (reserved_quantity <= stock_quantity),
  constraint products_discount_valid check (discount_price_paisa is null or (discount_price_paisa > 0 and discount_price_paisa < price_paisa))
);
create index on public.products (status, category_id) where status = 'published';
create index on public.products using gin (search_vector);
create index on public.products using gin ((name_en || ' ' || coalesce(name_ne,'')) gin_trgm_ops);
create index on public.products (price_paisa);
create index on public.products (published_at desc);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null, alt_en text, alt_ne text,
  sort_order int not null default 0, is_primary boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index on public.product_images (product_id) where is_primary;
create index on public.product_images (product_id, sort_order);

create table public.delivery_zones (
  id uuid primary key default gen_random_uuid(),
  name_en text not null, name_ne text,
  fee_paisa bigint not null check (fee_paisa >= 0),
  free_threshold_paisa bigint check (free_threshold_paisa >= 0),
  is_active boolean not null default true, sort_order int not null default 0, notes text
);

create table public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  guest_token_hash bytea,
  expires_at timestamptz not null default now() + interval '7 days',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check ((user_id is not null) <> (guest_token_hash is not null))
);
create unique index on public.carts (user_id) where user_id is not null;
create unique index on public.carts (guest_token_hash) where guest_token_hash is not null;
create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity integer not null check (quantity between 1 and 99),
  added_at timestamptz not null default now(),
  unique (cart_id, product_id)
);

create table public.wishlists (
  user_id uuid references auth.users(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create table public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text, recipient_name text not null,
  phone text not null check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  delivery_zone_id uuid references public.delivery_zones(id) on delete set null,
  address_line text not null, landmark text, municipality text, district text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index on public.customer_addresses (user_id) where is_default;

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code citext not null unique check (code ~ '^[A-Za-z0-9_-]{3,32}$'),
  type text not null check (type in ('percent','fixed')),
  value integer not null,
  max_discount_paisa bigint check (max_discount_paisa > 0),
  min_subtotal_paisa bigint not null default 0,
  starts_at timestamptz, ends_at timestamptz,
  max_redemptions integer check (max_redemptions > 0),
  redemption_count integer not null default 0,
  per_customer_limit integer not null default 1 check (per_customer_limit > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check ((type='percent' and value between 1 and 100) or (type='fixed' and value > 0)),
  check (max_redemptions is null or redemption_count <= max_redemptions)
);

create sequence public.order_number_seq start 100000;
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('ORD-' || lpad(nextval('public.order_number_seq')::text, 6, '0')),
  tracking_token_hash bytea not null unique,
  idempotency_key text not null unique, request_hash bytea not null,
  user_id uuid references auth.users(id) on delete set null,
  customer_name text not null, customer_phone text not null check (customer_phone ~ '^\+[1-9][0-9]{7,14}$'), customer_email text,
  ship_recipient text not null, ship_phone text not null, ship_address_line text not null,
  ship_landmark text, ship_municipality text, ship_district text,
  delivery_zone_id uuid references public.delivery_zones(id) on delete set null,
  delivery_zone_name text not null,
  status text not null default 'pending_confirmation' check (status in ('pending_confirmation','confirmed','processing','dispatched','delivered','cancelled','rejected')),
  payment_method text not null check (payment_method in ('cod','manual')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid','awaiting_verification','verified','rejected','refunded')),
  items_list_total_paisa bigint not null check (items_list_total_paisa >= 0),
  item_discount_paisa bigint not null check (item_discount_paisa >= 0),
  coupon_discount_paisa bigint not null check (coupon_discount_paisa >= 0),
  delivery_fee_paisa bigint not null check (delivery_fee_paisa >= 0),
  total_paisa bigint not null check (total_paisa >= 0),
  coupon_id uuid references public.coupons(id) on delete set null, coupon_code text,
  risk_flags text[] not null default '{}',
  locale text not null default 'en' check (locale in ('en','ne')),
  customer_note text, cancel_reason text,
  placed_at timestamptz not null default now(),
  confirmed_at timestamptz, confirmed_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint orders_total_consistent check (
    total_paisa = items_list_total_paisa - item_discount_paisa - coupon_discount_paisa + delivery_fee_paisa
    and item_discount_paisa <= items_list_total_paisa
    and coupon_discount_paisa <= items_list_total_paisa - item_discount_paisa)
);
create index on public.orders (status, placed_at desc);
create index on public.orders (user_id, placed_at desc);
create index on public.orders (customer_phone, placed_at desc);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  name_en text not null, name_ne text, sku text, image_path text,
  unit_list_price_paisa bigint not null, unit_price_paisa bigint not null,
  quantity integer not null check (quantity > 0), line_total_paisa bigint not null,
  check (line_total_paisa = unit_price_paisa * quantity),
  check (unit_price_paisa <= unit_list_price_paisa)
);
create index on public.order_items (order_id);
create index on public.order_items (product_id);

create table public.order_status_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  from_status text, to_status text not null,
  actor_type text not null check (actor_type in ('customer','staff','system')),
  actor_id uuid references auth.users(id) on delete set null,
  note text, created_at timestamptz not null default now()
);
create index on public.order_status_events (order_id, created_at);

create table public.payment_records (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  kind text not null check (kind in ('payment','refund')),
  method text not null check (method in ('cod','manual')),
  amount_paisa bigint not null check (amount_paisa > 0),
  status text not null check (status in ('submitted','verified','rejected')),
  reference text, proof_path text, note text,
  submitted_at timestamptz not null default now(),
  verified_by uuid references auth.users(id) on delete set null, verified_at timestamptz
);
create index on public.payment_records (order_id);

create table public.order_verifications (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  method text not null check (method in ('phone_call','whatsapp','other')),
  outcome text not null check (outcome in ('confirmed','no_answer','declined','wrong_number','needs_follow_up')),
  note text, actor_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id) on delete restrict,
  order_id uuid not null references public.orders(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  customer_phone text not null, discount_paisa bigint not null,
  status text not null check (status in ('applied','released')),
  created_at timestamptz not null default now(), released_at timestamptz,
  unique (coupon_id, order_id)
);

create table public.stock_movements (
  id bigint generated always as identity primary key,
  product_id uuid not null references public.products(id) on delete restrict,
  delta_stock integer not null, delta_reserved integer not null,
  reason text not null check (reason in ('order_reserve','order_release','order_dispatch','manual_adjust','csv_import','return_restock')),
  order_id uuid references public.orders(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  note text, created_at timestamptz not null default now()
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  order_item_id uuid references public.order_items(id) on delete set null,
  rating smallint not null check (rating between 1 and 5),
  title text, body text check (char_length(body) <= 2000),
  status text not null default 'pending' check (status in ('pending','approved','rejected','hidden')),
  moderated_by uuid references auth.users(id) on delete set null, moderated_at timestamptz,
  created_at timestamptz not null default now(),
  unique (product_id, user_id)
);
create index on public.reviews (product_id, status, created_at desc);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  audience text not null check (audience in ('customer','staff')),
  user_id uuid references auth.users(id) on delete cascade,
  order_id uuid references public.orders(id) on delete cascade,
  endpoint text not null unique, p256dh text not null, auth_secret text not null,
  locale text not null default 'en', user_agent text,
  created_at timestamptz not null default now(), last_success_at timestamptz,
  failure_count int not null default 0, revoked_at timestamptz,
  check (user_id is not null or order_id is not null)
);

create table public.notification_preferences (
  user_id uuid references auth.users(id) on delete cascade,
  type text not null, enabled boolean not null default true,
  primary key (user_id, type)
);

create table public.notification_events (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  audience text not null check (audience in ('customer','staff')),
  user_id uuid, order_id uuid, permission text,
  payload jsonb not null default '{}'::jsonb,
  dedupe_key text not null unique,
  status text not null default 'pending' check (status in ('pending','processing','sent','failed','dead')),
  attempts int not null default 0, next_attempt_at timestamptz not null default now(),
  locked_at timestamptz, last_error text,
  created_at timestamptz not null default now(), processed_at timestamptz
);
create index on public.notification_events (next_attempt_at) where status in ('pending','failed');

create table public.notification_deliveries (
  id bigint generated always as identity primary key,
  event_id uuid not null references public.notification_events(id) on delete cascade,
  subscription_id uuid not null references public.push_subscriptions(id) on delete cascade,
  status text not null check (status in ('submitted','failed','gone')),
  http_status int, error text, attempted_at timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_type text not null check (actor_type in ('staff','customer','system','operator')),
  actor_id uuid, action text not null, entity_type text not null, entity_id text,
  before jsonb, after jsonb, request_id text, created_at timestamptz not null default now()
);
create index on public.audit_logs (entity_type, entity_id, created_at desc);

create table public.rate_limit_hits (
  key text not null, window_start timestamptz not null, count integer not null default 1,
  primary key (key, window_start)
);
create table public.break_glass_sessions (
  id uuid primary key default gen_random_uuid(),
  operator_label text not null, reason text not null,
  started_at timestamptz not null default now(), expires_at timestamptz not null,
  ended_at timestamptz, ticket_ref text
);

-- updated_at triggers
do $$ declare t text; begin
  foreach t in array array['store_settings','profiles','products','carts','customer_addresses','orders'] loop
    execute format('create trigger trg_%1$s_touch before update on public.%1$s for each row execute function app_private.touch_updated_at()', t);
  end loop; end $$;

-- append-only guards
create or replace function app_private.block_mutation() returns trigger language plpgsql as $$
begin raise exception 'append-only table'; end $$;
create trigger trg_stock_movements_ro before update or delete on public.stock_movements for each row execute function app_private.block_mutation();
create trigger trg_order_events_ro before update or delete on public.order_status_events for each row execute function app_private.block_mutation();
create trigger trg_audit_ro before update or delete on public.audit_logs for each row execute function app_private.block_mutation();

-- profile on signup
create or replace function app_private.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'))
  on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function app_private.handle_new_user();
