create extension if not exists "pgcrypto";

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  artist text not null,
  title text not null,
  album text not null,
  description text not null default '',
  year integer,
  genre text not null default '',
  price numeric(12, 2) not null default 0,
  currency text not null default 'ARS',
  status text not null default 'draft',
  media_condition text not null default 'VG+',
  sleeve_condition text not null default 'VG+',
  stock integer not null default 1,
  is_new boolean not null default false,
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint products_currency_check
    check (currency in ('ARS', 'USD')),

  constraint products_status_check
    check (status in ('published', 'reserved', 'sold', 'draft')),

  constraint products_media_condition_check
    check (media_condition in ('M', 'NM', 'EX', 'VG+', 'VG', 'G')),

  constraint products_sleeve_condition_check
    check (sleeve_condition in ('M', 'NM', 'EX', 'VG+', 'VG', 'G')),

  constraint products_stock_check
    check (stock >= 0),

  constraint products_price_check
    check (price >= 0),

  constraint products_year_check
    check (year is null or year between 1900 and extract(year from now())::integer + 1),

  constraint products_description_length_check
    check (char_length(description) <= 600)
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null unique,
  alt_text text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),

  constraint product_images_sort_order_check
    check (sort_order >= 0)
);

create table public.product_identifiers (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  type text not null,
  value text not null,
  description text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),

  constraint product_identifiers_type_check
    check (type in ('matrix_runout', 'catalog_number', 'barcode', 'isrc', 'other')),

  constraint product_identifiers_value_not_blank_check
    check (length(trim(value)) > 0),

  constraint product_identifiers_sort_order_check
    check (sort_order >= 0)
);

create index products_status_idx
  on public.products(status);

create index products_slug_idx
  on public.products(slug);

create index products_artist_title_idx
  on public.products(artist, title);

create index product_images_product_id_sort_order_idx
  on public.product_images(product_id, sort_order);

create index product_identifiers_product_id_sort_order_idx
  on public.product_identifiers(product_id, sort_order);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger products_set_updated_at
before update on public.products
for each row
execute function public.set_updated_at();

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_identifiers enable row level security;

create policy "Anyone can read published products"
on public.products
for select
to anon, authenticated
using (status = 'published' or auth.role() = 'authenticated');

create policy "Authenticated users can insert products"
on public.products
for insert
to authenticated
with check (true);

create policy "Authenticated users can update products"
on public.products
for update
to authenticated
using (true)
with check (true);

create policy "Authenticated users can delete products"
on public.products
for delete
to authenticated
using (true);

create policy "Anyone can read images for published products"
on public.product_images
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.products
    where products.id = product_images.product_id
      and (products.status = 'published' or auth.role() = 'authenticated')
  )
);

create policy "Authenticated users can insert product images"
on public.product_images
for insert
to authenticated
with check (true);

create policy "Authenticated users can update product images"
on public.product_images
for update
to authenticated
using (true)
with check (true);

create policy "Authenticated users can delete product images"
on public.product_images
for delete
to authenticated
using (true);

create policy "Anyone can read identifiers for published products"
on public.product_identifiers
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.products
    where products.id = product_identifiers.product_id
      and (products.status = 'published' or auth.role() = 'authenticated')
  )
);

create policy "Authenticated users can insert product identifiers"
on public.product_identifiers
for insert
to authenticated
with check (true);

create policy "Authenticated users can update product identifiers"
on public.product_identifiers
for update
to authenticated
using (true)
with check (true);

create policy "Authenticated users can delete product identifiers"
on public.product_identifiers
for delete
to authenticated
using (true);

create policy "Anyone can read product image files"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'product-images');

create policy "Authenticated users can upload product image files"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'product-images');

create policy "Authenticated users can update product image files"
on storage.objects
for update
to authenticated
using (bucket_id = 'product-images')
with check (bucket_id = 'product-images');

create policy "Authenticated users can delete product image files"
on storage.objects
for delete
to authenticated
using (bucket_id = 'product-images');