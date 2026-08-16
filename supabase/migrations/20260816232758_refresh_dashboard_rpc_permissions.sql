revoke all on function public.get_entity_dashboard_rolling(text,uuid) from public,anon;
grant execute on function public.get_entity_dashboard_rolling(text,uuid) to authenticated,service_role;

revoke all on function public.search_work_entries(integer,integer,text,integer,uuid,uuid,boolean,boolean,text,boolean,text,text) from public,anon;
grant execute on function public.search_work_entries(integer,integer,text,integer,uuid,uuid,boolean,boolean,text,boolean,text,text) to authenticated,service_role;

notify pgrst,'reload schema';
