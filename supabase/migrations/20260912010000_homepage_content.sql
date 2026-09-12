begin;

create table public.homepage_content (
  id boolean primary key default true check (id),
  eyebrow text not null check (length(trim(eyebrow)) between 1 and 120),
  heading text not null check (length(trim(heading)) between 1 and 180),
  body text not null check (length(body) <= 2000),
  hero_image_storage_path text not null default '',
  hero_image_alt text not null default '' check (length(hero_image_alt) <= 180),
  actions jsonb not null check (jsonb_typeof(actions) = 'array' and jsonb_array_length(actions) = 2),
  updated_at timestamptz not null default now()
);

create table public.homepage_sections (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 1 and 180),
  body text not null default '' check (length(body) <= 5000),
  visible boolean not null default true,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.homepage_content (eyebrow, heading, body, actions) values (
  'Vinilos usados y nuevos · Argentina',
  'Discos con historia, fotos reales y estado informado.',
  'Catalogo inicial de LPs de 12 pulgadas. Cada pieza se publica con stock unitario, estado del disco, estado de tapa y pedido directo por WhatsApp.',
  '[{"id":"primary","label":"Ver catalogo","href":"#catalogo","visible":true},{"id":"secondary","label":"Como clasificamos","href":"#clasificacion","visible":true}]'::jsonb
);

alter table public.homepage_content enable row level security;
alter table public.homepage_sections enable row level security;
create policy "Read homepage content" on public.homepage_content for select to anon, authenticated using (true);
create policy "Manage homepage content" on public.homepage_content for all to authenticated using (true) with check (true);
create policy "Read visible homepage sections" on public.homepage_sections for select to anon using (visible);
create policy "Read all homepage sections" on public.homepage_sections for select to authenticated using (true);
create policy "Manage homepage sections" on public.homepage_sections for all to authenticated using (true) with check (true);
grant select on public.homepage_content to anon;
grant select on public.homepage_sections to anon;
grant select, insert, update, delete on public.homepage_content, public.homepage_sections to authenticated, service_role;

create trigger homepage_content_updated_at before update on public.homepage_content
for each row execute function public.set_updated_at();
create trigger homepage_sections_updated_at before update on public.homepage_sections
for each row execute function public.set_updated_at();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-assets', 'site-assets', true, 52428800, array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "Public site assets" on storage.objects for select to public using (bucket_id = 'site-assets');
create policy "Authenticated site asset uploads" on storage.objects for insert to authenticated
with check (bucket_id = 'site-assets' and (storage.foldername(name))[1] = 'homepage');
create policy "Authenticated site asset updates" on storage.objects for update to authenticated
using (bucket_id = 'site-assets' and (storage.foldername(name))[1] = 'homepage')
with check (bucket_id = 'site-assets' and (storage.foldername(name))[1] = 'homepage');
create policy "Authenticated site asset deletes" on storage.objects for delete to authenticated
using (bucket_id = 'site-assets' and (storage.foldername(name))[1] = 'homepage');

create function public.save_homepage(expected_updated_at timestamptz, content jsonb, sections jsonb)
returns public.homepage_content
language plpgsql security invoker set search_path = public as $$
declare
  current_content public.homepage_content;
  saved_content public.homepage_content;
  action jsonb;
  section jsonb;
  desired_ids uuid[];
begin
  if auth.role() <> 'authenticated' then
    raise exception 'Iniciá sesión para guardar la portada.' using errcode = '42501';
  end if;
  select * into current_content from public.homepage_content where id = true for update;
  if expected_updated_at is not null and current_content.updated_at <> expected_updated_at then
    raise exception 'La portada cambió en otra sesión. Recargá antes de guardar.' using errcode = '40001';
  end if;
  if jsonb_typeof(content->'actions') is distinct from 'array' or jsonb_array_length(content->'actions') <> 2 then
    raise exception 'La portada debe conservar sus dos botones.' using errcode = '23514';
  end if;
  for action in select value from jsonb_array_elements(content->'actions') loop
    if action->>'id' not in ('primary','secondary') or length(trim(action->>'label')) not between 1 and 80 or
       length(trim(action->>'href')) not between 1 and 500 then
      raise exception 'Revisá el texto y destino de los botones.' using errcode = '23514';
    end if;
  end loop;
  if jsonb_typeof(sections) is distinct from 'array' then
    raise exception 'La lista de secciones no es válida.' using errcode = '23514';
  end if;
  if coalesce(content->>'hero_image_storage_path','') <> '' and not exists (
    select 1 from storage.objects where bucket_id = 'site-assets' and name = content->>'hero_image_storage_path'
  ) then
    raise exception 'La imagen destacada no terminó de subir.' using errcode = '23514';
  end if;
  update public.homepage_content set
    eyebrow = trim(content->>'eyebrow'), heading = trim(content->>'heading'), body = coalesce(content->>'body',''),
    hero_image_storage_path = coalesce(content->>'hero_image_storage_path',''),
    hero_image_alt = trim(coalesce(content->>'hero_image_alt','')), actions = content->'actions'
  where id = true returning * into saved_content;

  select coalesce(array_agg((value->>'id')::uuid), array[]::uuid[]) into desired_ids
  from jsonb_array_elements(sections);
  delete from public.homepage_sections where not (id = any(desired_ids));
  for section in select value from jsonb_array_elements(sections) loop
    insert into public.homepage_sections (id, title, body, visible, sort_order)
    values ((section->>'id')::uuid, trim(section->>'title'), coalesce(section->>'body',''),
      coalesce((section->>'visible')::boolean, true), coalesce((section->>'sort_order')::integer, 0))
    on conflict (id) do update set title=excluded.title, body=excluded.body,
      visible=excluded.visible, sort_order=excluded.sort_order;
  end loop;
  return saved_content;
end;
$$;
revoke all on function public.save_homepage(timestamptz, jsonb, jsonb) from public, anon;
grant execute on function public.save_homepage(timestamptz, jsonb, jsonb) to authenticated;
notify pgrst, 'reload schema';
commit;
