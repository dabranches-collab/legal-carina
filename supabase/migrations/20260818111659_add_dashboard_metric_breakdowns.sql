create or replace function public.get_dashboard_metric_breakdowns()
returns jsonb
language sql stable security definer
set search_path=''
set statement_timeout='30s'
as $$
with scope_access as materialized (
  select targets.firm_id,targets.billing_entity_id,targets.client_id,targets.matter_id,
    private.has_scope_access(targets.firm_id,targets.billing_entity_id,targets.client_id,targets.matter_id,'view') can_view
  from (select distinct w.firm_id,w.billing_entity_id,w.client_id,w.matter_id from public.work_entries w) targets
), financial_access as materialized (
  select targets.firm_id,targets.billing_entity_id,
    private.can_view_billing_financials(targets.firm_id,targets.billing_entity_id) can_view
  from (select distinct w.firm_id,w.billing_entity_id from public.work_entries w) targets
), entries as materialized (
  select w.duration_minutes,w.is_invoiced,w.is_paid,w.client_id,w.billing_entity_id,
    case when fa.can_view then w.effective_hourly_rate end effective_hourly_rate,
    case when fa.can_view then w.effective_amount end effective_amount,
    coalesce(b.name,'Sem sociedade') society
  from public.work_entries w
  left join public.billing_entities b on b.id=w.billing_entity_id
  join scope_access scope on scope.firm_id=w.firm_id
    and scope.billing_entity_id is not distinct from w.billing_entity_id
    and scope.client_id=w.client_id and scope.matter_id is not distinct from w.matter_id
  join financial_access fa on fa.firm_id=w.firm_id
    and fa.billing_entity_id is not distinct from w.billing_entity_id
  where scope.can_view
), breakdowns as (
  select society,
    coalesce(sum(duration_minutes),0) minutes,
    sum(effective_amount) worked,
    sum(effective_amount) filter(where is_invoiced) invoiced,
    sum(effective_amount) filter(where is_paid) paid,
    case when sum(effective_amount) filter(where is_invoiced) is null then null
      else sum(effective_amount) filter(where is_invoiced)-coalesce(sum(effective_amount) filter(where is_paid),0) end receivable,
    count(*) filter(where not is_invoiced) "uninvoicedCount",
    count(*) filter(where is_invoiced and not is_paid) "unpaidCount",
    case when coalesce(sum(duration_minutes),0)=0 or sum(effective_amount) is null then null
      else round(sum(effective_amount)*60/sum(duration_minutes),2) end "averageRate",
    count(distinct client_id) "activeClients",
    count(*) filter(where effective_hourly_rate is null) "missingPrice",
    count(*) filter(where billing_entity_id is null) "missingBilling"
  from entries group by society order by society
)
select coalesce(jsonb_agg(to_jsonb(breakdowns)),'[]'::jsonb) from breakdowns;
$$;

revoke all on function public.get_dashboard_metric_breakdowns() from public,anon;
grant execute on function public.get_dashboard_metric_breakdowns() to authenticated;
