-- Resumos agregados para a lista de recebimentos e para os pré-filtros.
-- Mantém a verificação de pertença, PIN, âmbito e visibilidade financeira.
create or replace function public.get_receivable_client_summary()
returns jsonb language sql stable security definer set search_path='' set statement_timeout='15s' as $$
with memberships as materialized (
 select fm.firm_id,bool_or(fm.role in ('owner','admin','operator')) privileged
 from public.firm_members fm
 where fm.user_id=(select auth.uid()) and fm.active and private.has_completed_pin_setup((select auth.uid()))
 group by fm.firm_id
), open_items as (
 select w.client_id,
  case when w.is_invoiced then 'unpaid' else 'uninvoiced' end kind,
  w.duration_minutes minutes,
  case when m.privileged then w.effective_amount else private.visible_financial_value(w.firm_id,w.billing_entity_id,w.effective_amount) end amount,
  w.work_date item_date,w.invoice_date
 from public.work_entries w join memberships m on m.firm_id=w.firm_id
 where (m.privileged or private.has_scope_access(w.firm_id,w.billing_entity_id,w.client_id,w.matter_id,'view'))
  and w.billing_scope='standard' and (not w.is_invoiced or not w.is_paid)
  and w.status not in ('uncollectible_uninvoiced','uncollectible_invoiced')
 union all
 select r.client_id,
  case when r.status='invoiced' then 'retainer_invoiced' else 'retainer_pending' end kind,
  0 minutes,
  case when m.privileged then r.amount else private.visible_financial_value(r.firm_id,r.billing_entity_id,r.amount) end amount,
  r.period_start item_date,r.invoice_date
 from public.retainer_charges r join memberships m on m.firm_id=r.firm_id
 where (m.privileged or private.has_scope_access(r.firm_id,r.billing_entity_id,r.client_id,null,'view'))
  and r.status in ('invoiced','pending') and r.currency='EUR'
), totals as (
 select client_id,
  count(*) filter(where kind='unpaid') unpaid_count,
  coalesce(sum(minutes) filter(where kind='unpaid'),0) unpaid_minutes,
  sum(amount) filter(where kind='unpaid') unpaid_amount,
  count(*) filter(where kind='unpaid' and amount is null)>0 unpaid_partial,
  count(*) filter(where kind='uninvoiced') uninvoiced_count,
  coalesce(sum(minutes) filter(where kind='uninvoiced'),0) uninvoiced_minutes,
  sum(amount) filter(where kind='uninvoiced') uninvoiced_amount,
  count(*) filter(where kind='uninvoiced' and amount is null)>0 uninvoiced_partial,
  count(*) filter(where kind='retainer_invoiced') retainer_count,
  coalesce(sum(amount) filter(where kind='retainer_invoiced'),0) retainer_amount,
  count(*) filter(where kind='retainer_pending') retainer_pending_count,
  coalesce(sum(amount) filter(where kind='retainer_pending'),0) retainer_pending_amount
 from open_items group by client_id
), oldest as (
 select distinct on(client_id) client_id,item_date,kind,invoice_date
 from open_items order by client_id,item_date,kind
)
select coalesce(jsonb_agg(jsonb_build_object(
 'id',c.id,'name',c.display_name,'code',c.client_code,
 'unpaidCount',t.unpaid_count,'unpaidMinutes',t.unpaid_minutes,'unpaidAmount',t.unpaid_amount,'unpaidPartial',t.unpaid_partial,
 'uninvoicedCount',t.uninvoiced_count,'uninvoicedMinutes',t.uninvoiced_minutes,'uninvoicedAmount',t.uninvoiced_amount,'uninvoicedPartial',t.uninvoiced_partial,
 'retainerCount',t.retainer_count,'retainerAmount',t.retainer_amount,
 'retainerPendingCount',t.retainer_pending_count,'retainerPendingAmount',t.retainer_pending_amount,
 'oldestDate',o.item_date,'oldestKind',case o.kind when 'unpaid' then 'registo' when 'uninvoiced' then 'trabalho' when 'retainer_invoiced' then 'avença' else 'avença pendente' end,
 'oldestInvoiceDate',o.invoice_date
 ) order by coalesce(t.unpaid_amount,0)+coalesce(t.uninvoiced_amount,0)+t.retainer_amount+t.retainer_pending_amount desc,o.item_date,c.display_name),'[]'::jsonb)
