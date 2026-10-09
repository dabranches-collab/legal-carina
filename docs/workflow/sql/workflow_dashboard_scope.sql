-- PROPOSTA; não é migration nem foi aplicada a serviços reais.
-- Mantém fórmulas e controlo de acesso das funções originais.
-- Subtotais distinguem sociedades por UUID; responsáveis preservam NULL financeiro.
-- Acrescenta intersecções ao trabalho autorizado.
-- Responsáveis: limita os nomes à entidade autorizada e conserva NULL financeiro.
-- importErrors conserva o âmbito global da entidade; não é filtrado por trabalho.
-- Gerado/revisto com scripts/workflow/prepare-dashboard-scope.mjs --write.
begin;
-- Source: supabase/migrations/20260818233000_align_entity_attention_with_drilldowns.sql; original function SHA256 11e187d1ab3122dd239ebee01dc622cce3efce8d71440f4c71303c148dea70c6
create or replace function public.get_workflow_professional_landing_summaries(p_scope_billing_entity_id uuid default null,p_scope_professional_id uuid default null,p_scope_client_type text default null)
returns table(id uuid,name text,minutes bigint,total numeric,invoiced numeric,clients bigint,uninvoiced bigint,unpaid bigint,"missingPrice" bigint)
language sql stable security definer set search_path=''
as $$
  with scope_access as materialized(
    select targets.firm_id,targets.billing_entity_id,targets.client_id,targets.matter_id,
      private.has_scope_access(targets.firm_id,targets.billing_entity_id,targets.client_id,targets.matter_id,'view') can_view
    from(select distinct w.firm_id,w.billing_entity_id,w.client_id,w.matter_id from public.work_entries w)targets
  ),financial_access as materialized(
    select targets.firm_id,targets.billing_entity_id,private.can_view_billing_financials(targets.firm_id,targets.billing_entity_id)can_view
    from(select distinct w.firm_id,w.billing_entity_id from public.work_entries w)targets
  ),accessible as materialized(
    select w.professional_id,w.client_id,w.duration_minutes,w.is_invoiced,w.is_paid,w.status,w.effective_hourly_rate,
      case when financial.can_view then w.effective_amount end amount,financial.can_view can_view_financials
    from public.work_entries w
    join scope_access scope on scope.firm_id=w.firm_id and scope.billing_entity_id is not distinct from w.billing_entity_id and scope.client_id=w.client_id and scope.matter_id is not distinct from w.matter_id
    join financial_access financial on financial.firm_id=w.firm_id and financial.billing_entity_id is not distinct from w.billing_entity_id
    where scope.can_view
 and (p_scope_billing_entity_id is null or w.billing_entity_id=p_scope_billing_entity_id)
 and (p_scope_professional_id is null or w.professional_id=p_scope_professional_id)
 and (p_scope_client_type is null
  or (p_scope_client_type in ('individual','company') and exists(select 1 from public.client_profiles scope_cp where scope_cp.id=w.client_profile_id and scope_cp.firm_id=w.firm_id and scope_cp.active and scope_cp.client_type=p_scope_client_type))
  or (p_scope_client_type='mixed' and exists(select 1 from public.client_profiles scope_cp where scope_cp.client_id=w.client_id and scope_cp.firm_id=w.firm_id and scope_cp.active and scope_cp.client_type='individual')
   and exists(select 1 from public.client_profiles scope_cp where scope_cp.client_id=w.client_id and scope_cp.firm_id=w.firm_id and scope_cp.active and scope_cp.client_type='company')))
  ),aggregated as(
    select a.professional_id,coalesce(sum(a.duration_minutes),0)::bigint minutes,case when bool_or(a.can_view_financials) then coalesce(sum(a.amount),0) end total,
      case when bool_or(a.can_view_financials) then coalesce(sum(a.amount)filter(where a.is_invoiced),0) end invoiced,count(distinct a.client_id)::bigint clients,
      count(*)filter(where not a.is_invoiced and a.status<>'uncollectible_uninvoiced')::bigint uninvoiced,
      count(*)filter(where a.is_invoiced and not a.is_paid and a.status<>'uncollectible_invoiced')::bigint unpaid,
      count(*)filter(where a.effective_hourly_rate is null)::bigint missing_price
    from accessible a group by a.professional_id
  )
  select p.id,p.display_name,coalesce(a.minutes,0)::bigint,case when a.professional_id is null then 0 else a.total end,case when a.professional_id is null then 0 else a.invoiced end,
    coalesce(a.clients,0)::bigint,coalesce(a.uninvoiced,0)::bigint,coalesce(a.unpaid,0)::bigint,coalesce(a.missing_price,0)::bigint
  from public.professionals p left join aggregated a on a.professional_id=p.id where p.active and private.is_firm_member(p.firm_id) and (p_scope_professional_id is null or p.id=p_scope_professional_id) order by p.display_name;
