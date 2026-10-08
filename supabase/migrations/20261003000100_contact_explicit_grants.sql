begin;
-- Supabase installations can inherit broad default table privileges.
-- Keep public contact reads, with updates restricted by the admin RLS policy.
revoke all on public.contact_settings from public, anon, authenticated;
grant select on public.contact_settings to anon, authenticated;
grant update on public.contact_settings to authenticated;
notify pgrst, 'reload schema';
commit;
