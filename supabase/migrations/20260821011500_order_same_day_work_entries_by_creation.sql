-- Keep the filter/count phase narrow. The previous function hydrated every
-- matching work entry (large text, financial masking and related lookups)
-- before applying LIMIT, even when the screen only requested 100 rows.
create or replace function public.search_work_entries(
  p_page integer default 1,p_page_size integer default 25,p_search text default null,p_year integer default null,
  p_professional_id uuid default null,p_billing_entity_id uuid default null,p_invoiced boolean default null,
  p_paid boolean default null,p_archive text default null,p_review_only boolean default false,
  p_missing_price boolean default false,p_client_type text default null,p_client_id uuid default null,
  p_missing_society boolean default false,p_sort text default 'work_date',p_direction text default 'desc'
) returns jsonb language sql stable security definer set search_path='' as $$
with memberships as materialized(
 select fm.firm_id,bool_or(fm.role in('owner','admin','operator')) privileged
 from public.firm_members fm
 where fm.user_id=(select auth.uid()) and fm.active
   and private.has_completed_pin_setup((select auth.uid()))
 group by fm.firm_id
), filtered as materialized(
 select w.id,w.work_date,w.created_at,w.effective_amount,c.display_name client_sort
 from public.work_entries w
 join memberships membership on membership.firm_id=w.firm_id
 join public.clients c on c.id=w.client_id
 where (membership.privileged or private.has_scope_access(w.firm_id,w.billing_entity_id,w.client_id,w.matter_id,'view'))
  and(p_search is null or btrim(p_search)='' or w.activity_description ilike '%'||p_search||'%'
   or coalesce(w.observations,'') ilike '%'||p_search||'%'
   or c.display_name ilike '%'||p_search||'%' or c.client_code ilike '%'||p_search||'%')
  and(p_year is null or w.work_date>=make_date(p_year,1,1) and w.work_date<make_date(p_year+1,1,1))
  and(p_professional_id is null or w.professional_id=p_professional_id)
  and(p_billing_entity_id is null or w.billing_entity_id=p_billing_entity_id)
  and(p_invoiced is null or w.is_invoiced=p_invoiced)
  and(p_paid is null or w.is_paid=p_paid)
  and(p_archive is null or w.archive_status=p_archive)
  and(not p_missing_price or w.effective_hourly_rate is null)
  and(p_client_type is null or exists(select 1 from public.client_profiles cp where cp.id=w.client_profile_id and cp.client_type=p_client_type and cp.active))
  and(p_client_id is null or w.client_id=p_client_id)
  and(not p_missing_society or w.billing_entity_id is null)
  and(not p_review_only or w.has_historical_state_exception or(w.is_invoiced and w.invoice_date is null))
), ranked as materialized(
 select f.*,row_number() over(order by
  case when p_sort='work_date' and p_direction='asc' then f.work_date end asc,
  case when p_sort='work_date' and p_direction='desc' then f.work_date end desc,
  case when p_sort='client' and p_direction='asc' then f.client_sort end asc,
  case when p_sort='client' and p_direction='desc' then f.client_sort end desc,
  case when p_sort='amount' and p_direction='asc' then f.effective_amount end asc,
  case when p_sort='amount' and p_direction='desc' then f.effective_amount end desc,
  f.work_date desc,f.created_at desc,f.id
 ) page_position
 from filtered f
), paged as materialized(
 select r.id,r.page_position
 from ranked r
 where r.page_position>(greatest(p_page,1)-1)*least(greatest(p_page_size,10),10000)
   and r.page_position<=greatest(p_page,1)*least(greatest(p_page_size,10),10000)
), items as(
 select p.page_position,w.id,w.work_date,w.created_at,w.activity_description,w.duration_minutes,
  case when membership.privileged then w.effective_hourly_rate else private.visible_financial_value(w.firm_id,w.billing_entity_id,w.effective_hourly_rate) end effective_hourly_rate,
  case when membership.privileged then w.effective_amount else private.visible_financial_value(w.firm_id,w.billing_entity_id,w.effective_amount) end effective_amount,
  w.status,w.is_invoiced,w.invoice_date,w.is_paid,w.archive_status,w.observations,w.source_type,w.has_manual_override,
  w.has_historical_state_exception,c.display_name client_name,c.client_code,
  professional.display_name professional_name,billing.name billing_entity_name,
  invoice.invoice_number,coalesce(import_row.validation_warnings,'[]'::jsonb) validation_warnings
 from paged p
 join public.work_entries w on w.id=p.id
 join memberships membership on membership.firm_id=w.firm_id
 join public.clients c on c.id=w.client_id
 join public.professionals professional on professional.id=w.professional_id
 left join public.billing_entities billing on billing.id=w.billing_entity_id
 left join public.import_rows import_row on import_row.id=w.import_row_id
 left join lateral(
  select i.invoice_number from public.invoice_lines il join public.invoices i on i.id=il.invoice_id
  where il.work_entry_id=w.id order by i.invoice_date desc,i.id limit 1
 )invoice on true
)
select jsonb_build_object(
 'items',coalesce((select jsonb_agg(to_jsonb(items)-'page_position' order by page_position) from items),'[]'::jsonb),
 'total',(select count(*) from filtered),
 'page',greatest(p_page,1),
 'pageSize',least(greatest(p_page_size,10),10000),
 'professionals',case when greatest(p_page,1)=1 then(
  select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'label',p.display_name) order by p.display_name),'[]'::jsonb)
  from public.professionals p join memberships m on m.firm_id=p.firm_id where p.active
 )else'[]'::jsonb end,
 'billingEntities',case when greatest(p_page,1)=1 then(
  select coalesce(jsonb_agg(jsonb_build_object('id',b.id,'label',b.name) order by b.name),'[]'::jsonb)
  from public.billing_entities b join memberships m on m.firm_id=b.firm_id where b.active
 )else'[]'::jsonb end
);
$$;

revoke all on function public.search_work_entries(integer,integer,text,integer,uuid,uuid,boolean,boolean,text,boolean,boolean,text,uuid,boolean,text,text) from public,anon;
grant execute on function public.search_work_entries(integer,integer,text,integer,uuid,uuid,boolean,boolean,text,boolean,boolean,text,uuid,boolean,text,text) to authenticated;

notify pgrst,'reload schema';
