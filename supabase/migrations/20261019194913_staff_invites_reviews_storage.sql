
create table public.staff_invites (
  email extensions.citext primary key, role text not null check (role in ('owner','manager','staff')),
  permissions text[] not null default '{}', invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now());
alter table public.staff_invites enable row level security;
create policy invites_staff on public.staff_invites for all to authenticated using (app_private.has_permission('staff.manage')) with check (app_private.has_permission('staff.manage'));
insert into public.staff_invites (email, role) values ('amnaryal@gmail.com','owner');

create or replace function public.claim_staff_invite() returns text language plpgsql security definer set search_path = '' as $$
declare i record; v_email text := auth.jwt()->>'email';
begin
  if auth.uid() is null then return null; end if;
  select * into i from public.staff_invites where email = v_email::extensions.citext;
  if not found then return null; end if;
  insert into public.staff_members (user_id, email, role, permissions, invited_by)
    values (auth.uid(), v_email::extensions.citext, i.role, i.permissions, i.invited_by) on conflict (user_id) do nothing;
  delete from public.staff_invites where email = i.email;
  return i.role;
end $$;
revoke execute on function public.claim_staff_invite() from public, anon; grant execute on function public.claim_staff_invite() to authenticated;

create or replace function public.cancel_order_by_customer(p_order_id uuid) returns jsonb language plpgsql security definer set search_path = '' as $$
declare o record; li record;
begin
  select * into o from public.orders where id = p_order_id and user_id = auth.uid() for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if o.status <> 'pending_confirmation' then raise exception 'FORBIDDEN'; end if;
  for li in select * from public.order_items where order_id = o.id and product_id is not null loop
    update public.products set reserved_quantity = reserved_quantity - li.quantity where id = li.product_id;
    insert into public.stock_movements (product_id, delta_stock, delta_reserved, reason, order_id, actor_id) values (li.product_id,0,-li.quantity,'order_release',o.id,auth.uid());
  end loop;
  if o.coupon_id is not null then
    update public.coupon_redemptions set status='released', released_at=now() where order_id=o.id and status='applied';
    update public.coupons set redemption_count = greatest(redemption_count-1,0) where id=o.coupon_id;
  end if;
  update public.orders set status='cancelled', cancel_reason='customer_request' where id=o.id;
  insert into public.order_status_events (order_id, from_status, to_status, actor_type, actor_id) values (o.id,'pending_confirmation','cancelled','customer',auth.uid());
  return jsonb_build_object('orderId', o.id, 'status', 'cancelled');
end $$;
revoke execute on function public.cancel_order_by_customer(uuid) from public, anon; grant execute on function public.cancel_order_by_customer(uuid) to authenticated;

create or replace function public.adjust_stock(p_product_id uuid, p_delta int, p_reason text, p_note text default null) returns jsonb language plpgsql security definer set search_path = '' as $$
declare p record;
begin
  if not app_private.has_permission('products.manage') then raise exception 'FORBIDDEN'; end if;
  if p_reason not in ('manual_adjust','return_restock','csv_import') then raise exception 'VALIDATION_FAILED'; end if;
  select * into p from public.products where id = p_product_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if p.stock_quantity + p_delta < p.reserved_quantity then raise exception 'INSUFFICIENT_STOCK: below reserved'; end if;
  update public.products set stock_quantity = stock_quantity + p_delta where id = p.id;
  insert into public.stock_movements (product_id, delta_stock, delta_reserved, reason, actor_id, note) values (p.id, p_delta, 0, p_reason, auth.uid(), p_note);
  insert into public.audit_logs (actor_type, actor_id, action, entity_type, entity_id, after) values ('staff', auth.uid(), 'stock.adjust', 'product', p.id::text, jsonb_build_object('delta', p_delta));
  return jsonb_build_object('productId', p.id, 'newStock', p.stock_quantity + p_delta, 'newReserved', p.reserved_quantity);
end $$;
revoke execute on function public.adjust_stock(uuid,int,text,text) from public, anon; grant execute on function public.adjust_stock(uuid,int,text,text) to authenticated;

create or replace function public.submit_review(p_order_item_id uuid, p_rating int, p_title text, p_body text) returns uuid language plpgsql security definer set search_path = '' as $$
declare oi record; v_id uuid;
begin
  select oi2.*, o.user_id as uid, o.status as ostatus into oi from public.order_items oi2 join public.orders o on o.id = oi2.order_id where oi2.id = p_order_item_id;
  if not found or oi.uid is distinct from auth.uid() or oi.ostatus <> 'delivered' then raise exception 'FORBIDDEN'; end if;
  insert into public.reviews (product_id, user_id, order_item_id, rating, title, body) values (oi.product_id, auth.uid(), oi.id, p_rating, p_title, p_body) returning id into v_id;
  return v_id;
end $$;
revoke execute on function public.submit_review(uuid,int,text,text) from public, anon; grant execute on function public.submit_review(uuid,int,text,text) to authenticated;

create or replace function public.moderate_review(p_id uuid, p_decision text) returns void language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  if not app_private.has_permission('reviews.moderate') then raise exception 'FORBIDDEN'; end if;
  if p_decision not in ('approved','rejected','hidden') then raise exception 'VALIDATION_FAILED'; end if;
  select * into r from public.reviews where id = p_id for update;
  if r.status = 'approved' and p_decision <> 'approved' then
    update public.products set rating_sum = rating_sum - r.rating, review_count = review_count - 1 where id = r.product_id;
  elsif r.status <> 'approved' and p_decision = 'approved' then
    update public.products set rating_sum = rating_sum + r.rating, review_count = review_count + 1 where id = r.product_id;
  end if;
  update public.reviews set status = p_decision, moderated_by = auth.uid(), moderated_at = now() where id = p_id;
end $$;
revoke execute on function public.moderate_review(uuid,text) from public, anon; grant execute on function public.moderate_review(uuid,text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
 ('product-images','product-images',true,5242880,array['image/jpeg','image/png','image/webp']),
 ('store-assets','store-assets',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
create policy "staff upload product images" on storage.objects for insert to authenticated with check (bucket_id='product-images' and app_private.has_permission('products.manage'));
create policy "staff delete product images" on storage.objects for delete to authenticated using (bucket_id='product-images' and app_private.has_permission('products.manage'));
