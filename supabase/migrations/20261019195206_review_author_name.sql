
alter table public.reviews add column author_name text;
create or replace function public.submit_review(p_order_item_id uuid, p_rating int, p_title text, p_body text) returns uuid language plpgsql security definer set search_path = '' as $$
declare oi record; v_id uuid; v_name text;
begin
  select oi2.*, o.user_id as uid, o.status as ostatus into oi from public.order_items oi2 join public.orders o on o.id = oi2.order_id where oi2.id = p_order_item_id;
  if not found or oi.uid is distinct from auth.uid() or oi.ostatus <> 'delivered' then raise exception 'FORBIDDEN'; end if;
  select full_name into v_name from public.profiles where id = auth.uid();
  insert into public.reviews (product_id, user_id, order_item_id, rating, title, body, author_name)
    values (oi.product_id, auth.uid(), oi.id, p_rating, p_title, p_body, v_name) returning id into v_id;
  return v_id;
end $$;
