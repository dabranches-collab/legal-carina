create or replace function public.search_work_entries(
  p_page integer default 1,
  p_page_size integer default 25,
  p_search text default null,
  p_year integer default null,
  p_professional_id uuid default null,
  p_billing_entity_id uuid default null,
  p_invoiced boolean default null,
  p_paid boolean default null,
  p_archive text default null,
  p_review_only boolean default false,
  p_sort text default 'work_date',
  p_direction text default 'desc'
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
with filtered as (
  select w.id,w.work_date,w.activity_description,w.duration_minutes,w.effective_hourly_rate,w.effective_amount,
    w.is_invoiced,w.invoice_date,w.is_paid,w.archive_status,w.observations,w.source_type,w.has_manual_override,
    w.has_historical_state_exception,c.display_name client_name,c.client_code,p.display_name professional_name,
    b.name billing_entity_name,coalesce(r.validation_warnings,'[]'::jsonb) validation_warnings
  from public.work_entries w
  join public.clients c on c.id=w.client_id
  join public.professionals p on p.id=w.professional_id
  left join public.billing_entities b on b.id=w.billing_entity_id
  left join public.import_rows r on r.id=w.import_row_id
  where (p_search is null or btrim(p_search)='' or w.activity_description ilike '%'||p_search||'%' or c.display_name ilike '%'||p_search||'%' or c.client_code ilike '%'||p_search||'%' or coalesce(w.observations,'') ilike '%'||p_search||'%')
    and (p_year is null or extract(year from w.work_date)::integer=p_year)
    and (p_professional_id is null or w.professional_id=p_professional_id)
    and (p_billing_entity_id is null or w.billing_entity_id=p_billing_entity_id)
    and (p_invoiced is null or w.is_invoiced=p_invoiced)
    and (p_paid is null or w.is_paid=p_paid)
    and (p_archive is null or w.archive_status=p_archive)
    and (not p_review_only or w.has_historical_state_exception or jsonb_array_length(coalesce(r.validation_warnings,'[]'::jsonb))>0)
), paged as (
  select * from filtered
  order by
    case when p_sort='work_date' and p_direction='asc' then work_date end asc,
    case when p_sort='work_date' and p_direction='desc' then work_date end desc,
    case when p_sort='client' and p_direction='asc' then client_name end asc,
    case when p_sort='client' and p_direction='desc' then client_name end desc,
    case when p_sort='amount' and p_direction='asc' then effective_amount end asc,
    case when p_sort='amount' and p_direction='desc' then effective_amount end desc,
    work_date desc,id
  offset (greatest(p_page,1)-1)*least(greatest(p_page_size,10),100)
  limit least(greatest(p_page_size,10),100)
)
select jsonb_build_object(
  'items',coalesce((select jsonb_agg(to_jsonb(paged)) from paged),'[]'::jsonb),
  'total',(select count(*) from filtered),
  'page',greatest(p_page,1),
  'pageSize',least(greatest(p_page_size,10),100),
  'professionals',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'label',display_name) order by display_name),'[]'::jsonb) from public.professionals),
  'billingEntities',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'label',name) order by name),'[]'::jsonb) from public.billing_entities)
);
$$;

revoke all on function public.search_work_entries(integer,integer,text,integer,uuid,uuid,boolean,boolean,text,boolean,text,text) from public,anon;
grant execute on function public.search_work_entries(integer,integer,text,integer,uuid,uuid,boolean,boolean,text,boolean,text,text) to authenticated;
