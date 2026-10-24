
create or replace function app_private.role_permissions(r text) returns text[] language sql immutable as $$
  select case r
   when 'owner' then array['products.view','products.manage','orders.view','orders.manage','orders.verify_payment','orders.override_confirmation','customers.view','coupons.manage','delivery.manage','reviews.moderate','reports.view','csv.manage','staff.manage','settings.manage','audit.view']
   when 'manager' then array['products.view','products.manage','orders.view','orders.manage','orders.verify_payment','customers.view','coupons.manage','delivery.manage','reviews.moderate','reports.view','csv.manage','audit.view']
   else array['products.view','orders.view','orders.manage'] end $$;

create or replace function app_private.has_permission(p text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.staff_members s
    where s.user_id = auth.uid() and s.is_active
      and (p = any(app_private.role_permissions(s.role)) or p = any(s.permissions))) $$;
grant usage on schema app_private to anon, authenticated;
grant execute on function app_private.has_permission(text) to anon, authenticated;

-- enable RLS everywhere
do $$ declare t text; begin
  for t in select tablename from pg_tables where schemaname='public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop; end $$;

-- public reads
create policy store_settings_read on public.store_settings for select using (true);
create policy store_settings_write on public.store_settings for update to authenticated using (app_private.has_permission('settings.manage'));
create policy categories_read on public.categories for select using (is_active or app_private.has_permission('products.view'));
create policy categories_write on public.categories for all to authenticated using (app_private.has_permission('products.manage')) with check (app_private.has_permission('products.manage'));
create policy products_read on public.products for select using (status='published' or app_private.has_permission('products.view') or app_private.has_permission('products.manage'));
create policy products_write on public.products for all to authenticated using (app_private.has_permission('products.manage')) with check (app_private.has_permission('products.manage'));
create policy images_read on public.product_images for select using (exists (select 1 from public.products p where p.id=product_id and p.status='published') or app_private.has_permission('products.view'));
create policy images_write on public.product_images for all to authenticated using (app_private.has_permission('products.manage')) with check (app_private.has_permission('products.manage'));
create policy zones_read on public.delivery_zones for select using (is_active or app_private.has_permission('delivery.manage'));
create policy zones_write on public.delivery_zones for all to authenticated using (app_private.has_permission('delivery.manage')) with check (app_private.has_permission('delivery.manage'));
create policy reviews_read on public.reviews for select using (status='approved' or user_id=auth.uid() or app_private.has_permission('reviews.moderate'));
create policy reviews_mod on public.reviews for update to authenticated using (app_private.has_permission('reviews.moderate'));

-- own data
create policy profiles_own on public.profiles for select to authenticated using (id=auth.uid() or app_private.has_permission('customers.view'));
create policy profiles_upd on public.profiles for update to authenticated using (id=auth.uid());
create policy staff_read on public.staff_members for select to authenticated using (user_id=auth.uid() or app_private.has_permission('staff.manage'));
create policy staff_write on public.staff_members for all to authenticated using (app_private.has_permission('staff.manage')) with check (app_private.has_permission('staff.manage'));
create policy cart_own on public.carts for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy cart_items_own on public.cart_items for all to authenticated using (exists (select 1 from public.carts c where c.id=cart_id and c.user_id=auth.uid())) with check (exists (select 1 from public.carts c where c.id=cart_id and c.user_id=auth.uid()));
create policy wish_own on public.wishlists for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy addr_own on public.customer_addresses for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy notifpref_own on public.notification_preferences for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy push_own_ins on public.push_subscriptions for insert to authenticated with check (user_id=auth.uid());
create policy push_own_del on public.push_subscriptions for delete to authenticated using (user_id=auth.uid());

