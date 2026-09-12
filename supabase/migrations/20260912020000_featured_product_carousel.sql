begin;

alter table public.products
  add column featured_order integer check (featured_order between 0 and 4);

with ranked as (
  select id, row_number() over (order by created_at, id) - 1 as position
  from public.products
  where featured
)
update public.products p set
  featured = ranked.position < 5,
  featured_order = case when ranked.position < 5 then ranked.position else null end
from ranked where p.id = ranked.id;

create function public.guard_featured_products() returns trigger
language plpgsql set search_path = public as $$
begin
  perform pg_advisory_xact_lock(hashtext('homepage_featured_products'));
  if new.featured then
    if (select count(*) from public.products where featured and id <> new.id) >= 5 then
      raise exception 'Solo se pueden destacar hasta 5 discos.' using errcode = '23514';
    end if;
    if new.featured_order is null then
      select coalesce(max(featured_order), -1) + 1 into new.featured_order
      from public.products where featured and id <> new.id;
    end if;
  else
    new.featured_order := null;
  end if;
  return new;
end;
$$;

create trigger products_featured_limit
before insert or update of featured on public.products
for each row execute function public.guard_featured_products();

create index products_featured_order_idx on public.products(featured_order, created_at, id) where featured;
notify pgrst, 'reload schema';
commit;