from totals t join public.clients c on c.id=t.client_id join oldest o on o.client_id=t.client_id;
$$;
revoke all on function public.get_receivable_client_summary() from public,anon;
grant execute on function public.get_receivable_client_summary() to authenticated;

create or replace function public.get_work_attention_summaries(p_search text default null,p_year integer default null,p_professional_id uuid default null,p_billing_entity_id uuid default null,p_archive text default null,p_client_type text default null,p_client_id uuid default null)
returns jsonb language sql stable security definer set search_path='' set statement_timeout='15s' as $$
with memberships as materialized (
 select fm.firm_id,bool_or(fm.role in ('owner','admin','operator')) privileged
 from public.firm_members fm where fm.user_id=(select auth.uid()) and fm.active and private.has_completed_pin_setup((select auth.uid())) group by fm.firm_id
), filtered as materialized (
 select w.id,w.billing_entity_id,w.billing_scope,w.effective_hourly_rate,w.duration_minutes,w.is_invoiced,w.is_paid,w.invoice_date,w.status,
  case when m.privileged then w.effective_amount else private.visible_financial_value(w.firm_id,w.billing_entity_id,w.effective_amount) end amount
 from public.work_entries w join memberships m on m.firm_id=w.firm_id join public.clients c on c.id=w.client_id
 where (m.privileged or private.has_scope_access(w.firm_id,w.billing_entity_id,w.client_id,w.matter_id,'view'))
  and (p_search is null or btrim(p_search)='' or w.activity_description ilike '%'||p_search||'%' or coalesce(w.observations,'') ilike '%'||p_search||'%' or c.display_name ilike '%'||p_search||'%' or c.client_code ilike '%'||p_search||'%')
  and (p_year is null or w.work_date>=make_date(p_year,1,1) and w.work_date<make_date(p_year+1,1,1))
  and (p_professional_id is null or w.professional_id=p_professional_id)
  and (p_billing_entity_id is null or w.billing_entity_id=p_billing_entity_id)
  and (p_archive is null or w.archive_status=p_archive)
  and (p_client_type is null or exists(select 1 from public.client_profiles cp where cp.id=w.client_profile_id and cp.client_type=p_client_type and cp.active))
  and (p_client_id is null or w.client_id=p_client_id)
), classified as (
 select f.*,v.kind from filtered f cross join lateral (values
  ('missing_society',f.billing_entity_id is null),
  ('missing_price',f.billing_scope='standard' and f.effective_hourly_rate is null),
  ('uninvoiced',f.billing_scope='standard' and not f.is_invoiced and f.status<>'uncollectible_uninvoiced'),
  ('unpaid',f.billing_scope='standard' and f.is_invoiced and not f.is_paid and f.status<>'uncollectible_invoiced'),
  ('historical',f.billing_scope='standard' and f.is_paid and f.invoice_date is null and not exists(select 1 from public.invoice_lines il join public.invoices i on i.id=il.invoice_id where il.work_entry_id=f.id and (i.invoice_date is not null or nullif(btrim(i.invoice_number),'') is not null))),
  ('retainer',f.billing_scope='retainer')
 ) v(kind,applies) where v.applies
), totals as (
 select kind,count(*) count,coalesce(sum(duration_minutes),0) minutes,coalesce(sum(amount),0) amount,count(amount) priced
 from classified group by kind
)
select coalesce(jsonb_object_agg(kind,jsonb_build_object('count',count,'minutes',minutes,'amount',amount,'priced',priced)),'{}'::jsonb) from totals;
$$;
revoke all on function public.get_work_attention_summaries(text,integer,uuid,uuid,text,text,uuid) from public,anon;
grant execute on function public.get_work_attention_summaries(text,integer,uuid,uuid,text,text,uuid) to authenticated;
