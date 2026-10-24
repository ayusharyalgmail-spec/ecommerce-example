-- Enforce products.min_purchase_qty on the server. quote_checkout is the single pricing path: place_order calls it
-- before inserting anything, so a rejected quote also rejects the order (whole transaction rolls back).
-- Body is identical to the live definition from 20261019193545_rls_and_rpc except the two quantity checks.
-- Also rejects quantities below 1, which the old function accepted (a negative quantity lowered the quote total;
-- place_order was already safe because order_items requires quantity > 0).
-- CREATE OR REPLACE keeps the existing EXECUTE grants (anon, authenticated).

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
      if it.q is null or it.q < 1 then raise exception 'VALIDATION_FAILED: quantity %', it.pid; end if;
      if it.q < pr.min_purchase_qty then raise exception 'MIN_QUANTITY: % %', it.pid, pr.min_purchase_qty; end if;
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

comment on column public.products.min_purchase_qty is
  'Minimum quantity a customer must buy in a single order. Enforced by quote_checkout (and so place_order); the cart and product page use it as the starting and lowest quantity.';
