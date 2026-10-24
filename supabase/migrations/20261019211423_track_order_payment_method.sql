
create or replace function public.track_order(p_token text default null, p_number text default null, p_phone text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare o record;
begin
  if p_token is not null then
    if not public.check_rate_limit('track:tok:'||left(p_token,8), 120, 3600) then raise exception 'RATE_LIMIT_EXCEEDED'; end if;
    select * into o from public.orders where tracking_token_hash = extensions.digest(p_token,'sha256');
  else
    if not public.check_rate_limit('track:'||coalesce(p_phone,''), 50, 86400) then raise exception 'RATE_LIMIT_EXCEEDED'; end if;
    select * into o from public.orders where order_number = p_number and customer_phone = p_phone;
  end if;
  if not found then raise exception 'NOT_FOUND'; end if;
  return jsonb_build_object('orderNumber', o.order_number, 'status', o.status, 'paymentStatus', o.payment_status,
    'paymentMethod', o.payment_method, 'placedAt', o.placed_at, 'total_paisa', o.total_paisa,
    'timeline', (select coalesce(jsonb_agg(jsonb_build_object('status', e.to_status, 'at', e.created_at) order by e.created_at), '[]'::jsonb) from public.order_status_events e where e.order_id = o.id));
end $$;