-- orders (reads only; writes via RPC)
create policy orders_read on public.orders for select to authenticated using (user_id=auth.uid() or app_private.has_permission('orders.view'));
create policy order_items_read on public.order_items for select to authenticated using (exists (select 1 from public.orders o where o.id=order_id and (o.user_id=auth.uid() or app_private.has_permission('orders.view'))));
create policy order_events_read on public.order_status_events for select to authenticated using (exists (select 1 from public.orders o where o.id=order_id and (o.user_id=auth.uid() or app_private.has_permission('orders.view'))));
create policy order_verif_read on public.order_verifications for select to authenticated using (app_private.has_permission('orders.view'));
create policy payments_read on public.payment_records for select to authenticated using (exists (select 1 from public.orders o where o.id=order_id and (o.user_id=auth.uid() or app_private.has_permission('orders.view'))));
create policy coupons_staff on public.coupons for all to authenticated using (app_private.has_permission('coupons.manage')) with check (app_private.has_permission('coupons.manage'));
create policy redemptions_staff on public.coupon_redemptions for select to authenticated using (app_private.has_permission('coupons.manage'));
create policy stock_read on public.stock_movements for select to authenticated using (app_private.has_permission('products.manage'));
create policy audit_read on public.audit_logs for select to authenticated using (app_private.has_permission('audit.view'));

-- protect stock columns from direct client writes
revoke update (stock_quantity, reserved_quantity, units_sold, rating_sum, review_count) on public.products from authenticated, anon;
revoke insert, update, delete on public.orders, public.order_items, public.order_status_events, public.payment_records, public.order_verifications from authenticated, anon;

-- RPC: quote
create or replace function public.quote_checkout(p_items jsonb, p_zone_id uuid, p_coupon text default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_list bigint := 0; v_disc bigint := 0; v_goods bigint; v_cdisc bigint := 0;
  v_fee bigint; v_thr bigint; z record; c record; it record; v_lines jsonb := '[]'::jsonb;
begin
  for it in select (e->>'productId')::uuid pid, (e->>'quantity')::int q from jsonb_array_elements(p_items) e loop
    declare pr record; begin
      select * into pr from public.products where id = it.pid and status='published';
      if not found then raise exception 'NOT_FOUND: product %', it.pid; end if;
      if pr.stock_quantity - pr.reserved_quantity < it.q then raise exception 'INSUFFICIENT_STOCK: %', it.pid; end if;
      v_list := v_list + pr.price_paisa * it.q;
      v_disc := v_disc + (pr.price_paisa - coalesce(pr.discount_price_paisa, pr.price_paisa)) * it.q;
      v_lines := v_lines || jsonb_build_object('productId', pr.id, 'name_en', pr.name_en, 'quantity', it.q,
        'unitPrice_paisa', coalesce(pr.discount_price_paisa, pr.price_paisa),
        'lineTotal_paisa', coalesce(pr.discount_price_paisa, pr.price_paisa) * it.q);
    end;
  end loop;
  v_goods := v_list - v_disc;
  if p_coupon is not null then
    select * into c from public.coupons where code = p_coupon and is_active
      and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now())
      and (max_redemptions is null or redemption_count < max_redemptions) and min_subtotal_paisa <= v_goods;
    if not found then raise exception 'COUPON_UNAVAILABLE'; end if;
    v_cdisc := case c.type when 'percent' then least(floor(v_goods * c.value / 100.0)::bigint, coalesce(c.max_discount_paisa, v_goods))
                           else least(c.value::bigint, v_goods) end;
  end if;
  select * into z from public.delivery_zones where id = p_zone_id and is_active;
  if not found then raise exception 'NOT_FOUND: delivery zone'; end if;
  select coalesce(z.free_threshold_paisa, s.free_delivery_threshold_paisa) into v_thr from public.store_settings s where s.id = 1;
  v_fee := case when v_thr is not null and (v_goods - v_cdisc) >= v_thr then 0 else z.fee_paisa end;
  return jsonb_build_object('items', v_lines, 'itemsListTotal_paisa', v_list, 'itemDiscount_paisa', v_disc,
    'couponDiscount_paisa', v_cdisc, 'deliveryFee_paisa', v_fee, 'total_paisa', v_goods - v_cdisc + v_fee);
end $$;
grant execute on function public.quote_checkout(jsonb, uuid, text) to anon, authenticated;

-- RPC: place order (atomic, idempotent)
create or replace function public.place_order(p_idempotency_key text, p_items jsonb, p_zone_id uuid, p_coupon text,
  p_payment_method text, p_name text, p_phone text, p_email text, p_recipient text, p_ship_phone text,
  p_address text, p_landmark text, p_municipality text, p_district text, p_locale text default 'en')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_hash bytea; v_existing record; v_quote jsonb; v_token text; v_id uuid; z record; c record;
  it record; pr record; v_flags text[] := '{}'; v_num text; v_open int; v_cd bigint;
