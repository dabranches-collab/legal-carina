revoke all on function public.get_dashboard_overview() from public,anon;
grant execute on function public.get_dashboard_overview() to authenticated,service_role;

revoke all on function public.search_work_entries(integer,integer,text,integer,uuid,uuid,boolean,boolean,text,boolean,boolean,text,uuid,boolean,text,text) from public,anon;
grant execute on function public.search_work_entries(integer,integer,text,integer,uuid,uuid,boolean,boolean,text,boolean,boolean,text,uuid,boolean,text,text) to authenticated,service_role;

create or replace function public.get_my_access_status()
returns table(active boolean,must_change_pin boolean)
language sql stable security definer set search_path=''
as $$
 select
  exists(select 1 from public.firm_members membership where membership.user_id=(select auth.uid()) and membership.active)
  and exists(select 1 from public.user_login_credentials credential where credential.user_id=(select auth.uid())) as active,
  coalesce((select bool_or(credential.must_change_pin) from public.user_login_credentials credential where credential.user_id=(select auth.uid())),false) as must_change_pin;
$$;

revoke all on function public.get_my_access_status() from public,anon;
grant execute on function public.get_my_access_status() to authenticated,service_role;

notify pgrst,'reload schema';
