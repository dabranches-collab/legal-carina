-- A fila de regularização só inclui movimentos pagos sem qualquer prova de factura.
-- O marcador de importação é histórico e não pode manter um movimento na fila
-- depois de existir data no movimento ou data/número numa factura associada.
create or replace function public.get_work_attention_counts(p_search text default null,p_year integer default null,p_professional_id uuid default null,p_billing_entity_id uuid default null,p_archive text default null,p_client_type text default null,p_client_id uuid default null)
returns jsonb language sql stable security definer set search_path='' set statement_timeout='15s' as $$
with memberships as materialized(select fm.firm_id,bool_or(fm.role in('owner','admin','operator'))privileged from public.firm_members fm where fm.user_id=(select auth.uid())and fm.active and private.has_completed_pin_setup((select auth.uid()))group by fm.firm_id),filtered as materialized(
 select w.* from public.work_entries w join memberships m on m.firm_id=w.firm_id join public.clients c on c.id=w.client_id where(m.privileged or private.has_scope_access(w.firm_id,w.billing_entity_id,w.client_id,w.matter_id,'view'))
 and(p_search is null or btrim(p_search)=''or w.activity_description ilike'%'||p_search||'%'or coalesce(w.observations,'')ilike'%'||p_search||'%'or c.display_name ilike'%'||p_search||'%'or c.client_code ilike'%'||p_search||'%')
 and(p_year is null or w.work_date>=make_date(p_year,1,1)and w.work_date<make_date(p_year+1,1,1))and(p_professional_id is null or w.professional_id=p_professional_id)and(p_billing_entity_id is null or w.billing_entity_id=p_billing_entity_id)and(p_archive is null or w.archive_status=p_archive)and(p_client_type is null or exists(select 1 from public.client_profiles cp where cp.id=w.client_profile_id and cp.client_type=p_client_type and cp.active))and(p_client_id is null or w.client_id=p_client_id))
select jsonb_build_object('missing_society',count(*)filter(where billing_entity_id is null),'missing_price',count(*)filter(where billing_scope='standard'and effective_hourly_rate is null),'uninvoiced',count(*)filter(where billing_scope='standard'and not is_invoiced and status<>'uncollectible_uninvoiced'),'unpaid',count(*)filter(where billing_scope='standard'and is_invoiced and not is_paid and status<>'uncollectible_invoiced'),'historical',count(*)filter(where billing_scope='standard'and is_paid and invoice_date is null and not exists(select 1 from public.invoice_lines il join public.invoices i on i.id=il.invoice_id where il.work_entry_id=filtered.id and (i.invoice_date is not null or nullif(btrim(i.invoice_number),'') is not null))),'retainer',count(*)filter(where billing_scope='retainer'))from filtered;
$$;

create or replace function public.get_attention_work_entries(p_kind text,p_search text default null,p_year integer default null,p_professional_id uuid default null,p_billing_entity_id uuid default null,p_archive text default null,p_missing_price boolean default false,p_client_type text default null,p_client_id uuid default null,p_missing_society boolean default false)
returns jsonb language plpgsql stable security definer set search_path='' set statement_timeout='30s' as $$
declare payload jsonb;filtered jsonb;
begin
 if p_kind not in('uninvoiced','unpaid','historical','retainer','missing_price')then raise exception 'invalid attention filter';end if;
 payload:=public.search_work_entries(1,10000,p_search,p_year,p_professional_id,p_billing_entity_id,null,null,p_archive,false,false,p_client_type,p_client_id,p_missing_society,'work_date','desc');
 select coalesce(jsonb_agg(item||jsonb_build_object('billing_scope',coalesce(w.billing_scope,'standard'))),'[]'::jsonb)into filtered
 from jsonb_array_elements(coalesce(payload->'items','[]'::jsonb))item join public.work_entries w on w.id=(item->>'id')::uuid where
  (p_kind='uninvoiced'and w.billing_scope='standard'and(item->>'is_invoiced')::boolean=false and item->>'status'<>'uncollectible_uninvoiced')or
  (p_kind='unpaid'and w.billing_scope='standard'and(item->>'is_invoiced')::boolean=true and(item->>'is_paid')::boolean=false and item->>'status'<>'uncollectible_invoiced')or
  (p_kind='historical'and w.billing_scope='standard'and w.is_paid and w.invoice_date is null and not exists(select 1 from public.invoice_lines il join public.invoices i on i.id=il.invoice_id where il.work_entry_id=w.id and (i.invoice_date is not null or nullif(btrim(i.invoice_number),'') is not null)))or
  (p_kind='retainer'and w.billing_scope='retainer')or
  (p_kind='missing_price'and w.billing_scope='standard'and w.effective_hourly_rate is null);
 return jsonb_build_object('items',filtered,'total',jsonb_array_length(filtered),'page',1,'pageSize',10000,'professionals',coalesce(payload->'professionals','[]'::jsonb),'billingEntities',coalesce(payload->'billingEntities','[]'::jsonb));
end;$$;

notify pgrst,'reload schema';
