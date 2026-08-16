-- Expose only the current user's effective session status. This gives the UI
-- an authoritative backend check after refresh and passkey authentication.
create or replace function public.get_my_access_status()
returns table(active boolean,must_change_pin boolean)
language sql
stable
security definer
set search_path=''
as $$
  select
    exists(
      select 1 from public.firm_members membership
      where membership.user_id=(select auth.uid()) and membership.active
    ) and exists(
      select 1 from public.user_login_credentials credential
      where credential.user_id=(select auth.uid())
    ) as active,
    coalesce((
      select bool_or(credential.must_change_pin)
      from public.user_login_credentials credential
      where credential.user_id=(select auth.uid())
    ),false) as must_change_pin;
$$;

revoke all on function public.get_my_access_status() from public,anon;
grant execute on function public.get_my_access_status() to authenticated;

-- Security events are append-only through authenticated Edge Functions. An
-- earlier migration allowed direct client inserts; remove that residual path.
drop policy if exists security_events_insert_own on public.security_events;
revoke insert,update,delete,truncate on public.security_events from authenticated,anon;
