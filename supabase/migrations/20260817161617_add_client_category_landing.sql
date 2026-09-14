create or replace function public.get_client_category_summaries()
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
), mixed_clients as materialized (
  select cp.firm_id,cp.client_id
  from public.client_profiles cp where cp.active
  group by cp.firm_id,cp.client_id having count(distinct cp.client_type)>1
), entries as materialized (
  select w.client_id,w.duration_minutes,w.is_invoiced,
    case when fa.can_view then w.effective_amount end amount,
    cp.client_type,mc.client_id is not null is_mixed
  from public.work_entries w
  join public.client_profiles cp on cp.id=w.client_profile_id
  left join mixed_clients mc on mc.firm_id=w.firm_id and mc.client_id=w.client_id
  join scope_access scope on scope.firm_id=w.firm_id and scope.billing_entity_id is not distinct from w.billing_entity_id
    and scope.client_id=w.client_id and scope.matter_id is not distinct from w.matter_id
  join financial_access fa on fa.firm_id=w.firm_id and fa.billing_entity_id is not distinct from w.billing_entity_id
  where scope.can_view
), categories as (
  select client_type category,client_id,duration_minutes,is_invoiced,amount from entries
  union all
  select 'mixed',client_id,duration_minutes,is_invoiced,amount from entries where is_mixed
), summary as (
  select category,count(distinct client_id) clients,count(*) movements,coalesce(sum(duration_minutes),0) minutes,
    sum(amount) total,sum(amount) filter(where is_invoiced) invoiced
  from categories group by category
), requested as (
  select value category from jsonb_array_elements_text('["individual","company","mixed"]'::jsonb)
)
select coalesce(jsonb_agg(jsonb_build_object(
  'category',r.category,'clients',coalesce(s.clients,0),'movements',coalesce(s.movements,0),
  'minutes',coalesce(s.minutes,0),'total',s.total,'invoiced',s.invoiced
) order by case r.category when 'individual' then 1 when 'company' then 2 else 3 end),'[]'::jsonb)
from requested r left join summary s on s.category=r.category;
$$;

revoke all on function public.get_client_category_summaries() from public,anon;
grant execute on function public.get_client_category_summaries() to authenticated;

alter function public.get_client_category_dashboard(text) set statement_timeout='30s';
alter function public.get_entity_dashboard_rolling(text,uuid) set statement_timeout='30s';
