create or replace function public.get_professional_landing_summaries()
returns table(
  id uuid,
  name text,
  minutes bigint,
  total numeric,
  invoiced numeric,
  clients bigint,
  uninvoiced bigint,
  unpaid bigint,
  "missingPrice" bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with scope_access as materialized (
    select targets.firm_id, targets.billing_entity_id, targets.client_id, targets.matter_id,
      private.has_scope_access(targets.firm_id, targets.billing_entity_id, targets.client_id, targets.matter_id, 'view') as can_view
    from (
      select distinct w.firm_id, w.billing_entity_id, w.client_id, w.matter_id
      from public.work_entries w
    ) targets
  ), financial_access as materialized (
    select targets.firm_id, targets.billing_entity_id,
      private.can_view_billing_financials(targets.firm_id, targets.billing_entity_id) as can_view
    from (
      select distinct w.firm_id, w.billing_entity_id from public.work_entries w
    ) targets
  ), accessible as materialized (
    select
      w.professional_id,
      w.client_id,
      w.duration_minutes,
      w.is_invoiced,
      w.is_paid,
      w.effective_hourly_rate,
      case when financial.can_view then w.effective_amount end as amount
    from public.work_entries w
    join scope_access scope on scope.firm_id = w.firm_id
      and scope.billing_entity_id is not distinct from w.billing_entity_id
      and scope.client_id = w.client_id
      and scope.matter_id is not distinct from w.matter_id
    join financial_access financial on financial.firm_id = w.firm_id
      and financial.billing_entity_id is not distinct from w.billing_entity_id
    where scope.can_view
  ), aggregated as (
    select
      a.professional_id,
      coalesce(sum(a.duration_minutes), 0)::bigint as minutes,
      sum(a.amount) as total,
      sum(a.amount) filter (where a.is_invoiced) as invoiced,
      count(distinct a.client_id)::bigint as clients,
      count(*) filter (where not a.is_invoiced)::bigint as uninvoiced,
      count(*) filter (where a.is_invoiced and not a.is_paid)::bigint as unpaid,
      count(*) filter (where a.effective_hourly_rate is null)::bigint as missing_price
    from accessible a
    group by a.professional_id
  )
  select
    p.id,
    p.display_name as name,
    coalesce(a.minutes, 0)::bigint,
    coalesce(a.total, 0),
    coalesce(a.invoiced, 0),
    coalesce(a.clients, 0)::bigint,
    coalesce(a.uninvoiced, 0)::bigint,
    coalesce(a.unpaid, 0)::bigint,
    coalesce(a.missing_price, 0)::bigint as "missingPrice"
  from public.professionals p
  left join aggregated a on a.professional_id = p.id
  where p.active
  order by p.display_name;
$$;

revoke all on function public.get_professional_landing_summaries() from public, anon;
grant execute on function public.get_professional_landing_summaries() to authenticated, service_role;
