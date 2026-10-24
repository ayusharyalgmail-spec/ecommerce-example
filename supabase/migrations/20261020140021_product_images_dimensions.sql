alter table public.product_images
  add column if not exists width int check (width is null or width between 1 and 10000),
  add column if not exists height int check (height is null or height between 1 and 10000),
  add column if not exists blur_color text check (blur_color is null or blur_color ~ '^#[0-9a-fA-F]{6}$');