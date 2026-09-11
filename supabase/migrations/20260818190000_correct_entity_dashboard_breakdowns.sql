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
    select
      w.work_date,
      w.is_invoiced,
      w.is_paid,
      w.effective_hourly_rate,
      private.visible_financial_value(
        w.firm_id,
        w.billing_entity_id,
        w.effective_amount
      ) as effective_amount,
      case
        when p_kind = 'billing' then p.display_name
        else coalesce(b.name, 'Sem sociedade')
      end as segment_label
    from public.work_entries w
    join public.professionals p on p.id = w.professional_id
    left join public.billing_entities b on b.id = w.billing_entity_id
    where private.has_scope_access(
      w.firm_id,
      w.billing_entity_id,
      w.client_id,
      w.matter_id,
      'view'
    )
    and (
      (p_kind = 'client' and w.client_id = selected_id)
      or (p_kind = 'billing' and w.billing_entity_id = selected_id)
      or (p_kind = 'professional' and w.professional_id = selected_id)
    )
  ), annual_totals as (
    select extract(year from work_date)::integer as year,
      round(sum(effective_amount), 2) as value
    from entries
    group by 1
  ), annual_segments as (
    select extract(year from work_date)::integer as year,
      segment_label,
      round(sum(effective_amount), 2) as value
    from entries
    group by 1, 2
  ), annual as (
    select a.year as label,
      a.value,
      coalesce((
        select jsonb_object_agg(s.segment_label, s.value order by s.segment_label)
        from annual_segments s
        where s.year = a.year
      ), '{}'::jsonb) as societies
    from annual_totals a
    order by a.year
  ), latest as (
    select date_trunc('month', max(work_date))::date as value from entries
  ), calendar as (
    select generate_series(
      (select value from latest) - interval '11 months',
      (select value from latest),
      interval '1 month'
    )::date as month_start
    where (select value from latest) is not null
  ), monthly_totals as (
    select c.month_start,
      coalesce(round(sum(e.effective_amount), 2), 0) as value
    from calendar c
    left join entries e
      on e.work_date >= c.month_start
      and e.work_date < c.month_start + interval '1 month'
    group by c.month_start
  ), monthly_segments as (
    select c.month_start,
      e.segment_label,
      round(sum(e.effective_amount), 2) as value
    from calendar c
    join entries e
      on e.work_date >= c.month_start
      and e.work_date < c.month_start + interval '1 month'
    group by c.month_start, e.segment_label
  ), monthly as (
    select to_char(m.month_start, 'YYYY-MM') as label,
      m.value,
      coalesce((
        select jsonb_object_agg(s.segment_label, s.value order by s.segment_label)
        from monthly_segments s
        where s.month_start = m.month_start
      ), '{}'::jsonb) as societies
    from monthly_totals m
    order by m.month_start
  ), tracking as (
    select
      count(*) filter (where not is_invoiced) as uninvoiced_count,
      count(*) filter (where is_invoiced and not is_paid) as unpaid_count,
      count(*) filter (where effective_hourly_rate is null) as missing_price
    from entries
  )
  select
    coalesce((select jsonb_agg(to_jsonb(annual)) from annual), '[]'::jsonb),
    coalesce((select jsonb_agg(to_jsonb(monthly)) from monthly), '[]'::jsonb),
    (select jsonb_build_object(
      'uninvoicedCount', uninvoiced_count,
      'unpaidCount', unpaid_count,
      'missingPrice', missing_price
    ) from tracking)
  into years, months, follow_up;

  return jsonb_set(
    jsonb_set(
      jsonb_set(base, '{annual}', years, true),
      '{monthly}', months, true
    ),
    '{metrics}',
    coalesce(base->'metrics', '{}'::jsonb) || follow_up,
    true
  );
end
$$;

revoke all on function public.get_entity_dashboard_rolling(text, uuid)
  from public, anon;
grant execute on function public.get_entity_dashboard_rolling(text, uuid)
  to authenticated;

alter function public.get_entity_dashboard_rolling(text, uuid)
  set statement_timeout = '30s';

notify pgrst, 'reload schema';
