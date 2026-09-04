select schemaname, tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in ('work_entries','invoice_lines','invoices','clients','client_profiles','import_rows')
order by tablename, indexname;

select schemaname, tablename, policyname, roles, cmd, qual
from pg_policies
where schemaname = 'public' and tablename = 'work_entries'
order by policyname;

select pg_get_functiondef('public.search_work_entries(integer,integer,text,integer,uuid,uuid,boolean,boolean,text,boolean,boolean,text,uuid,boolean,text,text)'::regprocedure);

select calls,
       round(total_exec_time::numeric, 2) as total_ms,
       round(mean_exec_time::numeric, 2) as mean_ms,
       rows,
       left(query, 500) as query
from pg_stat_statements
where query ilike '%search_work_entries%'
order by total_exec_time desc
limit 10;

explain (analyze, buffers, settings, format text)
select w.id
from public.work_entries w
order by w.work_date desc, w.id
limit 50;

explain (analyze, buffers, settings, format text)
select count(*) from public.work_entries;
