begin;

create table public.catalog_options (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('genre','format','country','label','artist','sleeve_condition','media_condition')),
  name text not null check (length(trim(name)) between 1 and 120),
  normalized_name text generated always as (lower(regexp_replace(trim(name), '\s+', ' ', 'g'))) stored,
  active boolean not null default true,
  sort_order integer not null default 0,
  unique (kind, normalized_name)
);

alter table public.catalog_options enable row level security;
create policy "Read catalog options" on public.catalog_options for select to anon, authenticated using (true);
create policy "Manage catalog options" on public.catalog_options for all to authenticated using (true) with check (true);
grant select on public.catalog_options to anon;
grant select, insert, update, delete on public.catalog_options to authenticated, service_role;

alter table public.products
  add column country text not null default '',
  add column format text not null default '',
  add column label text not null default '',
  add column artist_id uuid references public.catalog_options(id) on delete restrict,
  add column genre_id uuid references public.catalog_options(id) on delete restrict,
  add column format_id uuid references public.catalog_options(id) on delete restrict,
  add column country_id uuid references public.catalog_options(id) on delete restrict,
  add column label_id uuid references public.catalog_options(id) on delete restrict,
  add column media_condition_id uuid references public.catalog_options(id) on delete restrict,
  add column sleeve_condition_id uuid references public.catalog_options(id) on delete restrict,
  add column needs_review boolean not null default false,
  drop constraint products_media_condition_check,
  drop constraint products_sleeve_condition_check,
  alter column media_condition set default '',
  alter column sleeve_condition set default '';

insert into public.catalog_options (kind, name, sort_order) values
 ('media_condition','NM',10), ('media_condition','EX',20), ('media_condition','VG+',30), ('media_condition','VG',40),
 ('sleeve_condition','EX',10), ('sleeve_condition','VG+',20), ('sleeve_condition','VG',30), ('sleeve_condition','G',40),
 ('format','LP',10), ('format','Single',20), ('format','EP',30), ('format','CD',40), ('format','Cassette',50),
 ('country','Argentina',0), ('country','Alemania',0), ('country','Australia',0), ('country','Bélgica',0),
 ('country','Brasil',0), ('country','Canadá',0), ('country','Chile',0), ('country','Colombia',0),
 ('country','España',0), ('country','Estados Unidos',0), ('country','Francia',0), ('country','Italia',0),
 ('country','Japón',0), ('country','México',0), ('country','Países Bajos',0), ('country','Perú',0),
 ('country','Portugal',0), ('country','Reino Unido',0), ('country','Suecia',0), ('country','Uruguay',0);

-- Keep legacy values and their IDs. Nothing here certifies prototype data as real.
insert into public.catalog_options (kind, name)
select distinct on (kind, lower(regexp_replace(trim(name), '\s+', ' ', 'g')))
  kind, trim(name)
from public.products p cross join lateral (values
  ('artist',p.artist), ('genre',p.genre), ('media_condition',p.media_condition), ('sleeve_condition',p.sleeve_condition)
) v(kind,name)
where trim(name) <> '' and lower(trim(name)) not in ('artista por completar','genero por completar','género por completar')
order by kind, lower(regexp_replace(trim(name), '\s+', ' ', 'g')), trim(name)
on conflict (kind, normalized_name) do nothing;

update public.products p set
 artist_id = (select id from public.catalog_options where kind='artist' and normalized_name=lower(regexp_replace(trim(p.artist), '\s+', ' ', 'g'))),
 genre_id = (select id from public.catalog_options where kind='genre' and normalized_name=lower(regexp_replace(trim(p.genre), '\s+', ' ', 'g'))),
 media_condition_id = (select id from public.catalog_options where kind='media_condition' and normalized_name=lower(regexp_replace(trim(p.media_condition), '\s+', ' ', 'g'))),
 sleeve_condition_id = (select id from public.catalog_options where kind='sleeve_condition' and normalized_name=lower(regexp_replace(trim(p.sleeve_condition), '\s+', ' ', 'g'))),
 needs_review = true;

create index products_artist_id_idx on public.products(artist_id);
create index products_genre_id_idx on public.products(genre_id);
create index products_format_id_idx on public.products(format_id);
create index products_country_id_idx on public.products(country_id);
create index products_label_id_idx on public.products(label_id);
create index products_media_condition_id_idx on public.products(media_condition_id);
create index products_sleeve_condition_id_idx on public.products(sleeve_condition_id);

-- Validate both category and activity; keep text columns for the existing storefront.
create function public.sync_product_catalog_options() returns trigger
language plpgsql set search_path = public as $$
declare
  k text;
  option_id uuid;
  previous_id uuid;
  chosen public.catalog_options;
  payload jsonb := to_jsonb(new);
begin
  foreach k in array array['artist','genre','format','country','label','media_condition','sleeve_condition'] loop
    option_id := (payload ->> (k || '_id'))::uuid;
    previous_id := case when tg_op = 'UPDATE' then (to_jsonb(old) ->> (k || '_id'))::uuid else null end;
    if option_id is not null then
      select * into chosen from public.catalog_options where id = option_id for share;
      if not found or chosen.kind <> k then
        raise exception 'La opción no corresponde al campo %.', k using errcode = '23514';
      end if;
      if not chosen.active and option_id is distinct from previous_id then
        raise exception 'La opción % está desactivada.', chosen.name using errcode = '23514';
      end if;
      payload := jsonb_set(payload, array[k], to_jsonb(chosen.name));
    elsif previous_id is not null then
      payload := jsonb_set(payload, array[k], '""'::jsonb);
    elsif coalesce(payload ->> k, '') <> '' and
      (tg_op = 'INSERT' or (payload ->> k) is distinct from (to_jsonb(old) ->> k)) then
      raise exception 'Seleccioná una opción válida para %.', k using errcode = '23514';
    end if;
  end loop;
  new := jsonb_populate_record(new, payload);
  return new;
end;
$$;
create trigger products_sync_catalog before insert or update on public.products
for each row execute function public.sync_product_catalog_options();

create function public.guard_catalog_option_kind() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.kind <> old.kind then
    raise exception 'No se puede cambiar el tipo de una opción.' using errcode = '23514';
  end if;
  new.name := regexp_replace(trim(new.name), '\s+', ' ', 'g');
  return new;
end;
$$;
create trigger catalog_options_guard before update on public.catalog_options
for each row execute function public.guard_catalog_option_kind();

create function public.rename_product_catalog_option() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.name is distinct from old.name then
    execute format('update public.products set %I = $1 where %I = $2', new.kind, new.kind || '_id') using new.name, new.id;
  end if;
  return new;
end;
$$;
create trigger catalog_options_rename after update on public.catalog_options
for each row execute function public.rename_product_catalog_option();

notify pgrst, 'reload schema';
commit;
