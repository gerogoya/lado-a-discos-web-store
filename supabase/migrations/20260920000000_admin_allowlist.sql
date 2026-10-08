begin;

-- Administrative access is assigned explicitly instead of being granted to
-- every authenticated account. This first migration only creates the
-- allowlist; existing policies are tightened after the initial admin is added.
create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

-- Clients must not be able to enumerate or modify the allowlist directly.
-- The service role remains available for controlled administrative changes.
revoke all on table public.admin_users from public, anon, authenticated;
grant select, insert, delete on table public.admin_users to service_role;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;

comment on table public.admin_users is
  'Explicit allowlist for storefront administration. Managed only with trusted server credentials.';
comment on function public.is_admin() is
  'Returns true when the current authenticated user is in the administrative allowlist.';

notify pgrst, 'reload schema';
commit;