begin
  v_hash := extensions.digest(convert_to(coalesce(p_items::text,'')||p_zone_id::text||coalesce(p_coupon,'')||p_phone||p_payment_method,'utf8'),'sha256');
  select * into v_existing from public.orders where idempotency_key = p_idempotency_key;
  if found then
    if v_existing.request_hash <> v_hash then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
    return jsonb_build_object('id', v_existing.id, 'orderNumber', v_existing.order_number, 'total_paisa', v_existing.total_paisa, 'status', v_existing.status, 'replayed', true);
  end if;
  if p_phone !~ '^\+977[0-9]{9,10}$' then raise exception 'VALIDATION_FAILED: phone'; end if;
  if p_payment_method not in ('cod','manual') then raise exception 'VALIDATION_FAILED: payment'; end if;
  if not public.check_rate_limit('order:phone:'||p_phone, 3, 60) then raise exception 'RATE_LIMIT_EXCEEDED'; end if;

  v_quote := public.quote_checkout(p_items, p_zone_id, p_coupon);
  select * into z from public.delivery_zones where id = p_zone_id;

  select count(*) into v_open from public.orders where customer_phone = p_phone and status in ('pending_confirmation','confirmed','processing');
  if v_open >= (select max_pending_orders_per_phone from public.store_settings where id=1) then v_flags := v_flags || 'repeated_phone'; end if;
  if exists (select 1 from public.orders where customer_phone = p_phone and customer_name <> p_name) then v_flags := v_flags || 'name_mismatch'; end if;

  if p_coupon is not null then
    select * into c from public.coupons where code = p_coupon for update;
    perform pg_advisory_xact_lock(hashtextextended(c.id::text||':'||coalesce(auth.uid()::text,p_phone),0));
    if (select count(*) from public.coupon_redemptions r where r.coupon_id=c.id and r.status='applied'
        and (r.user_id = auth.uid() or r.customer_phone = p_phone)) >= c.per_customer_limit then raise exception 'COUPON_UNAVAILABLE'; end if;
    update public.coupons set redemption_count = redemption_count + 1
      where id = c.id and (max_redemptions is null or redemption_count < max_redemptions);
    if not found then raise exception 'COUPON_UNAVAILABLE'; end if;
  end if;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.orders (tracking_token_hash, idempotency_key, request_hash, user_id, customer_name, customer_phone, customer_email,
    ship_recipient, ship_phone, ship_address_line, ship_landmark, ship_municipality, ship_district, delivery_zone_id, delivery_zone_name,
    payment_method, items_list_total_paisa, item_discount_paisa, coupon_discount_paisa, delivery_fee_paisa, total_paisa,
    coupon_id, coupon_code, risk_flags, locale)
  values (extensions.digest(v_token,'sha256'), p_idempotency_key, v_hash, auth.uid(), p_name, p_phone, p_email,
    p_recipient, p_ship_phone, p_address, p_landmark, p_municipality, p_district, p_zone_id, z.name_en,
    p_payment_method, (v_quote->>'itemsListTotal_paisa')::bigint, (v_quote->>'itemDiscount_paisa')::bigint,
    (v_quote->>'couponDiscount_paisa')::bigint, (v_quote->>'deliveryFee_paisa')::bigint, (v_quote->>'total_paisa')::bigint,
    c.id, c.code, v_flags, p_locale)
  returning id, order_number into v_id, v_num;

  for it in select (e->>'productId')::uuid pid, (e->>'quantity')::int q from jsonb_array_elements(p_items) e order by 1 loop
    update public.products set reserved_quantity = reserved_quantity + it.q
      where id = it.pid and status='published' and stock_quantity - reserved_quantity >= it.q;
    if not found then raise exception 'INSUFFICIENT_STOCK: %', it.pid; end if;
    select * into pr from public.products where id = it.pid;
    insert into public.order_items (order_id, product_id, name_en, name_ne, sku, unit_list_price_paisa, unit_price_paisa, quantity, line_total_paisa)
      values (v_id, pr.id, pr.name_en, pr.name_ne, pr.sku, pr.price_paisa, coalesce(pr.discount_price_paisa, pr.price_paisa), it.q, coalesce(pr.discount_price_paisa, pr.price_paisa) * it.q);
    insert into public.stock_movements (product_id, delta_stock, delta_reserved, reason, order_id) values (pr.id, 0, it.q, 'order_reserve', v_id);
  end loop;

  if c.id is not null then
    insert into public.coupon_redemptions (coupon_id, order_id, user_id, customer_phone, discount_paisa, status)
      values (c.id, v_id, auth.uid(), p_phone, (v_quote->>'couponDiscount_paisa')::bigint, 'applied');
  end if;
  insert into public.order_status_events (order_id, from_status, to_status, actor_type, actor_id) values (v_id, null, 'pending_confirmation', case when auth.uid() is null then 'system' else 'customer' end, auth.uid());
  insert into public.notification_events (type, audience, order_id, permission, payload, dedupe_key)
    values ('order.placed', 'staff', v_id, 'orders.view', jsonb_build_object('orderId', v_id), 'order.placed:'||v_id);

  return jsonb_build_object('id', v_id, 'orderNumber', v_num, 'trackingToken', v_token,
    'total_paisa', (v_quote->>'total_paisa')::bigint, 'status', 'pending_confirmation', 'paymentStatus', 'unpaid');