$$;
revoke all on function public.get_workflow_professional_landing_summaries(uuid,uuid,text) from public,anon;
grant execute on function public.get_workflow_professional_landing_summaries(uuid,uuid,text) to authenticated;
alter function public.get_workflow_professional_landing_summaries(uuid,uuid,text) set statement_timeout='30s';

-- Source: supabase/migrations/20260928141755_align_overview_missing_price_with_attention.sql; original function SHA256 f97cbf0eeb408e591265053d150f79b6230e7f9868a13415564db6d31a4e89a6
create or replace function public.get_workflow_dashboard_overview(p_scope_billing_entity_id uuid default null,p_scope_professional_id uuid default null,p_scope_client_type text default null)
returns jsonb language sql stable security definer set search_path='' set statement_timeout='30s' as $$
with scope_access as materialized(
 select targets.firm_id,targets.billing_entity_id,targets.client_id,targets.matter_id,private.has_scope_access(targets.firm_id,targets.billing_entity_id,targets.client_id,targets.matter_id,'view') can_view
 from(select distinct w.firm_id,w.billing_entity_id,w.client_id,w.matter_id from public.work_entries w)targets
),financial_access as materialized(
 select targets.firm_id,targets.billing_entity_id,private.can_view_billing_financials(targets.firm_id,targets.billing_entity_id)can_view
 from(select distinct w.firm_id,w.billing_entity_id from public.work_entries w)targets
),entries as materialized(
 select w.work_date,w.duration_minutes,w.status,w.is_invoiced,w.is_paid,w.archive_status,w.has_manual_override,w.billing_scope,w.client_id,w.billing_entity_id,
  (w.billing_scope='standard' and w.effective_hourly_rate is null) missing_price_alert,
  case when fa.can_view then w.effective_hourly_rate end effective_hourly_rate,case when fa.can_view then w.effective_amount end effective_amount,
  c.display_name client_name,c.client_type,b.name billing_name,p.display_name professional_name
 from public.work_entries w join public.clients c on c.id=w.client_id join public.professionals p on p.id=w.professional_id left join public.billing_entities b on b.id=w.billing_entity_id
 join scope_access scope on scope.firm_id=w.firm_id and scope.billing_entity_id is not distinct from w.billing_entity_id and scope.client_id=w.client_id and scope.matter_id is not distinct from w.matter_id
 join financial_access fa on fa.firm_id=w.firm_id and fa.billing_entity_id is not distinct from w.billing_entity_id where scope.can_view
 and (p_scope_billing_entity_id is null or w.billing_entity_id=p_scope_billing_entity_id)
 and (p_scope_professional_id is null or w.professional_id=p_scope_professional_id)
 and (p_scope_client_type is null
  or (p_scope_client_type in ('individual','company') and exists(select 1 from public.client_profiles scope_cp where scope_cp.id=w.client_profile_id and scope_cp.firm_id=w.firm_id and scope_cp.active and scope_cp.client_type=p_scope_client_type))
  or (p_scope_client_type='mixed' and exists(select 1 from public.client_profiles scope_cp where scope_cp.client_id=w.client_id and scope_cp.firm_id=w.firm_id and scope_cp.active and scope_cp.client_type='individual')
   and exists(select 1 from public.client_profiles scope_cp where scope_cp.client_id=w.client_id and scope_cp.firm_id=w.firm_id and scope_cp.active and scope_cp.client_type='company')))
),totals as(
 select coalesce(sum(duration_minutes),0)minutes,sum(effective_amount)worked,sum(effective_amount)filter(where is_invoiced)invoiced,sum(effective_amount)filter(where is_paid)paid,
 sum(effective_amount)filter(where is_invoiced and not is_paid and status<>'uncollectible_invoiced')receivable,
 count(*)filter(where not is_invoiced and status<>'uncollectible_uninvoiced')uninvoiced_count,
 count(*)filter(where is_invoiced and not is_paid and status<>'uncollectible_invoiced')unpaid_count,
 count(*)filter(where status in('uncollectible_uninvoiced','uncollectible_invoiced'))uncollectible_count,
 sum(effective_amount)filter(where status in('uncollectible_uninvoiced','uncollectible_invoiced'))uncollectible_value,
 count(*)filter(where missing_price_alert)missing_price,count(*)filter(where has_manual_override)overrides,count(distinct client_id)active_clients from entries
),missing_billing as(select count(*)value from entries where billing_entity_id is null),annual_totals as(select extract(year from work_date)::int label,round(sum(effective_amount),2)value,sum(duration_minutes)minutes from entries group by 1),
annual as(select a.label,a.value,a.minutes,coalesce((select jsonb_object_agg(s.society,s.value)from(select coalesce(e2.billing_name,'Sem sociedade')society,round(sum(e2.effective_amount),2)value from entries e2 where extract(year from e2.work_date)::int=a.label group by 1)s),'{}'::jsonb)societies from annual_totals a order by a.label),
latest_year as(select max(extract(year from work_date)::int)value from entries),latest_month as(select date_trunc('month',max(work_date))::date value from entries),rolling_months as(select generate_series((select value from latest_month)-interval'11 months',(select value from latest_month),interval'1 month')::date month_start where(select value from latest_month)is not null),
monthly as(select to_char(m.month_start,'YYYY-MM')label,round(coalesce(sum(e.effective_amount),0),2)value,coalesce((select jsonb_object_agg(s.society,s.value)from(select coalesce(e2.billing_name,'Sem sociedade')society,round(sum(e2.effective_amount),2)value from entries e2 where e2.work_date>=m.month_start and e2.work_date<m.month_start+interval'1 month' group by 1)s),'{}'::jsonb)societies from rolling_months m left join entries e on e.work_date>=m.month_start and e.work_date<m.month_start+interval'1 month' group by m.month_start order by m.month_start),
monthly_by_year as(select extract(year from work_date)::int as "year",extract(month from work_date)::int as "month",round(sum(effective_amount),2)value from entries group by 1,2 order by 1,2),
billing_monthly as(select s.society,to_char(m.month_start,'YYYY-MM')period,round(coalesce(sum(e.effective_amount),0),2)value from rolling_months m cross join(select distinct coalesce(billing_name,'Sem sociedade')society from entries)s left join entries e on e.work_date>=m.month_start and e.work_date<m.month_start+interval'1 month' and coalesce(e.billing_name,'Sem sociedade')=s.society group by s.society,m.month_start order by m.month_start,s.society),
billing_annual as(select coalesce(billing_name,'Sem sociedade')society,extract(year from work_date)::int as "year",round(sum(effective_amount),2)value from entries group by 1,2 order by 1,2),
by_client as(select client_name label,round(sum(effective_amount),2)value from entries group by client_name order by value desc nulls last limit 10),by_billing as(select coalesce(billing_name,'Sem sociedade')label,round(sum(effective_amount),2)value from entries group by billing_name order by value desc nulls last),by_professional as(select professional_name label,round(sum(effective_amount),2)value from entries group by professional_name order by value desc nulls last),by_archive as(select coalesce(archive_status,'none')label,count(*)value from entries group by archive_status order by value desc),client_types as(select client_type label,count(distinct client_id)value from entries group by client_type)
select jsonb_build_object('metrics',jsonb_build_object('minutes',t.minutes,'worked',t.worked,'invoiced',t.invoiced,'paid',t.paid,'receivable',t.receivable,'uninvoicedCount',t.uninvoiced_count,'unpaidCount',t.unpaid_count,'uncollectibleCount',t.uncollectible_count,'uncollectibleValue',t.uncollectible_value,'averageRate',case when t.minutes=0 or t.worked is null then null else round(t.worked*60/t.minutes,2)end,'activeClients',t.active_clients,'missingPrice',t.missing_price,'missingBilling',(select value from missing_billing),'overrides',t.overrides,'importErrors',(select count(*)from public.imports i where i.invalid_rows>0 and private.is_firm_member(i.firm_id))),
'annual',coalesce((select jsonb_agg(to_jsonb(annual))from annual),'[]'::jsonb),'monthly',coalesce((select jsonb_agg(to_jsonb(monthly))from monthly),'[]'::jsonb),'monthlyByYear',coalesce((select jsonb_agg(to_jsonb(monthly_by_year))from monthly_by_year),'[]'::jsonb),'billingMonthly',coalesce((select jsonb_agg(to_jsonb(billing_monthly))from billing_monthly),'[]'::jsonb),'billingAnnual',coalesce((select jsonb_agg(to_jsonb(billing_annual))from billing_annual),'[]'::jsonb),'latestYear',(select value from latest_year),'byClient',coalesce((select jsonb_agg(to_jsonb(by_client))from by_client),'[]'::jsonb),'byBilling',coalesce((select jsonb_agg(to_jsonb(by_billing))from by_billing),'[]'::jsonb),'byProfessional',coalesce((select jsonb_agg(to_jsonb(by_professional))from by_professional),'[]'::jsonb),'byArchive',coalesce((select jsonb_agg(to_jsonb(by_archive))from by_archive),'[]'::jsonb),'clientTypes',coalesce((select jsonb_agg(to_jsonb(client_types))from client_types),'[]'::jsonb))from totals t;
$$;
revoke all on function public.get_workflow_dashboard_overview(uuid,uuid,text) from public,anon;
grant execute on function public.get_workflow_dashboard_overview(uuid,uuid,text) to authenticated;
alter function public.get_workflow_dashboard_overview(uuid,uuid,text) set statement_timeout='30s';

