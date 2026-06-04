
-- Fix search_path on tg_set_updated_at
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql security invoker set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;

-- handle_new_user is only used by trigger; revoke from clients
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- has_role is used by RLS; revoke from anon (signed-in users still need it for policy eval)
revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
