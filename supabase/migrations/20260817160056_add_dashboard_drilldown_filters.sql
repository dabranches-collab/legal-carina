drop function if exists public.search_work_entries(integer,integer,text,integer,uuid,uuid,boolean,boolean,text,boolean,text,text);
drop function if exists public.search_work_entries(integer,integer,text,integer,uuid,uuid,boolean,boolean,text,boolean,boolean,text,uuid,text,text);
drop function if exists public.search_work_entries(integer,integer,text,integer,uuid,uuid,boolean,boolean,text,boolean,boolean,text,uuid,boolean,text,text);

create function public.search_work_entries(
  p_page integer default 1,p_page_size integer default 25,p_search text default null,p_year integer default null,
  p_professional_id uuid default null,p_billing_entity_id uuid default null,p_invoiced boolean default null,
  p_paid boolean default null,p_archive text default null,p_review_only boolean default false,
  p_missing_price boolean default false,p_client_type text default null,p_client_id uuid default null,p_missing_society boolean default false,p_sort text default 'work_date',p_direction text default 'desc'
) returns jsonb language sql stable security invoker set search_path='' as $$
with filtered as materialized (
 select w.id,w.work_date,w.activity_description,w.duration_minutes,w.effective_hourly_rate,w.effective_amount,w.is_invoiced,
  w.invoice_date,w.is_paid,w.archive_status,w.observations,w.source_type,w.has_manual_override,w.has_historical_state_exception,
  w.client_id,w.professional_id,w.billing_entity_id,w.import_row_id
 from public.work_entries w
 where (p_search is null or btrim(p_search)='' or w.activity_description ilike '%'||p_search||'%' or coalesce(w.observations,'') ilike '%'||p_search||'%'
   or exists(select 1 from public.clients sc where sc.id=w.client_id and(sc.display_name ilike '%'||p_search||'%' or sc.client_code ilike '%'||p_search||'%')))
  and(p_year is null or w.work_date>=make_date(p_year,1,1) and w.work_date<make_date(p_year+1,1,1))
  and(p_professional_id is null or w.professional_id=p_professional_id)
  and(p_billing_entity_id is null or w.billing_entity_id=p_billing_entity_id)
  and(p_invoiced is null or w.is_invoiced=p_invoiced) and(p_paid is null or w.is_paid=p_paid)
  and(p_archive is null or w.archive_status=p_archive) and(not p_missing_price or w.effective_hourly_rate is null)
  and(p_client_type is null or exists(select 1 from public.client_profiles cp where cp.id=w.client_profile_id and cp.client_type=p_client_type))
  and(p_client_id is null or w.client_id=p_client_id)
  and(not p_missing_society or w.billing_entity_id is null)
  and(not p_review_only or w.has_historical_state_exception or exists(select 1 from public.import_rows rr where rr.id=w.import_row_id and jsonb_array_length(coalesce(rr.validation_warnings,'[]'::jsonb))>0))
), paged as (
 select f.* from filtered f order by
  case when p_sort='work_date' and p_direction='asc' then f.work_date end asc,
  case when p_sort='work_date' and p_direction='desc' then f.work_date end desc,
  case when p_sort='client' and p_direction='asc' then(select c.display_name from public.clients c where c.id=f.client_id)end asc,
  case when p_sort='client' and p_direction='desc' then(select c.display_name from public.clients c where c.id=f.client_id)end desc,
  case when p_sort='amount' and p_direction='asc' then f.effective_amount end asc,
  case when p_sort='amount' and p_direction='desc' then f.effective_amount end desc,f.work_date desc,f.id
 offset(greatest(p_page,1)-1)*least(greatest(p_page_size,10),10000) limit least(greatest(p_page_size,10),10000)
), items as (
 select p.id,p.work_date,p.activity_description,p.duration_minutes,p.effective_hourly_rate,p.effective_amount,p.is_invoiced,
  p.invoice_date,p.is_paid,p.archive_status,p.observations,p.source_type,p.has_manual_override,p.has_historical_state_exception,
  c.display_name client_name,c.client_code,professional.display_name professional_name,billing.name billing_entity_name,invoice.invoice_number,
  coalesce(import_row.validation_warnings,'[]'::jsonb) validation_warnings
 from paged p join public.clients c on c.id=p.client_id join public.professionals professional on professional.id=p.professional_id
 left join public.billing_entities billing on billing.id=p.billing_entity_id left join public.import_rows import_row on import_row.id=p.import_row_id
 left join public.invoice_lines invoice_line on invoice_line.work_entry_id=p.id left join public.invoices invoice on invoice.id=invoice_line.invoice_id
)
select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(items)) from items),'[]'::jsonb),'total',(select count(*) from filtered),
 'page',greatest(p_page,1),'pageSize',least(greatest(p_page_size,10),10000),
 'professionals',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'label',display_name)order by display_name),'[]'::jsonb)from public.professionals),
 'billingEntities',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'label',name)order by name),'[]'::jsonb)from public.billing_entities));
$$;

revoke all on function public.search_work_entries(integer,integer,text,integer,uuid,uuid,boolean,boolean,text,boolean,boolean,text,uuid,boolean,text,text) from public,anon;
grant execute on function public.search_work_entries(integer,integer,text,integer,uuid,uuid,boolean,boolean,text,boolean,boolean,text,uuid,boolean,text,text) to authenticated;

