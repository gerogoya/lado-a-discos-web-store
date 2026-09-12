begin;

create or replace function public.guard_featured_products() returns trigger
language plpgsql set search_path = public as $$
begin
  perform pg_advisory_xact_lock(hashtext('homepage_featured_products'));
  if new.featured then
    if (select count(*) from public.products where featured and id <> new.id) >= 5 then
      raise exception 'Solo se pueden destacar hasta 5 discos.' using errcode = '23514';
    end if;
    if new.featured_order is null then
      select position into new.featured_order
      from generate_series(0, 4) as position
      where not exists (
        select 1 from public.products
        where featured and id <> new.id and featured_order = position
      )
      order by position
      limit 1;
    end if;
  else
    new.featured_order := null;
  end if;
  return new;
end;
$$;

notify pgrst, 'reload schema';
commit;
