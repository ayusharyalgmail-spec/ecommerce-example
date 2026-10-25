-- Fix product_images tenant_id isolation for myshop and all other stores
-- This ensures RLS restrictive policy tenant_scope matches the store being browsed.

update public.product_images pi
set tenant_id = p.tenant_id
from public.products p
where p.id = pi.product_id
  and pi.tenant_id is distinct from p.tenant_id;

-- Ensure public anonymous visitors and logged-in customers can read product_images
grant select on public.product_images to anon, authenticated;
