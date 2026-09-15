begin;

alter table public.homepage_content
  add column trust_items jsonb not null default '["Stock real por unidad","Pedido por WhatsApp","Usados clasificados","Listo para escalar a backend"]'::jsonb
    check (jsonb_typeof(trust_items) = 'array' and jsonb_array_length(trust_items) <= 8),
  add column trust_strip_visible boolean not null default true,
  add column info_eyebrow text not null default 'Estado del producto'
    check (length(trim(info_eyebrow)) between 1 and 120),
  add column info_heading text not null default 'Disco y tapa se informan por separado.'
    check (length(trim(info_heading)) between 1 and 180),
  add column info_body text not null default 'El esqueleto ya contempla una escala simple para usados: M, NM, EX, VG+, VG y G. En la proxima etapa se puede agregar una pagina dedicada con criterios de clasificacion, limpieza, prueba de escucha y garantia.'
    check (length(info_body) <= 3000),
  add column info_section_visible boolean not null default true;

create or replace function public.save_homepage(expected_updated_at timestamptz, content jsonb, sections jsonb)
returns public.homepage_content
language plpgsql security invoker set search_path = public as $$
declare
  current_content public.homepage_content;
  saved_content public.homepage_content;
  action jsonb;
  trust_item jsonb;
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
  if jsonb_typeof(content->'trust_items') is distinct from 'array' or jsonb_array_length(content->'trust_items') > 8 then
    raise exception 'La información de compra admite hasta 8 textos.' using errcode = '23514';
  end if;
  for trust_item in select value from jsonb_array_elements(content->'trust_items') loop
    if jsonb_typeof(trust_item) <> 'string' or length(trim(trust_item #>> '{}')) not between 1 and 120 then
      raise exception 'Cada texto de información de compra debe tener entre 1 y 120 caracteres.' using errcode = '23514';
    end if;
  end loop;
  if length(trim(coalesce(content->>'info_eyebrow',''))) not between 1 and 120 or
     length(trim(coalesce(content->>'info_heading',''))) not between 1 and 180 or
     length(coalesce(content->>'info_body','')) > 3000 then
    raise exception 'Revisá los textos de la sección de estado del producto.' using errcode = '23514';
  end if;
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
    hero_image_alt = trim(coalesce(content->>'hero_image_alt','')), actions = content->'actions',
    trust_items = content->'trust_items', trust_strip_visible = coalesce((content->>'trust_strip_visible')::boolean, true),
    info_eyebrow = trim(content->>'info_eyebrow'), info_heading = trim(content->>'info_heading'),
    info_body = coalesce(content->>'info_body',''), info_section_visible = coalesce((content->>'info_section_visible')::boolean, true)
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

notify pgrst, 'reload schema';
commit;
