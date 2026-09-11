-- Estado operacional auditável para créditos que deixam de ser cobráveis.
-- Mantém os booleanos existentes para compatibilidade: um movimento incobrável
-- continua facturado, mas não é contado como pago.

create or replace function public.update_work_entry_collection_status(
  p_work_entry_id uuid,
  p_state text
) returns void
language plpgsql
security definer
set search_path=''
as $$
declare
  entry public.work_entries%rowtype;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode='28000'; end if;
  select * into entry from public.work_entries where id=p_work_entry_id for update;
  if entry.id is null then raise exception 'work entry not found'; end if;
  if not private.has_scope_access(entry.firm_id,entry.billing_entity_id,entry.client_id,entry.matter_id,'edit') then
    raise exception 'not authorized' using errcode='42501';
  end if;
  if p_state <> 'uncollectible' then raise exception 'invalid collection state'; end if;
  if entry.invoice_date is null then raise exception 'invoice date is required'; end if;

  insert into public.manual_overrides(
    firm_id,work_entry_id,field_name,previous_value,calculated_value,
    override_value,reason,created_by
  ) values (
    entry.firm_id,entry.id,'status',to_jsonb(entry.status),to_jsonb(entry.status),
    to_jsonb(p_state),'Edição directa na tabela',auth.uid()
  );
  update public.work_entries
     set status='uncollectible',is_invoiced=true,is_paid=false,
         has_manual_override=true,updated_by=auth.uid()
   where id=entry.id;
end;
$$;

revoke all on function public.update_work_entry_collection_status(uuid,text) from public,anon;
grant execute on function public.update_work_entry_collection_status(uuid,text) to authenticated;

create or replace function public.search_work_entries(
  p_page integer default 1,p_page_size integer default 25,p_search text default null,p_year integer default null,
  p_professional_id uuid default null,p_billing_entity_id uuid default null,p_invoiced boolean default null,
  p_paid boolean default null,p_archive text default null,p_review_only boolean default false,
  p_missing_price boolean default false,p_client_type text default null,p_client_id uuid default null,
  p_missing_society boolean default false,p_sort text default 'work_date',p_direction text default 'desc'
) returns jsonb language sql stable security definer set search_path='' as $$
with memberships as materialized(
 select fm.firm_id, bool_or(fm.role in('owner','admin')) privileged
 from public.firm_members fm
 where fm.user_id=(select auth.uid()) and fm.active
   and private.has_completed_pin_setup((select auth.uid()))
 group by fm.firm_id
), filtered as materialized (
 select w.id,w.work_date,w.activity_description,w.duration_minutes,
  case when membership.privileged then w.effective_hourly_rate else private.visible_financial_value(w.firm_id,w.billing_entity_id,w.effective_hourly_rate) end effective_hourly_rate,
  case when membership.privileged then w.effective_amount else private.visible_financial_value(w.firm_id,w.billing_entity_id,w.effective_amount) end effective_amount,
  w.status,w.is_invoiced,w.invoice_date,w.is_paid,w.archive_status,w.observations,w.source_type,w.has_manual_override,
  w.has_historical_state_exception,w.client_id,w.client_profile_id,w.professional_id,w.billing_entity_id,w.import_row_id
 from public.work_entries w join memberships membership on membership.firm_id=w.firm_id
 where (membership.privileged or private.has_scope_access(w.firm_id,w.billing_entity_id,w.client_id,w.matter_id,'view'))
  and(p_search is null or btrim(p_search)='' or w.activity_description ilike '%'||p_search||'%' or coalesce(w.observations,'') ilike '%'||p_search||'%'
   or exists(select 1 from public.clients sc where sc.id=w.client_id and(sc.display_name ilike '%'||p_search||'%' or sc.client_code ilike '%'||p_search||'%')))
  and(p_year is null or w.work_date>=make_date(p_year,1,1) and w.work_date<make_date(p_year+1,1,1))
  and(p_professional_id is null or w.professional_id=p_professional_id)
  and(p_billing_entity_id is null or w.billing_entity_id=p_billing_entity_id)
  and(p_invoiced is null or w.is_invoiced=p_invoiced) and(p_paid is null or w.is_paid=p_paid)
  and(p_archive is null or w.archive_status=p_archive) and(not p_missing_price or w.effective_hourly_rate is null)
  and(p_client_type is null or exists(select 1 from public.client_profiles cp where cp.id=w.client_profile_id and cp.client_type=p_client_type and cp.active))
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
 offset(greatest(p_page,1)-1)*least(greatest(p_page_size,10),10000)
 limit least(greatest(p_page_size,10),10000)
), items as (
 select p.id,p.work_date,p.activity_description,p.duration_minutes,p.effective_hourly_rate,p.effective_amount,p.status,p.is_invoiced,
  p.invoice_date,p.is_paid,p.archive_status,p.observations,p.source_type,p.has_manual_override,p.has_historical_state_exception,
  c.display_name client_name,c.client_code,professional.display_name professional_name,billing.name billing_entity_name,
  invoice.invoice_number,coalesce(import_row.validation_warnings,'[]'::jsonb) validation_warnings
 from paged p join public.clients c on c.id=p.client_id join public.professionals professional on professional.id=p.professional_id
 left join public.billing_entities billing on billing.id=p.billing_entity_id
 left join public.import_rows import_row on import_row.id=p.import_row_id
 left join lateral(
   select i.invoice_number from public.invoice_lines il join public.invoices i on i.id=il.invoice_id
   where il.work_entry_id=p.id order by i.invoice_date desc,i.id limit 1
 )invoice on true
)
select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(items)) from items),'[]'::jsonb),
 'total',(select count(*) from filtered),'page',greatest(p_page,1),'pageSize',least(greatest(p_page_size,10),10000),
 'professionals',case when greatest(p_page,1)=1 then(select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'label',p.display_name)order by p.display_name),'[]'::jsonb)from public.professionals p join memberships m on m.firm_id=p.firm_id where p.active)else'[]'::jsonb end,
 'billingEntities',case when greatest(p_page,1)=1 then(select coalesce(jsonb_agg(jsonb_build_object('id',b.id,'label',b.name)order by b.name),'[]'::jsonb)from public.billing_entities b join memberships m on m.firm_id=b.firm_id where b.active)else'[]'::jsonb end);
$$;

revoke all on function public.search_work_entries(integer,integer,text,integer,uuid,uuid,boolean,boolean,text,boolean,boolean,text,uuid,boolean,text,text) from public,anon;
grant execute on function public.search_work_entries(integer,integer,text,integer,uuid,uuid,boolean,boolean,text,boolean,boolean,text,uuid,boolean,text,text) to authenticated;
notify pgrst,'reload schema';