end $$;
grant execute on function public.place_order(text,jsonb,uuid,text,text,text,text,text,text,text,text,text,text,text,text) to anon, authenticated;

-- rate limit helper
create or replace function public.check_rate_limit(p_key text, p_limit int, p_seconds int) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_w timestamptz := to_timestamp(floor(extract(epoch from now()) / p_seconds) * p_seconds); v_c int;
begin
  insert into public.rate_limit_hits (key, window_start, count) values (p_key, v_w, 1)
  on conflict (key, window_start) do update set count = public.rate_limit_hits.count + 1 returning count into v_c;
  return v_c <= p_limit;
end $$;
revoke execute on function public.check_rate_limit(text,int,int) from public, anon, authenticated;

-- transition order
create or replace function app_private.order_transition_allowed(f text, t text) returns boolean language sql immutable as $$
  select (f,t) in (('pending_confirmation','confirmed'),('pending_confirmation','cancelled'),('pending_confirmation','rejected'),
    ('confirmed','processing'),('confirmed','cancelled'),('processing','dispatched'),('processing','cancelled'),
    ('dispatched','delivered'),('dispatched','cancelled')) $$;

create or replace function public.transition_order(p_order_id uuid, p_to text, p_expected text, p_note text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare o record; li record;
begin
  if not app_private.has_permission('orders.manage') then raise exception 'FORBIDDEN'; end if;
  select * into o from public.orders where id = p_order_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if o.status <> p_expected then raise exception 'STALE_STATUS'; end if;
  if not app_private.order_transition_allowed(o.status, p_to) then raise exception 'INVALID_TRANSITION'; end if;
  for li in select * from public.order_items where order_id = o.id and product_id is not null loop
    if p_to in ('cancelled','rejected') and o.status <> 'dispatched' then
      update public.products set reserved_quantity = reserved_quantity - li.quantity where id = li.product_id;
      insert into public.stock_movements (product_id, delta_stock, delta_reserved, reason, order_id, actor_id) values (li.product_id, 0, -li.quantity, 'order_release', o.id, auth.uid());
    elsif p_to = 'dispatched' then
      update public.products set stock_quantity = stock_quantity - li.quantity, reserved_quantity = reserved_quantity - li.quantity where id = li.product_id;
      insert into public.stock_movements (product_id, delta_stock, delta_reserved, reason, order_id, actor_id) values (li.product_id, -li.quantity, -li.quantity, 'order_dispatch', o.id, auth.uid());
    elsif p_to = 'delivered' then
      update public.products set units_sold = units_sold + li.quantity where id = li.product_id;
    end if;
  end loop;
  if p_to in ('cancelled','rejected') and o.status <> 'dispatched' and o.coupon_id is not null then
    update public.coupon_redemptions set status='released', released_at=now() where order_id=o.id and status='applied';
    update public.coupons set redemption_count = greatest(redemption_count-1,0) where id=o.coupon_id;
  end if;
  update public.orders set status = p_to, cancel_reason = case when p_to in ('cancelled','rejected') then p_note else cancel_reason end,
    confirmed_at = case when p_to='confirmed' then now() else confirmed_at end,
    confirmed_by = case when p_to='confirmed' then auth.uid() else confirmed_by end where id = o.id;
  insert into public.order_status_events (order_id, from_status, to_status, actor_type, actor_id, note) values (o.id, o.status, p_to, 'staff', auth.uid(), p_note);
  insert into public.audit_logs (actor_type, actor_id, action, entity_type, entity_id, before, after)
    values ('staff', auth.uid(), 'order.transition', 'order', o.id::text, jsonb_build_object('status', o.status), jsonb_build_object('status', p_to));
  insert into public.notification_events (type, audience, user_id, order_id, payload, dedupe_key)
    values ('order.'||p_to, 'customer', o.user_id, o.id, jsonb_build_object('orderId', o.id), 'order.'||p_to||':'||o.id);
  return jsonb_build_object('orderId', o.id, 'newStatus', p_to);
end $$;
grant execute on function public.transition_order(uuid,text,text,text) to authenticated;

-- guest tracking (uniform not-found)
create or replace function public.track_order(p_token text default null, p_number text default null, p_phone text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare o record;
begin
  if p_token is not null then
    select * into o from public.orders where tracking_token_hash = extensions.digest(p_token,'sha256');
  else
    if not public.check_rate_limit('track:'||coalesce(p_phone,''), 50, 86400) then raise exception 'RATE_LIMIT_EXCEEDED'; end if;
    select * into o from public.orders where order_number = p_number and customer_phone = p_phone;
  end if;
  if not found then raise exception 'NOT_FOUND'; end if;
  return jsonb_build_object('orderNumber', o.order_number, 'status', o.status, 'paymentStatus', o.payment_status, 'placedAt', o.placed_at,
    'total_paisa', o.total_paisa,
    'timeline', (select coalesce(jsonb_agg(jsonb_build_object('status', e.to_status, 'at', e.created_at) order by e.created_at), '[]'::jsonb) from public.order_status_events e where e.order_id = o.id));
end $$;
grant execute on function public.track_order(text,text,text) to anon, authenticated;

-- expiry job
create or replace function public.release_expired_orders() returns int language plpgsql security definer set search_path = '' as $$
declare o record; n int := 0; li record;
begin
  for o in select * from public.orders where status='pending_confirmation'
    and placed_at < now() - make_interval(hours => (select unconfirmed_expiry_hours from public.store_settings where id=1)) for update loop
    for li in select * from public.order_items where order_id=o.id and product_id is not null loop
      update public.products set reserved_quantity = reserved_quantity - li.quantity where id=li.product_id;
      insert into public.stock_movements (product_id, delta_stock, delta_reserved, reason, order_id) values (li.product_id,0,-li.quantity,'order_release',o.id);
    end loop;
    if o.coupon_id is not null then
      update public.coupon_redemptions set status='released', released_at=now() where order_id=o.id and status='applied';
      update public.coupons set redemption_count = greatest(redemption_count-1,0) where id=o.coupon_id;
    end if;
    update public.orders set status='cancelled', cancel_reason='unconfirmed_timeout' where id=o.id;
    insert into public.order_status_events (order_id, from_status, to_status, actor_type) values (o.id,'pending_confirmation','cancelled','system');
    n := n + 1;
  end loop;
  return n;
end $$;
revoke execute on function public.release_expired_orders() from public, anon, authenticated;

-- seed demo data
insert into public.delivery_zones (name_en, name_ne, fee_paisa, free_threshold_paisa) values ('Kathmandu Valley','काठमाडौं उपत्यका',10000,500000),('Outside Valley','उपत्यका बाहिर',25000,1000000);
insert into public.categories (slug, name_en, name_ne) values ('books','Books','पुस्तकहरू'),('electronics','Electronics','इलेक्ट्रोनिक्स');
insert into public.products (slug, name_en, name_ne, description_en, price_paisa, discount_price_paisa, stock_quantity, status, published_at, category_id)
select 'sample-book','Sample Book','नमूना पुस्तक','A demo book.',149900,129900,20,'published',now(),id from public.categories where slug='books';
