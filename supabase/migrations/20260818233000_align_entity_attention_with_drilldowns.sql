create or replace function public.get_entity_dashboard_rolling(
  p_kind text,
  p_entity_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  base jsonb;
  selected_id uuid;
  years jsonb;
  months jsonb;
  follow_up jsonb;
begin
  base := public.get_entity_dashboard(p_kind, p_entity_id);
  selected_id := nullif(base->>'selectedId', '')::uuid;

  with entries as materialized (
    select w.work_date,w.is_invoiced,w.is_paid,w.status,w.effective_hourly_rate,
      private.visible_financial_value(w.firm_id,w.billing_entity_id,w.effective_amount) effective_amount,
      case when p_kind='billing' then p.display_name else coalesce(b.name,'Sem sociedade') end segment_label
    from public.work_entries w
    join public.professionals p on p.id=w.professional_id
    left join public.billing_entities b on b.id=w.billing_entity_id
    where private.has_scope_access(w.firm_id,w.billing_entity_id,w.client_id,w.matter_id,'view')
      and ((p_kind='client' and w.client_id=selected_id)
        or (p_kind='billing' and w.billing_entity_id=selected_id)
        or (p_kind='professional' and w.professional_id=selected_id))
  ), annual_totals as (
    select extract(year from work_date)::integer year_label,round(sum(effective_amount),2) value from entries group by 1
  ), annual_segments as (
    select extract(year from work_date)::integer year_label,segment_label,round(sum(effective_amount),2) value from entries group by 1,2
  ), annual as (
    select a.year_label label,a.value,coalesce((select jsonb_object_agg(s.segment_label,s.value order by s.segment_label) from annual_segments s where s.year_label=a.year_label),'{}'::jsonb) societies
    from annual_totals a order by a.year_label
  ), latest as (
    select date_trunc('month',max(work_date))::date value from entries
  ), calendar as (
    select generate_series((select value from latest)-interval '11 months',(select value from latest),interval '1 month')::date month_start
    where (select value from latest) is not null
  ), monthly_totals as (
    select c.month_start,coalesce(round(sum(e.effective_amount),2),0) value
    from calendar c left join entries e on e.work_date>=c.month_start and e.work_date<c.month_start+interval '1 month'
    group by c.month_start
  ), monthly_segments as (
    select c.month_start,e.segment_label,round(sum(e.effective_amount),2) value
    from calendar c join entries e on e.work_date>=c.month_start and e.work_date<c.month_start+interval '1 month'
    group by c.month_start,e.segment_label
  ), monthly as (
    select to_char(m.month_start,'YYYY-MM') label,m.value,
      coalesce((select jsonb_object_agg(s.segment_label,s.value order by s.segment_label) from monthly_segments s where s.month_start=m.month_start),'{}'::jsonb) societies
    from monthly_totals m order by m.month_start
  ), tracking as (
    select
      count(*) filter(where not is_invoiced and status<>'uncollectible_uninvoiced') uninvoiced_count,
      count(*) filter(where is_invoiced and not is_paid and status<>'uncollectible_invoiced') unpaid_count,
      count(*) filter(where status in('uncollectible_uninvoiced','uncollectible_invoiced')) uncollectible_count,
      count(*) filter(where effective_hourly_rate is null) missing_price,
      coalesce(sum(effective_amount) filter(where is_invoiced and not is_paid and status<>'uncollectible_invoiced'),0) pending
    from entries
  )
  select coalesce((select jsonb_agg(to_jsonb(annual)) from annual),'[]'::jsonb),
    coalesce((select jsonb_agg(to_jsonb(monthly)) from monthly),'[]'::jsonb),
    (select jsonb_build_object('uninvoicedCount',uninvoiced_count,'unpaidCount',unpaid_count,
      'uncollectibleCount',uncollectible_count,'missingPrice',missing_price,'pending',pending) from tracking)
  into years,months,follow_up;

  return jsonb_set(jsonb_set(jsonb_set(base,'{annual}',years,true),'{monthly}',months,true),
    '{metrics}',coalesce(base->'metrics','{}'::jsonb)||follow_up,true);
end
$$;

revoke all on function public.get_entity_dashboard_rolling(text,uuid) from public,anon;
grant execute on function public.get_entity_dashboard_rolling(text,uuid) to authenticated;
alter function public.get_entity_dashboard_rolling(text,uuid) set statement_timeout='30s';
notify pgrst,'reload schema';

create or replace function public.get_professional_landing_summaries()
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
      case when financial.can_view then w.effective_amount end amount
    from public.work_entries w
    join scope_access scope on scope.firm_id=w.firm_id and scope.billing_entity_id is not distinct from w.billing_entity_id and scope.client_id=w.client_id and scope.matter_id is not distinct from w.matter_id
    join financial_access financial on financial.firm_id=w.firm_id and financial.billing_entity_id is not distinct from w.billing_entity_id
    where scope.can_view
  ),aggregated as(
    select a.professional_id,coalesce(sum(a.duration_minutes),0)::bigint minutes,sum(a.amount)total,
      sum(a.amount)filter(where a.is_invoiced)invoiced,count(distinct a.client_id)::bigint clients,
      count(*)filter(where not a.is_invoiced and a.status<>'uncollectible_uninvoiced')::bigint uninvoiced,
      count(*)filter(where a.is_invoiced and not a.is_paid and a.status<>'uncollectible_invoiced')::bigint unpaid,
      count(*)filter(where a.effective_hourly_rate is null)::bigint missing_price
    from accessible a group by a.professional_id
  )
  select p.id,p.display_name,coalesce(a.minutes,0)::bigint,coalesce(a.total,0),coalesce(a.invoiced,0),
    coalesce(a.clients,0)::bigint,coalesce(a.uninvoiced,0)::bigint,coalesce(a.unpaid,0)::bigint,coalesce(a.missing_price,0)::bigint
  from public.professionals p left join aggregated a on a.professional_id=p.id where p.active order by p.display_name;
$$;
revoke all on function public.get_professional_landing_summaries() from public,anon;
grant execute on function public.get_professional_landing_summaries() to authenticated,service_role;
notify pgrst,'reload schema';
