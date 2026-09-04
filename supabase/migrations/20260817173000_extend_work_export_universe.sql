drop function if exists public.export_visible_work_entries(text,integer,uuid,uuid,boolean,boolean,text,boolean,text,text);

create function public.export_visible_work_entries(
 p_search text default null,p_year integer default null,p_professional_id uuid default null,p_billing_entity_id uuid default null,
 p_invoiced boolean default null,p_paid boolean default null,p_archive text default null,p_review_only boolean default false,
 p_missing_price boolean default false,p_client_type text default null,p_client_id uuid default null,p_missing_society boolean default false,
 p_sort text default 'work_date',p_direction text default 'desc'
) returns jsonb language sql stable security definer set search_path='' as $$
with filtered as materialized(
 select w.*,private.visible_financial_value(w.firm_id,w.billing_entity_id,w.effective_hourly_rate) visible_rate,
  private.visible_financial_value(w.firm_id,w.billing_entity_id,w.effective_amount) visible_amount
 from public.work_entries w
 where private.has_scope_access(w.firm_id,w.billing_entity_id,w.client_id,w.matter_id,'view')
  and(p_search is null or btrim(p_search)='' or w.activity_description ilike'%'||p_search||'%' or coalesce(w.observations,'')ilike'%'||p_search||'%'
   or exists(select 1 from public.clients c where c.id=w.client_id and(c.display_name ilike'%'||p_search||'%' or c.client_code ilike'%'||p_search||'%')))
  and(p_year is null or w.work_date>=make_date(p_year,1,1) and w.work_date<make_date(p_year+1,1,1))
  and(p_professional_id is null or w.professional_id=p_professional_id)
  and(p_billing_entity_id is null or w.billing_entity_id=p_billing_entity_id)
  and(p_invoiced is null or w.is_invoiced=p_invoiced) and(p_paid is null or w.is_paid=p_paid)
  and(p_archive is null or w.archive_status=p_archive) and(not p_missing_price or w.effective_hourly_rate is null)
  and(p_client_type is null or exists(select 1 from public.client_profiles cp where cp.id=w.client_profile_id and cp.client_type=p_client_type))
  and(p_client_id is null or w.client_id=p_client_id) and(not p_missing_society or w.billing_entity_id is null)
  and(not p_review_only or w.has_historical_state_exception or exists(select 1 from public.import_rows ir where ir.id=w.import_row_id and jsonb_array_length(coalesce(ir.validation_warnings,'[]'::jsonb))>0))
),items as(
 select f.id,f.work_date,c.display_name client_name,c.client_code,m.matter_code,m.title matter_title,f.activity_description,p.display_name professional_name,
  f.duration_minutes,f.visible_rate effective_hourly_rate,f.visible_amount effective_amount,b.name billing_entity_name,f.is_invoiced,invoice.invoice_number,
  f.invoice_date,f.is_paid,f.archive_status,f.observations,f.source_type,f.has_manual_override,f.has_historical_state_exception,
  coalesce(ir.validation_warnings,'[]'::jsonb)validation_warnings
 from filtered f join public.clients c on c.id=f.client_id join public.professionals p on p.id=f.professional_id
 left join public.matters m on m.id=f.matter_id left join public.billing_entities b on b.id=f.billing_entity_id
 left join public.import_rows ir on ir.id=f.import_row_id
 left join lateral(select i.invoice_number from public.invoice_lines il join public.invoices i on i.id=il.invoice_id where il.work_entry_id=f.id order by i.invoice_date desc nulls last,i.id limit 1)invoice on true
 order by case when p_sort='work_date'and p_direction='asc'then f.work_date end asc,case when p_sort='work_date'and p_direction='desc'then f.work_date end desc,
  case when p_sort='client'and p_direction='asc'then c.display_name end asc,case when p_sort='client'and p_direction='desc'then c.display_name end desc,
  case when p_sort='amount'and p_direction='asc'then f.visible_amount end asc nulls last,case when p_sort='amount'and p_direction='desc'then f.visible_amount end desc nulls last,
  f.work_date desc,f.id limit 100000
)select coalesce(jsonb_agg(to_jsonb(items)),'[]'::jsonb)from items$$;

revoke all on function public.export_visible_work_entries(text,integer,uuid,uuid,boolean,boolean,text,boolean,boolean,text,uuid,boolean,text,text) from public,anon;
grant execute on function public.export_visible_work_entries(text,integer,uuid,uuid,boolean,boolean,text,boolean,boolean,text,uuid,boolean,text,text) to authenticated;
notify pgrst,'reload schema';
