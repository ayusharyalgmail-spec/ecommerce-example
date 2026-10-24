
-- private bucket for payment proofs
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-proofs','payment-proofs',false,5242880,array['image/jpeg','image/png','image/webp']) on conflict (id) do nothing;
create policy "anyone uploads payment proof" on storage.objects for insert to anon, authenticated with check (bucket_id='payment-proofs' and name like 'proofs/%');
create policy "staff read payment proofs" on storage.objects for select to authenticated using (bucket_id='payment-proofs' and app_private.has_permission('orders.verify_payment'));

create or replace function public.submit_payment_proof(p_token text, p_reference text, p_proof_path text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare o record; v_id uuid;
begin
  if not public.check_rate_limit('proof:'||left(p_token,12), 10, 3600) then raise exception 'RATE_LIMIT_EXCEEDED'; end if;
  select * into o from public.orders where tracking_token_hash = extensions.digest(p_token,'sha256');
  if not found or o.payment_method <> 'manual' or o.status in ('cancelled','rejected') then raise exception 'NOT_FOUND'; end if;
  if p_proof_path is null or p_proof_path !~ '^proofs/[0-9a-f-]{36}\.(webp|jpg|png)$' then raise exception 'VALIDATION_FAILED'; end if;
  insert into public.payment_records (order_id, kind, method, amount_paisa, status, reference, proof_path)
    values (o.id, 'payment', 'manual', o.total_paisa, 'submitted', left(p_reference,100), p_proof_path) returning id into v_id;
  update public.orders set payment_status = 'awaiting_verification' where id = o.id and payment_status in ('unpaid','rejected');
  insert into public.notification_events (type, audience, order_id, permission, payload, dedupe_key)
    values ('payment.needed','staff', o.id, 'orders.verify_payment', jsonb_build_object('orderId', o.id), 'payment.needed:'||v_id);
  return v_id;
end $$;
grant execute on function public.submit_payment_proof(text,text,text) to anon, authenticated;

create or replace function public.verify_payment(p_record_id uuid, p_decision text, p_note text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  if not app_private.has_permission('orders.verify_payment') then raise exception 'FORBIDDEN'; end if;
  if p_decision not in ('verified','rejected') then raise exception 'VALIDATION_FAILED'; end if;
  select * into r from public.payment_records where id = p_record_id and kind='payment' and status='submitted' for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  update public.payment_records set status = p_decision, note = p_note, verified_by = auth.uid(), verified_at = now() where id = r.id;
  update public.orders set payment_status = p_decision where id = r.order_id;
  insert into public.audit_logs (actor_type, actor_id, action, entity_type, entity_id, after)
    values ('staff', auth.uid(), 'payment.'||p_decision, 'order', r.order_id::text, jsonb_build_object('record', r.id));
end $$;
revoke execute on function public.verify_payment(uuid,text,text) from public, anon; grant execute on function public.verify_payment(uuid,text,text) to authenticated;

create or replace function public.record_refund(p_order_id uuid, p_amount bigint, p_note text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare o record;
begin
  if not app_private.has_permission('orders.verify_payment') then raise exception 'FORBIDDEN'; end if;
  select * into o from public.orders where id = p_order_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if p_amount <= 0 or p_amount > o.total_paisa then raise exception 'VALIDATION_FAILED'; end if;
  insert into public.payment_records (order_id, kind, method, amount_paisa, status, note, verified_by, verified_at)
    values (o.id, 'refund', o.payment_method, p_amount, 'verified', p_note, auth.uid(), now());
  if p_amount = o.total_paisa then update public.orders set payment_status = 'refunded' where id = o.id; end if;
  insert into public.audit_logs (actor_type, actor_id, action, entity_type, entity_id, after)
    values ('staff', auth.uid(), 'payment.refund', 'order', o.id::text, jsonb_build_object('amount', p_amount));
end $$;
revoke execute on function public.record_refund(uuid,bigint,text) from public, anon; grant execute on function public.record_refund(uuid,bigint,text) to authenticated;

-- COD cash is recorded when staff mark delivered
create or replace function public.mark_cod_collected(p_order_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare o record;
begin
  if not app_private.has_permission('orders.manage') then raise exception 'FORBIDDEN'; end if;
  select * into o from public.orders where id = p_order_id for update;
  if not found or o.payment_method <> 'cod' or o.status <> 'delivered' or o.payment_status = 'verified' then raise exception 'INVALID_TRANSITION'; end if;
  insert into public.payment_records (order_id, kind, method, amount_paisa, status, note, verified_by, verified_at)
    values (o.id, 'payment', 'cod', o.total_paisa, 'verified', 'COD cash collected', auth.uid(), now());
  update public.orders set payment_status = 'verified' where id = o.id;
end $$;
revoke execute on function public.mark_cod_collected(uuid) from public, anon; grant execute on function public.mark_cod_collected(uuid) to authenticated;

-- Push: registration
create or replace function public.register_push(p_endpoint text, p_p256dh text, p_auth text, p_locale text, p_token text default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_order uuid; v_aud text;
begin
  if auth.uid() is not null then
    v_aud := case when exists (select 1 from public.staff_members where user_id = auth.uid() and is_active) then 'staff' else 'customer' end;
    insert into public.push_subscriptions (audience, user_id, endpoint, p256dh, auth_secret, locale)
      values (v_aud, auth.uid(), p_endpoint, p_p256dh, p_auth, coalesce(p_locale,'en'))
      on conflict (endpoint) do update set user_id = auth.uid(), audience = v_aud, p256dh = excluded.p256dh, auth_secret = excluded.auth_secret, locale = excluded.locale, revoked_at = null, failure_count = 0
      returning id into v_id;
  else
    select id into v_order from public.orders where tracking_token_hash = extensions.digest(coalesce(p_token,''),'sha256');
    if v_order is null then raise exception 'NOT_FOUND'; end if;
    insert into public.push_subscriptions (audience, order_id, endpoint, p256dh, auth_secret, locale)
      values ('customer', v_order, p_endpoint, p_p256dh, p_auth, coalesce(p_locale,'en'))
      on conflict (endpoint) do update set order_id = v_order, p256dh = excluded.p256dh, auth_secret = excluded.auth_secret, revoked_at = null, failure_count = 0
      returning id into v_id;
  end if;
  return v_id;
end $$;
grant execute on function public.register_push(text,text,text,text,text) to anon, authenticated;

create or replace function public.unregister_push(p_endpoint text) returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.push_subscriptions set revoked_at = now() where endpoint = p_endpoint and (user_id = auth.uid() or auth.uid() is null);
end $$;
grant execute on function public.unregister_push(text) to anon, authenticated;

-- Worker auth without a service-role key: shared secret held in a private table.
create table app_private.worker_config (id smallint primary key default 1 check (id = 1), secret text not null);
insert into app_private.worker_config (secret) values (encode(extensions.gen_random_bytes(32),'hex'));

create or replace function app_private.check_worker(p_secret text) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from app_private.worker_config where secret = p_secret) then raise exception 'FORBIDDEN'; end if;
end $$;

create or replace function public.worker_claim_batch(p_secret text, p_limit int default 20) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare e record; out jsonb := '[]'::jsonb; subs jsonb; v_type text;
begin
  perform app_private.check_worker(p_secret);
  -- reclaim stuck rows
  update public.notification_events set status = 'failed', locked_at = null where status = 'processing' and locked_at < now() - interval '5 minutes';
  for e in select * from public.notification_events where status in ('pending','failed') and next_attempt_at <= now()
           order by next_attempt_at limit p_limit for update skip locked loop
    update public.notification_events set status = 'processing', locked_at = now(), attempts = attempts + 1 where id = e.id;
    v_type := e.type;
    if e.audience = 'staff' then
      select coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth_secret, 'locale', s.locale)), '[]'::jsonb) into subs
        from public.push_subscriptions s join public.staff_members m on m.user_id = s.user_id and m.is_active
        where s.revoked_at is null and s.audience = 'staff'
          and (e.permission is null or e.permission = any(app_private.role_permissions(m.role)) or e.permission = any(m.permissions))
          and coalesce((select enabled from public.notification_preferences p where p.user_id = s.user_id and p.type = v_type), true);
    else
      select coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth_secret, 'locale', s.locale)), '[]'::jsonb) into subs
        from public.push_subscriptions s
        where s.revoked_at is null and s.audience = 'customer'
          and ((e.user_id is not null and s.user_id = e.user_id) or (e.order_id is not null and s.order_id = e.order_id))
          and coalesce((select enabled from public.notification_preferences p where p.user_id = s.user_id and p.type = v_type), true);
    end if;
    out := out || jsonb_build_object('id', e.id, 'type', e.type, 'orderId', e.order_id, 'audience', e.audience, 'attempts', e.attempts + 1, 'subscriptions', subs);
  end loop;
  return out;
