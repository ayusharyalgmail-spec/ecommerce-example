
create or replace function public.place_order(p_idempotency_key text, p_items jsonb, p_zone_id uuid, p_coupon text,
  p_payment_method text, p_name text, p_phone text, p_email text, p_recipient text, p_ship_phone text,
  p_address text, p_landmark text, p_municipality text, p_district text, p_locale text default 'en')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_hash bytea; v_existing record; v_quote jsonb; v_token text; v_id uuid; z record; c record;
  it record; pr record; v_flags text[] := '{}'; v_num text; v_open int;
  v_cid uuid; v_ccode text;
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

  if p_coupon is not null and p_coupon <> '' then
    select * into c from public.coupons where code = p_coupon for update;
    v_cid := c.id; v_ccode := c.code::text;
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
    v_cid, v_ccode, v_flags, p_locale)
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

  if v_cid is not null then
    insert into public.coupon_redemptions (coupon_id, order_id, user_id, customer_phone, discount_paisa, status)
      values (v_cid, v_id, auth.uid(), p_phone, (v_quote->>'couponDiscount_paisa')::bigint, 'applied');
  end if;
  insert into public.order_status_events (order_id, from_status, to_status, actor_type, actor_id) values (v_id, null, 'pending_confirmation', case when auth.uid() is null then 'system' else 'customer' end, auth.uid());
  insert into public.notification_events (type, audience, order_id, permission, payload, dedupe_key)
    values ('order.placed', 'staff', v_id, 'orders.view', jsonb_build_object('orderId', v_id), 'order.placed:'||v_id);

  return jsonb_build_object('id', v_id, 'orderNumber', v_num, 'trackingToken', v_token,
    'total_paisa', (v_quote->>'total_paisa')::bigint, 'status', 'pending_confirmation', 'paymentStatus', 'unpaid');
end $$;
