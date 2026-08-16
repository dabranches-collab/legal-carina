-- Reparação isolada e não destrutiva dos read models usados pela versão 0.2.x.
create or replace function private.visible_financial_value(target_firm_id uuid,target_billing_entity_id uuid,target_value numeric)
returns numeric language sql stable security definer set search_path=''
as $$select case when private.can_view_billing_financials(target_firm_id,target_billing_entity_id) then target_value else null end$$;
revoke all on function private.visible_financial_value(uuid,uuid,numeric) from public,anon;
grant execute on function private.visible_financial_value(uuid,uuid,numeric) to authenticated;

create or replace function public.export_visible_work_entries(
 p_search text default null,p_year integer default null,p_professional_id uuid default null,p_billing_entity_id uuid default null,
 p_invoiced boolean default null,p_paid boolean default null,p_archive text default null,p_review_only boolean default false,
 p_sort text default 'work_date',p_direction text default 'desc'
)returns jsonb language sql stable security definer set search_path='' as $$
with filtered as materialized(
 select w.*,private.visible_financial_value(w.firm_id,w.billing_entity_id,w.effective_hourly_rate)visible_rate,
 private.visible_financial_value(w.firm_id,w.billing_entity_id,w.effective_amount)visible_amount
 from public.work_entries w where private.has_scope_access(w.firm_id,w.billing_entity_id,w.client_id,w.matter_id,'view')
 and(p_search is null or btrim(p_search)=''or w.activity_description ilike'%'||p_search||'%'or coalesce(w.observations,'')ilike'%'||p_search||'%'or exists(select 1 from public.clients c where c.id=w.client_id and(c.display_name ilike'%'||p_search||'%'or c.client_code ilike'%'||p_search||'%')))
 and(p_year is null or w.work_date>=make_date(p_year,1,1)and w.work_date<make_date(p_year+1,1,1))
 and(p_professional_id is null or w.professional_id=p_professional_id)and(p_billing_entity_id is null or w.billing_entity_id=p_billing_entity_id)
 and(p_invoiced is null or w.is_invoiced=p_invoiced)and(p_paid is null or w.is_paid=p_paid)and(p_archive is null or w.archive_status=p_archive)
 and(not p_review_only or w.has_historical_state_exception or exists(select 1 from public.import_rows ir where ir.id=w.import_row_id and jsonb_array_length(coalesce(ir.validation_warnings,'[]'::jsonb))>0))
),items as(
 select f.id,f.work_date,c.display_name client_name,c.client_code,m.matter_code,m.title matter_title,f.activity_description,p.display_name professional_name,
 f.duration_minutes,f.visible_rate effective_hourly_rate,f.visible_amount effective_amount,b.name billing_entity_name,f.is_invoiced,f.invoice_date,f.is_paid,
 f.archive_status,f.observations,f.source_type,f.has_manual_override,f.has_historical_state_exception,coalesce(ir.validation_warnings,'[]'::jsonb)validation_warnings
 from filtered f join public.clients c on c.id=f.client_id join public.professionals p on p.id=f.professional_id left join public.matters m on m.id=f.matter_id
 left join public.billing_entities b on b.id=f.billing_entity_id left join public.import_rows ir on ir.id=f.import_row_id
 order by case when p_sort='work_date'and p_direction='asc'then f.work_date end asc,case when p_sort='work_date'and p_direction='desc'then f.work_date end desc,
 case when p_sort='client'and p_direction='asc'then c.display_name end asc,case when p_sort='client'and p_direction='desc'then c.display_name end desc,
 case when p_sort='amount'and p_direction='asc'then f.visible_amount end asc nulls last,case when p_sort='amount'and p_direction='desc'then f.visible_amount end desc nulls last,f.work_date desc,f.id limit 10000
)select coalesce(jsonb_agg(to_jsonb(items)),'[]'::jsonb)from items$$;
revoke all on function public.export_visible_work_entries(text,integer,uuid,uuid,boolean,boolean,text,boolean,text,text) from public,anon;
grant execute on function public.export_visible_work_entries(text,integer,uuid,uuid,boolean,boolean,text,boolean,text,text) to authenticated;

create or replace function public.get_entity_dashboard_rolling(p_kind text,p_entity_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare base jsonb;selected_id uuid;months jsonb;
begin
 base:=public.get_entity_dashboard(p_kind,p_entity_id);selected_id:=nullif(base->>'selectedId','')::uuid;
 with entries as materialized(
  select w.work_date,private.visible_financial_value(w.firm_id,w.billing_entity_id,w.effective_amount)effective_amount
  from public.work_entries w where private.has_scope_access(w.firm_id,w.billing_entity_id,w.client_id,w.matter_id,'view')and
  ((p_kind='client'and w.client_id=selected_id)or(p_kind='billing'and w.billing_entity_id=selected_id)or(p_kind='professional'and w.professional_id=selected_id))
 ),latest as(select date_trunc('month',max(work_date))::date value from entries),calendar as(
  select generate_series((select value from latest)-interval'11 months',(select value from latest),interval'1 month')::date month_start where(select value from latest)is not null
 ),monthly as(
  select to_char(c.month_start,'YYYY-MM')label,coalesce(round(sum(e.effective_amount),2),0)value from calendar c left join entries e on e.work_date>=c.month_start and e.work_date<c.month_start+interval'1 month' group by c.month_start order by c.month_start
 )select coalesce(jsonb_agg(to_jsonb(monthly)),'[]'::jsonb)into months from monthly;
 return jsonb_set(base,'{monthly}',coalesce(months,'[]'::jsonb),true);
end$$;
revoke all on function public.get_entity_dashboard_rolling(text,uuid) from public,anon;
grant execute on function public.get_entity_dashboard_rolling(text,uuid) to authenticated;
notify pgrst,'reload schema';
