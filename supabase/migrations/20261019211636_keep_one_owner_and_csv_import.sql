
create or replace function app_private.keep_one_owner() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (tg_op = 'DELETE' and old.role = 'owner' and old.is_active)
     or (tg_op = 'UPDATE' and old.role = 'owner' and old.is_active and (new.role <> 'owner' or not new.is_active)) then
    if not exists (select 1 from public.staff_members where role = 'owner' and is_active and user_id <> old.user_id) then
      raise exception 'VALIDATION_FAILED: at least one active owner must remain';
    end if;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;
create trigger trg_keep_one_owner before update or delete on public.staff_members for each row execute function app_private.keep_one_owner();

-- Bulk product upsert by SKU; stock changes are ledgered. rows: [{sku,name_en,name_ne,description_en,description_ne,price_paisa,discount_price_paisa,stock_quantity,category_slug}]
create or replace function public.import_products(p_rows jsonb) returns jsonb language plpgsql security definer set search_path = '' as $$
declare r jsonb; v_id uuid; v_old int; v_new int; n_ok int := 0; errs jsonb := '[]'::jsonb; i int := 0; v_cat uuid; v_slug text;
begin
  if not app_private.has_permission('csv.manage') then raise exception 'FORBIDDEN'; end if;
  for r in select * from jsonb_array_elements(p_rows) loop
    i := i + 1;
    begin
      v_cat := null;
      if nullif(r->>'category_slug','') is not null then select id into v_cat from public.categories where slug = r->>'category_slug'; end if;
      select id, stock_quantity into v_id, v_old from public.products where sku = r->>'sku' and nullif(r->>'sku','') is not null;
      v_new := coalesce(nullif(r->>'stock_quantity','')::int, 0);
      if v_id is null then
        v_slug := regexp_replace(lower(coalesce(r->>'name_en','item')), '[^a-z0-9]+', '-', 'g');
        v_slug := trim(both '-' from v_slug) || '-' || substr(md5(random()::text), 1, 4);
        insert into public.products (slug, sku, name_en, name_ne, description_en, description_ne, price_paisa, discount_price_paisa, stock_quantity, category_id, status)
          values (v_slug, nullif(r->>'sku',''), r->>'name_en', nullif(r->>'name_ne',''), nullif(r->>'description_en',''), nullif(r->>'description_ne',''),
                  (r->>'price_paisa')::bigint, nullif(r->>'discount_price_paisa','')::bigint, v_new, v_cat, 'draft') returning id into v_id;
        if v_new > 0 then insert into public.stock_movements (product_id, delta_stock, delta_reserved, reason, actor_id, note) values (v_id, v_new, 0, 'csv_import', auth.uid(), 'new'); end if;
      else
        update public.products set name_en = r->>'name_en', name_ne = nullif(r->>'name_ne',''), description_en = nullif(r->>'description_en',''), description_ne = nullif(r->>'description_ne',''),
          price_paisa = (r->>'price_paisa')::bigint, discount_price_paisa = nullif(r->>'discount_price_paisa','')::bigint, category_id = coalesce(v_cat, category_id),
          stock_quantity = v_new where id = v_id;
        if v_new <> v_old then insert into public.stock_movements (product_id, delta_stock, delta_reserved, reason, actor_id, note) values (v_id, v_new - v_old, 0, 'csv_import', auth.uid(), 'update'); end if;
      end if;
      n_ok := n_ok + 1;
    exception when others then
      errs := errs || jsonb_build_object('row', i + 1, 'error', sqlerrm);
    end;
  end loop;
  insert into public.audit_logs (actor_type, actor_id, action, entity_type, after) values ('staff', auth.uid(), 'csv.import_products', 'product', jsonb_build_object('ok', n_ok, 'errors', jsonb_array_length(errs)));
  return jsonb_build_object('processed', n_ok, 'errors', errs);
end $$;
revoke execute on function public.import_products(jsonb) from public, anon; grant execute on function public.import_products(jsonb) to authenticated;
