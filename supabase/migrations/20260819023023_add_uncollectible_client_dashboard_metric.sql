create or replace function public.get_client_category_dashboard(p_client_type text default null)
returns jsonb language sql stable security definer set search_path='' as $$
with mixed_clients as materialized(
  select cp.firm_id,cp.client_id from public.client_profiles cp where cp.active
  group by cp.firm_id,cp.client_id having count(distinct cp.client_type)>1
), entries as materialized(
  select w.work_date,w.created_at,w.activity_description,w.duration_minutes,w.is_invoiced,w.is_paid,w.status,
    w.client_id,w.professional_id,w.billing_entity_id,w.effective_hourly_rate,
    private.visible_financial_value(w.firm_id,w.billing_entity_id,w.effective_amount) effective_amount
  from public.work_entries w
  join public.client_profiles cp on cp.id=w.client_profile_id
  left join mixed_clients mc on mc.firm_id=cp.firm_id and mc.client_id=cp.client_id
  where private.has_scope_access(w.firm_id,w.billing_entity_id,w.client_id,w.matter_id,'view')
    and (p_client_type is null
      or (p_client_type in ('individual','company') and cp.client_type=p_client_type)
      or (p_client_type='mixed' and mc.client_id is not null))
), annual as (
  select extract(year from work_date)::int label,round(sum(effective_amount),2) value from entries group by 1 order by 1
), latest_month as (
  select date_trunc('month',max(work_date))::date value from entries
), rolling_months as (
  select generate_series((select value from latest_month)-interval '11 months',(select value from latest_month),interval '1 month')::date month_start
  where (select value from latest_month) is not null
), monthly as (
  select to_char(m.month_start,'YYYY-MM') label,round(coalesce(sum(e.effective_amount),0),2) value
  from rolling_months m left join entries e on e.work_date>=m.month_start and e.work_date<m.month_start+interval '1 month'
  group by m.month_start order by m.month_start
), recent as (
  select work_date,activity_description,duration_minutes,effective_amount from entries order by work_date desc,created_at desc limit 8
), totals as (
  select coalesce(sum(duration_minutes),0) minutes,sum(effective_amount) total,
    sum(effective_amount) filter(where is_invoiced) invoiced,sum(effective_amount) filter(where is_paid) paid,
    count(*) movements,count(distinct client_id) clients,count(distinct professional_id) professionals,
    count(distinct billing_entity_id) billing_entities,
    count(*) filter(where not is_invoiced and status<>'uncollectible_uninvoiced') uninvoiced_count,
    count(*) filter(where is_invoiced and not is_paid and status<>'uncollectible_invoiced') unpaid_count,
    count(*) filter(where status in('uncollectible_uninvoiced','uncollectible_invoiced')) uncollectible_count,
    coalesce(sum(effective_amount) filter(where is_invoiced and not is_paid and status<>'uncollectible_invoiced'),0) pending,
    count(*) filter(where effective_hourly_rate is null) missing_price
  from entries
)
select jsonb_build_object(
  'selectedId',coalesce(p_client_type,'all'),'options','[]'::jsonb,
  'identity',jsonb_build_object(
    'title',case p_client_type when 'individual' then 'Particulares' when 'company' then 'Empresas' when 'mixed' then 'Clientes mistos' else 'Todos os clientes' end,
    'subtitle',case p_client_type when 'individual' then 'Clientes particulares' when 'company' then 'Clientes empresariais' when 'mixed' then 'Clientes com vertente particular e empresa' else 'Consolidado de particulares e empresas' end,
    'code',''),
  'metrics',jsonb_build_object(
    'minutes',t.minutes,'total',t.total,'invoiced',t.invoiced,'paid',t.paid,
    'pending',case when t.invoiced is null then null else t.pending end,
    'averageRate',case when t.minutes=0 or t.total is null then null else round(t.total*60/t.minutes,2) end,
    'movements',t.movements,'clients',t.clients,'professionals',t.professionals,
    'billingEntities',t.billing_entities,'uninvoicedCount',t.uninvoiced_count,
    'unpaidCount',t.unpaid_count,'uncollectibleCount',t.uncollectible_count,'missingPrice',t.missing_price),
  'annual',coalesce((select jsonb_agg(to_jsonb(annual)) from annual),'[]'::jsonb),
  'monthly',coalesce((select jsonb_agg(to_jsonb(monthly)) from monthly),'[]'::jsonb),
  'recent',coalesce((select jsonb_agg(to_jsonb(recent)) from recent),'[]'::jsonb)
) from totals t where p_client_type is null or p_client_type in ('individual','company','mixed');
$$;

revoke all on function public.get_client_category_dashboard(text) from public,anon;
grant execute on function public.get_client_category_dashboard(text) to authenticated;
alter function public.get_client_category_dashboard(text) set statement_timeout='30s';
notify pgrst,'reload schema';