-- Source: supabase/migrations/20260928141755_align_overview_missing_price_with_attention.sql; original function SHA256 73ba45005fd32868572959882f70c91a6a5ab678f9e4bb9b91654f8262a9b17b
create or replace function public.get_workflow_dashboard_metric_breakdowns(p_scope_billing_entity_id uuid default null,p_scope_professional_id uuid default null,p_scope_client_type text default null)
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
  select w.duration_minutes,w.is_invoiced,w.is_paid,w.billing_scope,w.client_id,w.billing_entity_id,
    (w.billing_scope='standard' and w.effective_hourly_rate is null) missing_price_alert,
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
 and (p_scope_billing_entity_id is null or w.billing_entity_id=p_scope_billing_entity_id)
 and (p_scope_professional_id is null or w.professional_id=p_scope_professional_id)
 and (p_scope_client_type is null
  or (p_scope_client_type in ('individual','company') and exists(select 1 from public.client_profiles scope_cp where scope_cp.id=w.client_profile_id and scope_cp.firm_id=w.firm_id and scope_cp.active and scope_cp.client_type=p_scope_client_type))
  or (p_scope_client_type='mixed' and exists(select 1 from public.client_profiles scope_cp where scope_cp.client_id=w.client_id and scope_cp.firm_id=w.firm_id and scope_cp.active and scope_cp.client_type='individual')
   and exists(select 1 from public.client_profiles scope_cp where scope_cp.client_id=w.client_id and scope_cp.firm_id=w.firm_id and scope_cp.active and scope_cp.client_type='company')))
), breakdowns as (
  select billing_entity_id as "billingEntityId",society,
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
    count(*) filter(where missing_price_alert) "missingPrice",
    count(*) filter(where billing_entity_id is null) "missingBilling"
  from entries group by billing_entity_id,society order by society,billing_entity_id
)
select coalesce(jsonb_agg(to_jsonb(breakdowns)),'[]'::jsonb) from breakdowns;
$$;
revoke all on function public.get_workflow_dashboard_metric_breakdowns(uuid,uuid,text) from public,anon;
grant execute on function public.get_workflow_dashboard_metric_breakdowns(uuid,uuid,text) to authenticated;
alter function public.get_workflow_dashboard_metric_breakdowns(uuid,uuid,text) set statement_timeout='30s';

