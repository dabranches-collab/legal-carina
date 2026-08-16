create or replace function public.export_visible_work_entries(
  p_search text default null,p_year integer default null,p_professional_id uuid default null,
  p_billing_entity_id uuid default null,p_invoiced boolean default null,p_paid boolean default null,
  p_archive text default null,p_review_only boolean default false,p_sort text default 'work_date',p_direction text default 'desc'
)
returns jsonb language sql stable security definer set search_path=''
as $$
with filtered as materialized(
 select w.id,w.work_date,w.activity_description,w.duration_minutes,
 private.visible_financial_value(w.firm_id,w.billing_entity_id,w.effective_hourly_rate)effective_hourly_rate,
 private.visible_financial_value(w.firm_id,w.billing_entity_id,w.effective_amount)effective_amount,
 w.is_invoiced,w.invoice_date,w.is_paid,w.archive_status,w.observations,w.source_type,w.has_manual_override,w.has_historical_state_exception,
 w.client_id,w.professional_id,w.billing_entity_id,w.matter_id,w.import_row_id
 from public.work_entries w where private.has_scope_access(w.firm_id,w.billing_entity_id,w.client_id,w.matter_id,'view')
 and(p_search is null or btrim(p_search)='' or w.activity_description ilike'%'||p_search||'%' or coalesce(w.observations,'')ilike'%'||p_search||'%' or exists(select 1 from public.clients c where c.id=w.client_id and(c.display_name ilike'%'||p_search||'%'or c.client_code ilike'%'||p_search||'%')))
 and(p_year is null or w.work_date>=make_date(p_year,1,1)and w.work_date<make_date(p_year+1,1,1))
 and(p_professional_id is null or w.professional_id=p_professional_id)and(p_billing_entity_id is null or w.billing_entity_id=p_billing_entity_id)
 and(p_invoiced is null or w.is_invoiced=p_invoiced)and(p_paid is null or w.is_paid=p_paid)and(p_archive is null or w.archive_status=p_archive)
 and(not p_review_only or w.has_historical_state_exception or exists(select 1 from public.import_rows ir where ir.id=w.import_row_id and jsonb_array_length(coalesce(ir.validation_warnings,'[]'::jsonb))>0))
),ordered as(
 select f.* from filtered f order by
 case when p_sort='work_date'and p_direction='asc'then f.work_date end asc,
 case when p_sort='work_date'and p_direction='desc'then f.work_date end desc,
 case when p_sort='client'and p_direction='asc'then(select c.display_name from public.clients c where c.id=f.client_id)end asc,
 case when p_sort='client'and p_direction='desc'then(select c.display_name from public.clients c where c.id=f.client_id)end desc,
 case when p_sort='amount'and p_direction='asc'then f.effective_amount end asc nulls last,
 case when p_sort='amount'and p_direction='desc'then f.effective_amount end desc nulls last,f.work_date desc,f.id limit 10000
),items as(
 select o.id,o.work_date,c.display_name client_name,c.client_code,m.matter_code,m.title matter_title,o.activity_description,p.display_name professional_name,
 o.duration_minutes,o.effective_hourly_rate,o.effective_amount,b.name billing_entity_name,o.is_invoiced,o.invoice_date,o.is_paid,
 o.archive_status,o.observations,o.source_type,o.has_manual_override,o.has_historical_state_exception,
 coalesce(ir.validation_warnings,'[]'::jsonb)validation_warnings
 from ordered o join public.clients c on c.id=o.client_id join public.professionals p on p.id=o.professional_id left join public.matters m on m.id=o.matter_id
 left join public.billing_entities b on b.id=o.billing_entity_id left join public.import_rows ir on ir.id=o.import_row_id
)select coalesce(jsonb_agg(to_jsonb(items)),'[]'::jsonb)from items;
$$;
revoke all on function public.export_visible_work_entries(text,integer,uuid,uuid,boolean,boolean,text,boolean,text,text) from public,anon;
grant execute on function public.export_visible_work_entries(text,integer,uuid,uuid,boolean,boolean,text,boolean,text,text) to authenticated;
