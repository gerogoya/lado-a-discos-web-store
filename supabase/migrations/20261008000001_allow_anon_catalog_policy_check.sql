begin;

-- The prior migration may already have been applied in an existing local
-- review database, so keep this compatibility migration for that path.
grant execute on function public.is_admin() to anon, authenticated, service_role;

notify pgrst, 'reload schema';
commit;