-- Source: supabase/migrations/20260928153000_distinguish_unpriced_recent_movements.sql; original function SHA256 949b699f008fe1ed71f3f1ce56cefd0aa0db59231ce752f2f90f179ab3ed7064
create or replace function public.get_workflow_client_category_dashboard(p_client_type text default null,p_scope_billing_entity_id uuid default null,p_scope_professional_id uuid default null,p_scope_client_type text default null)
returns jsonb language sql stable security definer set search_path='' as $$
with mixed_clients as materialized(
  select cp.firm_id,cp.client_id from public.client_profiles cp where cp.active
  group by cp.firm_id,cp.client_id having count(distinct cp.client_type)>1
), entries as materialized(
  select w.work_date,w.created_at,w.activity_description,w.duration_minutes,w.is_invoiced,w.is_paid,w.status,
    w.firm_id,w.client_id,w.professional_id,w.billing_entity_id,w.billing_scope,w.effective_hourly_rate,
    private.visible_financial_value(w.firm_id,w.billing_entity_id,w.effective_amount) effective_amount
  from public.work_entries w
  join public.client_profiles cp on cp.id=w.client_profile_id
  left join mixed_clients mc on mc.firm_id=cp.firm_id and mc.client_id=cp.client_id
  where private.has_scope_access(w.firm_id,w.billing_entity_id,w.client_id,w.matter_id,'view')
 and (p_scope_billing_entity_id is null or w.billing_entity_id=p_scope_billing_entity_id)
 and (p_scope_professional_id is null or w.professional_id=p_scope_professional_id)
 and (p_scope_client_type is null
  or (p_scope_client_type in ('individual','company') and exists(select 1 from public.client_profiles scope_cp where scope_cp.id=w.client_profile_id and scope_cp.firm_id=w.firm_id and scope_cp.active and scope_cp.client_type=p_scope_client_type))
  or (p_scope_client_type='mixed' and exists(select 1 from public.client_profiles scope_cp where scope_cp.client_id=w.client_id and scope_cp.firm_id=w.firm_id and scope_cp.active and scope_cp.client_type='individual')
   and exists(select 1 from public.client_profiles scope_cp where scope_cp.client_id=w.client_id and scope_cp.firm_id=w.firm_id and scope_cp.active and scope_cp.client_type='company')))
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
  select work_date,activity_description,duration_minutes,effective_amount,billing_scope,
    private.can_view_billing_financials(firm_id,billing_entity_id) amount_accessible
  from entries order by work_date desc,created_at desc limit 8
), totals as (
  select coalesce(sum(duration_minutes),0) minutes,sum(effective_amount) total,
    sum(effective_amount) filter(where is_invoiced) invoiced,sum(effective_amount) filter(where is_paid) paid,
    count(*) movements,count(distinct client_id) clients,count(distinct professional_id) professionals,
    count(distinct billing_entity_id) billing_entities,
    count(*) filter(where not is_invoiced and status<>'uncollectible_uninvoiced') uninvoiced_count,
    count(*) filter(where is_invoiced and not is_paid and status<>'uncollectible_invoiced') unpaid_count,
    count(*) filter(where status in('uncollectible_uninvoiced','uncollectible_invoiced')) uncollectible_count,
    coalesce(sum(effective_amount) filter(where is_invoiced and not is_paid and status<>'uncollectible_invoiced'),0) pending,
    count(*) filter(where billing_scope='standard' and effective_hourly_rate is null) missing_price
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
revoke all on function public.get_workflow_client_category_dashboard(text,uuid,uuid,text) from public,anon;
grant execute on function public.get_workflow_client_category_dashboard(text,uuid,uuid,text) to authenticated;
alter function public.get_workflow_client_category_dashboard(text,uuid,uuid,text) set statement_timeout='30s';

-- Source: supabase/migrations/20260928153000_distinguish_unpriced_recent_movements.sql; original function SHA256 0311ace6c31e36ab4406ae7a173d6a7fb0d7a997e6dae4d1d1cbaf8efdd33706
create or replace function public.get_workflow_entity_dashboard_rolling(p_kind text,p_entity_id uuid default null,p_scope_billing_entity_id uuid default null,p_scope_professional_id uuid default null,p_scope_client_type text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path=''
set statement_timeout='30s'
as $$
declare
  selected_id uuid:=p_entity_id;
  result jsonb;
  viewer_id uuid:=(select auth.uid());
  viewer_firm_id uuid;
  viewer_role text;
begin
  select fm.firm_id,fm.role into viewer_firm_id,viewer_role
  from public.firm_members fm
  where fm.user_id=viewer_id and fm.active
    and private.has_completed_pin_setup(viewer_id)
  order by case when fm.role in('owner','admin','operator') then 0 else 1 end
  limit 1;
  if viewer_firm_id is null then raise exception 'not authorized' using errcode='42501'; end if;

  if p_kind not in('client','billing','professional') then
    raise exception 'Invalid entity kind';
  end if;

  if selected_id is null then
    select case p_kind when 'client' then w.client_id when 'billing' then w.billing_entity_id else w.professional_id end
    into selected_id
    from public.work_entries w
    where w.firm_id=viewer_firm_id and(viewer_role in('owner','admin','operator') or private.has_scope_access(w.firm_id,w.billing_entity_id,w.client_id,w.matter_id,'view'))
 and (p_scope_billing_entity_id is null or w.billing_entity_id=p_scope_billing_entity_id)
 and (p_scope_professional_id is null or w.professional_id=p_scope_professional_id)
 and (p_scope_client_type is null
  or (p_scope_client_type in ('individual','company') and exists(select 1 from public.client_profiles scope_cp where scope_cp.id=w.client_profile_id and scope_cp.firm_id=w.firm_id and scope_cp.active and scope_cp.client_type=p_scope_client_type))
  or (p_scope_client_type='mixed' and exists(select 1 from public.client_profiles scope_cp where scope_cp.client_id=w.client_id and scope_cp.firm_id=w.firm_id and scope_cp.active and scope_cp.client_type='individual')
   and exists(select 1 from public.client_profiles scope_cp where scope_cp.client_id=w.client_id and scope_cp.firm_id=w.firm_id and scope_cp.active and scope_cp.client_type='company')))
      and case p_kind when 'client' then w.client_id when 'billing' then w.billing_entity_id else w.professional_id end is not null
    order by w.work_date desc,w.id
    limit 1;
  end if;

  with entries as materialized(
    select w.work_date,w.created_at,w.activity_description,w.duration_minutes,w.is_invoiced,w.is_paid,w.status,
      w.firm_id,w.client_id,w.professional_id,w.billing_entity_id,w.billing_scope,w.effective_hourly_rate,
      c.display_name client_name,c.client_code,c.client_type,p.display_name professional_name,
      coalesce(b.name,'Sem sociedade') billing_name,
      case when viewer_role in('owner','admin') or exists(
        select 1 from public.billing_entity_financial_permissions fp
        where fp.firm_id=w.firm_id and fp.user_id=viewer_id
          and fp.billing_entity_id=w.billing_entity_id and fp.can_view_financials
      ) then w.effective_amount else null end effective_amount,
      case when p_kind='billing' then p.display_name else coalesce(b.name,'Sem sociedade') end segment_label
    from public.work_entries w
    join public.clients c on c.id=w.client_id
    join public.professionals p on p.id=w.professional_id
    left join public.billing_entities b on b.id=w.billing_entity_id
    where w.firm_id=viewer_firm_id and(viewer_role in('owner','admin','operator') or private.has_scope_access(w.firm_id,w.billing_entity_id,w.client_id,w.matter_id,'view'))
 and (p_scope_billing_entity_id is null or w.billing_entity_id=p_scope_billing_entity_id)
 and (p_scope_professional_id is null or w.professional_id=p_scope_professional_id)
 and (p_scope_client_type is null
  or (p_scope_client_type in ('individual','company') and exists(select 1 from public.client_profiles scope_cp where scope_cp.id=w.client_profile_id and scope_cp.firm_id=w.firm_id and scope_cp.active and scope_cp.client_type=p_scope_client_type))
  or (p_scope_client_type='mixed' and exists(select 1 from public.client_profiles scope_cp where scope_cp.client_id=w.client_id and scope_cp.firm_id=w.firm_id and scope_cp.active and scope_cp.client_type='individual')
   and exists(select 1 from public.client_profiles scope_cp where scope_cp.client_id=w.client_id and scope_cp.firm_id=w.firm_id and scope_cp.active and scope_cp.client_type='company')))
      and ((p_kind='client' and w.client_id=selected_id)
        or (p_kind='billing' and w.billing_entity_id=selected_id)
        or (p_kind='professional' and w.professional_id=selected_id))
  ), options as materialized(
    select distinct on(id) id,label from(
      select w.client_id id,c.display_name label
      from public.work_entries w join public.clients c on c.id=w.client_id
      where p_kind='client' and w.firm_id=viewer_firm_id and(viewer_role in('owner','admin','operator') or private.has_scope_access(w.firm_id,w.billing_entity_id,w.client_id,w.matter_id,'view'))
 and (p_scope_billing_entity_id is null or w.billing_entity_id=p_scope_billing_entity_id)
 and (p_scope_professional_id is null or w.professional_id=p_scope_professional_id)
 and (p_scope_client_type is null
  or (p_scope_client_type in ('individual','company') and exists(select 1 from public.client_profiles scope_cp where scope_cp.id=w.client_profile_id and scope_cp.firm_id=w.firm_id and scope_cp.active and scope_cp.client_type=p_scope_client_type))
  or (p_scope_client_type='mixed' and exists(select 1 from public.client_profiles scope_cp where scope_cp.client_id=w.client_id and scope_cp.firm_id=w.firm_id and scope_cp.active and scope_cp.client_type='individual')
   and exists(select 1 from public.client_profiles scope_cp where scope_cp.client_id=w.client_id and scope_cp.firm_id=w.firm_id and scope_cp.active and scope_cp.client_type='company')))
      union all
      select w.billing_entity_id,b.name
      from public.work_entries w join public.billing_entities b on b.id=w.billing_entity_id
      where p_kind='billing' and w.firm_id=viewer_firm_id and(viewer_role in('owner','admin','operator') or private.has_scope_access(w.firm_id,w.billing_entity_id,w.client_id,w.matter_id,'view'))
 and (p_scope_billing_entity_id is null or w.billing_entity_id=p_scope_billing_entity_id)
 and (p_scope_professional_id is null or w.professional_id=p_scope_professional_id)
 and (p_scope_client_type is null
  or (p_scope_client_type in ('individual','company') and exists(select 1 from public.client_profiles scope_cp where scope_cp.id=w.client_profile_id and scope_cp.firm_id=w.firm_id and scope_cp.active and scope_cp.client_type=p_scope_client_type))
  or (p_scope_client_type='mixed' and exists(select 1 from public.client_profiles scope_cp where scope_cp.client_id=w.client_id and scope_cp.firm_id=w.firm_id and scope_cp.active and scope_cp.client_type='individual')
   and exists(select 1 from public.client_profiles scope_cp where scope_cp.client_id=w.client_id and scope_cp.firm_id=w.firm_id and scope_cp.active and scope_cp.client_type='company')))
      union all
      select w.professional_id,p.display_name
      from public.work_entries w join public.professionals p on p.id=w.professional_id
      where p_kind='professional' and w.firm_id=viewer_firm_id and(viewer_role in('owner','admin','operator') or private.has_scope_access(w.firm_id,w.billing_entity_id,w.client_id,w.matter_id,'view'))
 and (p_scope_billing_entity_id is null or w.billing_entity_id=p_scope_billing_entity_id)
 and (p_scope_professional_id is null or w.professional_id=p_scope_professional_id)
 and (p_scope_client_type is null
  or (p_scope_client_type in ('individual','company') and exists(select 1 from public.client_profiles scope_cp where scope_cp.id=w.client_profile_id and scope_cp.firm_id=w.firm_id and scope_cp.active and scope_cp.client_type=p_scope_client_type))
  or (p_scope_client_type='mixed' and exists(select 1 from public.client_profiles scope_cp where scope_cp.client_id=w.client_id and scope_cp.firm_id=w.firm_id and scope_cp.active and scope_cp.client_type='individual')
   and exists(select 1 from public.client_profiles scope_cp where scope_cp.client_id=w.client_id and scope_cp.firm_id=w.firm_id and scope_cp.active and scope_cp.client_type='company')))
    ) scoped where id is not null order by id,label
  ), annual_totals as(
    select extract(year from work_date)::integer year_label,round(sum(effective_amount),2) value from entries group by 1
  ), annual_segments as(
    select extract(year from work_date)::integer year_label,segment_label,round(sum(effective_amount),2) value from entries group by 1,2
  ), annual as(
    select a.year_label label,a.value,coalesce((select jsonb_object_agg(s.segment_label,s.value order by s.segment_label) from annual_segments s where s.year_label=a.year_label),'{}'::jsonb) societies
    from annual_totals a order by a.year_label
  ), latest as(
    select date_trunc('month',max(work_date))::date value from entries
  ), calendar as(
    select generate_series((select value from latest)-interval '11 months',(select value from latest),interval '1 month')::date month_start
    where (select value from latest) is not null
  ), monthly_totals as(
    select c.month_start,round(sum(e.effective_amount),2) value
    from calendar c left join entries e on e.work_date>=c.month_start and e.work_date<c.month_start+interval '1 month'
    group by c.month_start
  ), monthly_segments as(
    select c.month_start,e.segment_label,round(sum(e.effective_amount),2) value
    from calendar c join entries e on e.work_date>=c.month_start and e.work_date<c.month_start+interval '1 month'
    group by c.month_start,e.segment_label
  ), monthly as(
    select to_char(m.month_start,'YYYY-MM') label,m.value,
      coalesce((select jsonb_object_agg(s.segment_label,s.value order by s.segment_label) from monthly_segments s where s.month_start=m.month_start),'{}'::jsonb) societies
    from monthly_totals m order by m.month_start
  ), recent as(
    select work_date,activity_description,duration_minutes,effective_amount,billing_scope,
      private.can_view_billing_financials(firm_id,billing_entity_id) amount_accessible
    from entries order by work_date desc,created_at desc limit 8
  ), totals as(
    select coalesce(sum(duration_minutes),0) minutes,
      case when count(*)=0 then 0 when count(effective_amount)=0 then null else coalesce(sum(effective_amount),0) end total,
      case when count(*)=0 then 0 when count(effective_amount)=0 then null else coalesce(sum(effective_amount) filter(where is_invoiced),0) end invoiced,
      case when count(*)=0 then 0 when count(effective_amount)=0 then null else coalesce(sum(effective_amount) filter(where is_paid),0) end paid,
      case when count(*)=0 then 0 when count(effective_amount)=0 then null else coalesce(sum(effective_amount) filter(where is_invoiced and not is_paid and status<>'uncollectible_invoiced'),0) end pending,
      count(*) movements,count(distinct client_id) clients,count(distinct professional_id) professionals,count(distinct billing_entity_id) billing_entities,
      count(*) filter(where not is_invoiced and status<>'uncollectible_uninvoiced') uninvoiced_count,
      count(*) filter(where is_invoiced and not is_paid and status<>'uncollectible_invoiced') unpaid_count,
      count(*) filter(where status in('uncollectible_uninvoiced','uncollectible_invoiced')) uncollectible_count,
      count(*) filter(where billing_scope='standard' and effective_hourly_rate is null) missing_price
    from entries
  )
  select jsonb_build_object(
    'selectedId',selected_id,
    'options',coalesce((select jsonb_agg(jsonb_build_object('id',id,'label',label) order by label) from options),'[]'::jsonb),
    'identity',case p_kind
      when 'client' then coalesce((select jsonb_build_object('title',client_name,'subtitle',case client_type when 'individual' then 'Particular' else 'Empresa' end,'code',client_code) from entries limit 1),jsonb_build_object('title','Sem dados','subtitle','Cliente','code',''))
      when 'billing' then coalesce((select jsonb_build_object('title',billing_name,'subtitle','Sociedade','code','') from entries limit 1),jsonb_build_object('title','Sem dados','subtitle','Sociedade','code',''))
      else coalesce((select jsonb_build_object('title',professional_name,'subtitle','Responsável','code','') from entries limit 1),jsonb_build_object('title','Sem dados','subtitle','Responsável','code','')) end,
    'metrics',jsonb_build_object(
      'minutes',t.minutes,'total',t.total,'invoiced',t.invoiced,'paid',t.paid,'pending',t.pending,
      'averageRate',case when t.minutes=0 or t.total is null then null else round(t.total*60/t.minutes,2) end,
      'movements',t.movements,'clients',t.clients,'professionals',t.professionals,'billingEntities',t.billing_entities,
      'uninvoicedCount',t.uninvoiced_count,'unpaidCount',t.unpaid_count,'uncollectibleCount',t.uncollectible_count,'missingPrice',t.missing_price),
    'annual',coalesce((select jsonb_agg(to_jsonb(annual)) from annual),'[]'::jsonb),
    'monthly',coalesce((select jsonb_agg(to_jsonb(monthly)) from monthly),'[]'::jsonb),
    'recent',coalesce((select jsonb_agg(to_jsonb(recent)) from recent),'[]'::jsonb)
  ) into result from totals t;
  return result;
end;
$$;
revoke all on function public.get_workflow_entity_dashboard_rolling(text,uuid,uuid,uuid,text) from public,anon;
grant execute on function public.get_workflow_entity_dashboard_rolling(text,uuid,uuid,uuid,text) to authenticated;
alter function public.get_workflow_entity_dashboard_rolling(text,uuid,uuid,uuid,text) set statement_timeout='30s';
commit;
