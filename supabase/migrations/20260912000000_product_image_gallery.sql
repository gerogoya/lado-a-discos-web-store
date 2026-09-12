begin;

create function public.limit_product_images() returns trigger
language plpgsql set search_path = public as $$
begin
  perform 1 from public.products where id = new.product_id for update;
  if (select count(*) from public.product_images where product_id = new.product_id and id <> new.id and storage_path <> new.storage_path) >= 5 then
    raise exception 'Cada disco admite hasta 5 imágenes.' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger product_images_limit before insert or update of product_id on public.product_images
for each row execute function public.limit_product_images();

create function public.save_product_gallery(target_product uuid, expected_paths text[], gallery jsonb)
returns setof public.product_images
language plpgsql security invoker set search_path = public as $$
declare
  actual_paths text[];
  desired_paths text[];
  entry jsonb;
begin
  if auth.role() <> 'authenticated' then
    raise exception 'Iniciá sesión para guardar imágenes.' using errcode = '42501';
  end if;
  perform 1 from public.products where id = target_product for update;
  if not found then raise exception 'El disco no existe.'; end if;
  if jsonb_typeof(gallery) is distinct from 'array' or jsonb_array_length(gallery) > 5 then
    raise exception 'Cada disco admite hasta 5 imágenes.' using errcode = '23514';
  end if;
  select coalesce(array_agg(storage_path order by sort_order, id), array[]::text[])
    into actual_paths from public.product_images where product_id = target_product;
  select coalesce(array_agg(value->>'storage_path' order by ord), array[]::text[])
    into desired_paths from jsonb_array_elements(gallery) with ordinality as items(value, ord);
  if cardinality(desired_paths) <> (select count(distinct x) from unnest(desired_paths) x) then
    raise exception 'La lista contiene imágenes repetidas o inválidas.' using errcode = '23514';
  end if;
  -- A retry after a lost response is safe if the desired list is already saved.
  if actual_paths <> coalesce(expected_paths, array[]::text[]) and actual_paths <> desired_paths then
    raise exception 'Las imágenes cambiaron en otra sesión. Recargá el disco antes de guardar.' using errcode = '40001';
  end if;
  for entry in select value from jsonb_array_elements(gallery) loop
    if not (entry->>'storage_path' = any(actual_paths)) then
      if left(entry->>'storage_path', 37) <> target_product::text || '/' or
        not exists (select 1 from storage.objects where bucket_id = 'product-images' and name = entry->>'storage_path') then
        raise exception 'La imagen no pertenece a este disco o no se terminó de subir.' using errcode = '23514';
      end if;
    end if;
  end loop;
  delete from public.product_images where product_id = target_product and not (storage_path = any(desired_paths));
  insert into public.product_images(product_id, storage_path, alt_text, sort_order)
    select target_product, value->>'storage_path', coalesce(value->>'alt_text',''), ord::integer - 1
    from jsonb_array_elements(gallery) with ordinality as items(value, ord)
    on conflict (storage_path) do update set sort_order = excluded.sort_order, alt_text = excluded.alt_text;
  return query select * from public.product_images where product_id = target_product order by sort_order, id;
end;
$$;
revoke all on function public.save_product_gallery(uuid, text[], jsonb) from public, anon;
grant execute on function public.save_product_gallery(uuid, text[], jsonb) to authenticated;
notify pgrst, 'reload schema';
commit;
