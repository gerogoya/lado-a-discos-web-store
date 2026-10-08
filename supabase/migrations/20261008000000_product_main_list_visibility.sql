begin;

-- RLS invokes this boolean helper for anonymous catalog visitors. It exposes
-- no allowlist data and returns false when there is no authenticated user.
grant execute on function public.is_admin() to anon, authenticated, service_role;

alter table public.products
  add column visible_in_main_list boolean not null default false;

-- Keep the current public catalog unchanged. Reserved and sold records must
-- be explicitly enabled by an administrator before becoming public.
update public.products
set visible_in_main_list = true
where status = 'published';

alter table public.products
  add constraint products_draft_not_visible_check
  check (status <> 'draft' or not visible_in_main_list);

create index products_public_catalog_idx
  on public.products(status, created_at desc, id)
  where visible_in_main_list;

drop policy if exists "Anyone can read published products" on public.products;
create policy "Anyone can read public catalog products"
on public.products
for select
to anon, authenticated
using (
  status = 'published'
  or (visible_in_main_list and status in ('reserved', 'sold'))
  or public.is_admin()
);

drop policy if exists "Anyone can read images for published products" on public.product_images;
create policy "Anyone can read images for public catalog products"
on public.product_images
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.products
    where products.id = product_images.product_id
      and (
        products.status = 'published'
        or (products.visible_in_main_list and products.status in ('reserved', 'sold'))
        or public.is_admin()
      )
  )
);

drop policy if exists "Anyone can read identifiers for published products" on public.product_identifiers;
create policy "Anyone can read identifiers for public catalog products"
on public.product_identifiers
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.products
    where products.id = product_identifiers.product_id
      and (
        products.status = 'published'
        or (products.visible_in_main_list and products.status in ('reserved', 'sold'))
        or public.is_admin()
      )
  )
);

-- Product administration follows the explicit allowlist introduced for the
-- admin area. An authenticated storefront customer must not gain write access.
drop policy if exists "Authenticated users can insert products" on public.products;
drop policy if exists "Authenticated users can update products" on public.products;
drop policy if exists "Authenticated users can delete products" on public.products;
create policy "Admins can insert products" on public.products for insert to authenticated with check (public.is_admin());
create policy "Admins can update products" on public.products for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins can delete products" on public.products for delete to authenticated using (public.is_admin());

drop policy if exists "Authenticated users can insert product images" on public.product_images;
drop policy if exists "Authenticated users can update product images" on public.product_images;
drop policy if exists "Authenticated users can delete product images" on public.product_images;
create policy "Admins can insert product images" on public.product_images for insert to authenticated with check (public.is_admin());
create policy "Admins can update product images" on public.product_images for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins can delete product images" on public.product_images for delete to authenticated using (public.is_admin());

drop policy if exists "Authenticated users can insert product identifiers" on public.product_identifiers;
drop policy if exists "Authenticated users can update product identifiers" on public.product_identifiers;
drop policy if exists "Authenticated users can delete product identifiers" on public.product_identifiers;
create policy "Admins can insert product identifiers" on public.product_identifiers for insert to authenticated with check (public.is_admin());
create policy "Admins can update product identifiers" on public.product_identifiers for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins can delete product identifiers" on public.product_identifiers for delete to authenticated using (public.is_admin());

drop policy if exists "Authenticated users can upload product image files" on storage.objects;
drop policy if exists "Authenticated users can update product image files" on storage.objects;
drop policy if exists "Authenticated users can delete product image files" on storage.objects;
create policy "Admins can upload product image files" on storage.objects for insert to authenticated
with check (bucket_id = 'product-images' and public.is_admin());
create policy "Admins can update product image files" on storage.objects for update to authenticated
using (bucket_id = 'product-images' and public.is_admin())
with check (bucket_id = 'product-images' and public.is_admin());
create policy "Admins can delete product image files" on storage.objects for delete to authenticated
using (bucket_id = 'product-images' and public.is_admin());

notify pgrst, 'reload schema';
commit;
