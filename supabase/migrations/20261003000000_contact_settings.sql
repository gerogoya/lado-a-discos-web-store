begin;

create table public.contact_settings (
  id boolean primary key default true check (id),
  heading text not null default 'Encontrá tu próximo disco.' check (length(trim(heading)) between 1 and 120),
  address text not null default 'San Martín 845, W3400APT Corrientes, Argentina' check (length(trim(address)) between 1 and 300),
  attendance text not null default 'Punto de retiro con coordinación previa.' check (length(trim(attendance)) between 1 and 600),
  hours text not null default '' check (length(hours) <= 600),
  whatsapp text not null default '5493795762457' check (whatsapp ~ '^[1-9][0-9]{7,14}$'),
  email text not null default '' check (length(email) <= 254 and (email = '' or email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')),
  map_query text not null default '' check (length(map_query) <= 300),
  map_visible boolean not null default true,
  socials jsonb not null default '[{"id":"instagram","label":"Instagram","url":"https://www.instagram.com/discosladoa/","visible":true}]'::jsonb,
  updated_at timestamptz not null default now()
);

-- Validate direct writes too, not only writes through the editor's RPC.
create function public.validate_contact_socials() returns trigger
language plpgsql set search_path = '' as $$
declare social jsonb;
begin
  if jsonb_typeof(new.socials) is distinct from 'array' or jsonb_array_length(new.socials) > 20 then
    raise exception 'La lista admite hasta 20 redes sociales.' using errcode = '23514';
  end if;
  for social in select value from jsonb_array_elements(new.socials) loop
    if jsonb_typeof(social) is distinct from 'object' or
       jsonb_typeof(social->'id') is distinct from 'string' or
       length(trim(coalesce(social->>'id',''))) not between 1 and 80 or
       jsonb_typeof(social->'label') is distinct from 'string' or
       length(trim(coalesce(social->>'label',''))) not between 1 and 50 or
       jsonb_typeof(social->'url') is distinct from 'string' or
       length(coalesce(social->>'url','')) > 500 or
       coalesce(social->>'url','') !~ '^https://[^/[:space:]@\\?#]+([/?#][^[:space:]\\]*)?$' or
       jsonb_typeof(social->'visible') is distinct from 'boolean' then
      raise exception 'Cada red necesita nombre, enlace https:// válido y visibilidad.' using errcode = '23514';
    end if;
  end loop;
  if (select count(*) <> count(distinct value->>'id') from jsonb_array_elements(new.socials)) then
    raise exception 'Las redes deben tener identificadores únicos.' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger contact_validate before insert or update on public.contact_settings
for each row execute function public.validate_contact_socials();
create trigger contact_updated_at before update on public.contact_settings
for each row execute function public.set_updated_at();

insert into public.contact_settings (id) values (true);
alter table public.contact_settings enable row level security;
create policy "Read contact settings" on public.contact_settings for select to anon, authenticated using (true);
create policy "Admins update contact settings" on public.contact_settings for update to authenticated
using (public.is_admin()) with check (public.is_admin());
grant select on public.contact_settings to anon, authenticated;
grant update on public.contact_settings to authenticated;
grant all on public.contact_settings to service_role;

create function public.save_contact(expected_updated_at timestamptz, content jsonb)
returns public.contact_settings language plpgsql security invoker set search_path = '' as $$
declare current_contact public.contact_settings; saved public.contact_settings;
begin
  if not public.is_admin() then
    raise exception 'No tenés permiso para editar el contacto.' using errcode = '42501';
  end if;
  select * into current_contact from public.contact_settings where id = true for update;
  if expected_updated_at is null or current_contact.updated_at is distinct from expected_updated_at then
    raise exception 'El contacto cambió en otra sesión. Recargá los datos antes de guardar.' using errcode = '40001';
  end if;
  update public.contact_settings set
    heading = trim(content->>'heading'), address = trim(content->>'address'),
    attendance = trim(content->>'attendance'), hours = coalesce(content->>'hours',''),
    whatsapp = content->>'whatsapp', email = coalesce(content->>'email',''),
    map_query = coalesce(content->>'map_query',''), map_visible = (content->>'map_visible')::boolean,
    socials = content->'socials'
  where id = true returning * into saved;
  return saved;
end;
$$;
revoke all on function public.save_contact(timestamptz, jsonb) from public, anon;
grant execute on function public.save_contact(timestamptz, jsonb) to authenticated;
notify pgrst, 'reload schema';
commit;