create or replace function public.get_entity_dashboard_rolling(p_kind text,p_entity_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare base jsonb;selected_id uuid;months jsonb;follow_up jsonb;
begin
 base:=public.get_entity_dashboard(p_kind,p_entity_id);selected_id:=nullif(base->>'selectedId','')::uuid;
 with entries as materialized(
  select w.work_date,w.is_invoiced,w.is_paid,w.effective_hourly_rate,
   private.visible_financial_value(w.firm_id,w.billing_entity_id,w.effective_amount)effective_amount
  from public.work_entries w where private.has_scope_access(w.firm_id,w.billing_entity_id,w.client_id,w.matter_id,'view')and
  ((p_kind='client'and w.client_id=selected_id)or(p_kind='billing'and w.billing_entity_id=selected_id)or(p_kind='professional'and w.professional_id=selected_id))
 ),latest as(select date_trunc('month',max(work_date))::date value from entries),calendar as(
  select generate_series((select value from latest)-interval'11 months',(select value from latest),interval'1 month')::date month_start where(select value from latest)is not null
 ),monthly as(
  select to_char(c.month_start,'YYYY-MM')label,coalesce(round(sum(e.effective_amount),2),0)value from calendar c left join entries e on e.work_date>=c.month_start and e.work_date<c.month_start+interval'1 month' group by c.month_start order by c.month_start
 ),tracking as(
  select count(*)filter(where not is_invoiced)uninvoiced_count,count(*)filter(where is_invoiced and not is_paid)unpaid_count,
   count(*)filter(where effective_hourly_rate is null)missing_price from entries
 )
 select coalesce((select jsonb_agg(to_jsonb(monthly))from monthly),'[]'::jsonb),
  (select jsonb_build_object('uninvoicedCount',uninvoiced_count,'unpaidCount',unpaid_count,'missingPrice',missing_price)from tracking)
 into months,follow_up;
 return jsonb_set(jsonb_set(base,'{monthly}',months,true),'{metrics}',coalesce(base->'metrics','{}'::jsonb)||follow_up,true);
end$$;

revoke all on function public.get_entity_dashboard_rolling(text,uuid) from public,anon;
grant execute on function public.get_entity_dashboard_rolling(text,uuid) to authenticated;

create or replace function public.get_client_category_dashboard(p_client_type text default null)
returns jsonb language sql stable security definer set search_path='' as $$
with mixed_clients as materialized(select cp.firm_id,cp.client_id from public.client_profiles cp where cp.active group by cp.firm_id,cp.client_id having count(distinct cp.client_type)>1),
entries as materialized(
 select w.work_date,w.created_at,w.activity_description,w.duration_minutes,w.is_invoiced,w.is_paid,w.client_id,w.professional_id,w.billing_entity_id,w.effective_hourly_rate,
  private.visible_financial_value(w.firm_id,w.billing_entity_id,w.effective_amount)effective_amount
 from public.work_entries w join public.client_profiles cp on cp.id=w.client_profile_id left join mixed_clients mc on mc.firm_id=cp.firm_id and mc.client_id=cp.client_id
 where private.has_scope_access(w.firm_id,w.billing_entity_id,w.client_id,w.matter_id,'view')and
 (p_client_type is null or(p_client_type in('individual','company')and cp.client_type=p_client_type)or(p_client_type='mixed'and mc.client_id is not null))
),latest_year as(select max(extract(year from work_date)::int)value from entries),
annual as(select extract(year from work_date)::int label,round(sum(effective_amount),2)value from entries group by 1 order by 1),
monthly as(select extract(month from work_date)::int label,round(sum(effective_amount),2)value from entries where extract(year from work_date)::int=(select value from latest_year)group by 1 order by 1),
recent as(select work_date,activity_description,duration_minutes,effective_amount from entries order by work_date desc,created_at desc limit 8),
totals as(select coalesce(sum(duration_minutes),0)minutes,sum(effective_amount)total,sum(effective_amount)filter(where is_invoiced)invoiced,
 sum(effective_amount)filter(where is_paid)paid,count(*)movements,count(distinct client_id)clients,count(distinct professional_id)professionals,
 count(distinct billing_entity_id)billing_entities,count(*)filter(where not is_invoiced)uninvoiced_count,
 count(*)filter(where is_invoiced and not is_paid)unpaid_count,count(*)filter(where effective_hourly_rate is null)missing_price from entries)
select jsonb_build_object('selectedId',coalesce(p_client_type,'all'),'options','[]'::jsonb,
 'identity',jsonb_build_object('title',case p_client_type when'individual'then'Particulares'when'company'then'Empresas'when'mixed'then'Clientes mistos'else'Todos os clientes'end,'subtitle',case p_client_type when'individual'then'Clientes particulares'when'company'then'Clientes empresariais'when'mixed'then'Clientes com vertente particular e empresa'else'Consolidado de particulares e empresas'end,'code',''),
 'metrics',jsonb_build_object('minutes',t.minutes,'total',t.total,'invoiced',t.invoiced,'paid',t.paid,'pending',case when t.invoiced is null then null else t.invoiced-coalesce(t.paid,0)end,
 'averageRate',case when t.minutes=0 or t.total is null then null else round(t.total*60/t.minutes,2)end,'movements',t.movements,'clients',t.clients,'professionals',t.professionals,
 'billingEntities',t.billing_entities,'uninvoicedCount',t.uninvoiced_count,'unpaidCount',t.unpaid_count,'missingPrice',t.missing_price),
 'annual',coalesce((select jsonb_agg(to_jsonb(annual))from annual),'[]'::jsonb),'monthly',coalesce((select jsonb_agg(to_jsonb(monthly))from monthly),'[]'::jsonb),
 'recent',coalesce((select jsonb_agg(to_jsonb(recent))from recent),'[]'::jsonb))from totals t where p_client_type is null or p_client_type in('individual','company','mixed');
$$;

revoke all on function public.get_client_category_dashboard(text) from public,anon;
grant execute on function public.get_client_category_dashboard(text) to authenticated;
