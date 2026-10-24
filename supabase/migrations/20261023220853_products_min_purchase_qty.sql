-- Minimum purchase quantity per product. Default 1 = no restriction (additive, no data changes).
alter table public.products
  add column if not exists min_purchase_qty integer not null default 1
  check (min_purchase_qty >= 1);

comment on column public.products.min_purchase_qty is
  'Minimum quantity a customer must buy in a single order. Enforced in the cart and at checkout.';
