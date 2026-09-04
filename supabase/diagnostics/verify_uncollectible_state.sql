select p.proname, pg_get_function_identity_arguments(p.oid) arguments, p.proacl
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and p.proname in ('update_work_entry_collection_status','search_work_entries')
order by p.proname;

select count(*) filter (where status='uncollectible') as uncollectible_count
from public.work_entries;