end $$;
grant execute on function public.worker_claim_batch(text,int) to anon, authenticated;

create or replace function public.worker_record(p_secret text, p_event_id uuid, p_results jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare r jsonb; v_ok boolean := false; v_retry boolean := false; v_attempts int; v_err text;
begin
  perform app_private.check_worker(p_secret);
  for r in select * from jsonb_array_elements(p_results) loop
    insert into public.notification_deliveries (event_id, subscription_id, status, http_status, error)
      values (p_event_id, (r->>'subscriptionId')::uuid, r->>'status', nullif(r->>'http',''):: int, left(r->>'error',300));
    if r->>'status' = 'submitted' then
      v_ok := true;
      update public.push_subscriptions set last_success_at = now(), failure_count = 0 where id = (r->>'subscriptionId')::uuid;
    elsif r->>'status' = 'gone' then
      update public.push_subscriptions set revoked_at = now() where id = (r->>'subscriptionId')::uuid;
    else
      v_retry := true; v_err := r->>'error';
      update public.push_subscriptions set failure_count = failure_count + 1, revoked_at = case when failure_count + 1 >= 10 then now() else revoked_at end where id = (r->>'subscriptionId')::uuid;
    end if;
  end loop;
  select attempts into v_attempts from public.notification_events where id = p_event_id;
  if v_retry and not v_ok then
    update public.notification_events set status = case when v_attempts >= 6 then 'dead' else 'failed' end, last_error = v_err, locked_at = null,
      next_attempt_at = now() + (power(2, v_attempts) * interval '30 seconds') + (random() * interval '10 seconds') where id = p_event_id;
  else
    update public.notification_events set status = 'sent', processed_at = now(), locked_at = null where id = p_event_id;
  end if;
end $$;
grant execute on function public.worker_record(text,uuid,jsonb) to anon, authenticated;

create or replace function public.worker_health(p_secret text) returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  perform app_private.check_worker(p_secret);
  return jsonb_build_object(
    'oldestPendingMinutes', (select coalesce(extract(epoch from now() - min(created_at))/60, 0) from public.notification_events where status in ('pending','failed')),
    'deadCount', (select count(*) from public.notification_events where status = 'dead'));
end $$;
grant execute on function public.worker_health(text) to anon, authenticated;

-- Notification history for the signed-in user (type, time, status only)
create or replace function public.my_notifications(p_limit int default 30) returns table(id uuid, type text, status text, created_at timestamptz)
language sql security definer set search_path = '' stable as $$
  select e.id, e.type, e.status, e.created_at from public.notification_events e
  where auth.uid() is not null and (
    (e.audience = 'customer' and e.user_id = auth.uid())
    or (e.audience = 'staff' and app_private.has_permission(coalesce(e.permission,'orders.view'))))
  order by e.created_at desc limit least(p_limit, 100) $$;
grant execute on function public.my_notifications(int) to authenticated;

-- review pending event
create or replace function public.submit_review(p_order_item_id uuid, p_rating int, p_title text, p_body text) returns uuid language plpgsql security definer set search_path = '' as $$
declare oi record; v_id uuid; v_name text;
begin
  select oi2.*, o.user_id as uid, o.status as ostatus into oi from public.order_items oi2 join public.orders o on o.id = oi2.order_id where oi2.id = p_order_item_id;
  if not found or oi.uid is distinct from auth.uid() or oi.ostatus <> 'delivered' then raise exception 'FORBIDDEN'; end if;
  select full_name into v_name from public.profiles where id = auth.uid();
  insert into public.reviews (product_id, user_id, order_item_id, rating, title, body, author_name)
    values (oi.product_id, auth.uid(), oi.id, p_rating, p_title, p_body, v_name) returning id into v_id;
  insert into public.notification_events (type, audience, permission, payload, dedupe_key)
    values ('review.pending','staff','reviews.moderate', jsonb_build_object('reviewId', v_id), 'review.pending:'||v_id);
  return v_id;
end $$;

-- low-stock event hook
create or replace function app_private.low_stock_event() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (old.stock_quantity - old.reserved_quantity) >= old.low_stock_threshold and (new.stock_quantity - new.reserved_quantity) < new.low_stock_threshold then
    insert into public.notification_events (type, audience, permission, payload, dedupe_key)
      values ('stock.low','staff','products.manage', jsonb_build_object('productId', new.id), 'stock.low:'||new.id||':'||floor(extract(epoch from now())/3600))
    on conflict (dedupe_key) do nothing;
  end if;
  return new;
end $$;
create trigger trg_products_low_stock after update of stock_quantity, reserved_quantity on public.products for each row execute function app_private.low_stock_event();

-- wishlist/addresses already covered by RLS; staff list helper
create or replace function public.list_staff() returns table(user_id uuid, email text, role text, permissions text[], is_active boolean, created_at timestamptz)
language sql security definer set search_path = '' stable as $$
  select m.user_id, coalesce(m.email::text, u.email), m.role, m.permissions, m.is_active, m.created_at
  from public.staff_members m join auth.users u on u.id = m.user_id where app_private.has_permission('staff.manage') order by m.created_at $$;
grant execute on function public.list_staff() to authenticated;
