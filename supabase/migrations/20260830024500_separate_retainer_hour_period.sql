-- A cadência de facturação e o período do pacote de horas são independentes.
alter table public.client_retainers
  add column if not exists hours_interval_months integer not null default 1
  check (hours_interval_months in (1,3,6,12));

update public.client_retainers
set hours_interval_months = case when billing_interval_months in (1,3,6,12) then billing_interval_months else 1 end;

drop function if exists public.get_retainer_management();
create function public.get_retainer_management()
returns table(
  client_id uuid, client_name text, client_code text, terms_count bigint,
  current_monthly_amount numeric, currency text, included_hours numeric,
  billing_interval_months integer, hours_interval_months integer,
  consumption_period_start date, consumption_period_end date,
  period_used_minutes bigint, period_included_minutes numeric,
  current_starts_on date, current_ends_on date, billing_entity_name text,
  covered_minutes bigint, effective_hourly_rate numeric,
  pending_amount numeric, unpaid_amount numeric
) language sql stable security invoker set search_path='' as $$
  with clients_with_terms as (
    select distinct client_id from public.client_retainers
  ), current_terms as (
    select distinct on (r.client_id) r.* from public.client_retainers r
    where r.active and r.starts_on<=current_date and(r.ends_on is null or r.ends_on>=current_date)
    order by r.client_id,r.starts_on desc
  ), work as (
    select w.client_id,coalesce(sum(w.duration_minutes),0)::bigint covered_minutes
    from public.work_entries w where w.billing_scope='retainer' group by w.client_id
  ), charges as (
    select client_id,coalesce(sum(amount)filter(where status='pending'),0)pending_amount,
      coalesce(sum(amount)filter(where status='invoiced'),0)unpaid_amount,
      coalesce(sum(amount)filter(where status in('invoiced','paid','uncollectible')),0)invoiced_amount
    from public.retainer_charges group by client_id
  )
  select c.id,c.display_name,c.client_code,
    (select count(*) from public.client_retainers history where history.client_id=c.id),
    current_terms.monthly_amount,current_terms.currency,current_terms.included_hours,
    current_terms.billing_interval_months,current_terms.hours_interval_months,
    consumption.period_start,consumption.period_end,coalesce(period_work.used_minutes,0),current_terms.included_hours*60,
    current_terms.starts_on,current_terms.ends_on,b.name,coalesce(work.covered_minutes,0),
    case when coalesce(work.covered_minutes,0)=0 then null else round(coalesce(charges.invoiced_amount,0)*60/work.covered_minutes,2)end,
    coalesce(charges.pending_amount,0),coalesce(charges.unpaid_amount,0)
  from clients_with_terms list join public.clients c on c.id=list.client_id
  left join current_terms on current_terms.client_id=c.id
  left join public.billing_entities b on b.id=current_terms.billing_entity_id
  left join lateral(
    select
      (current_terms.starts_on+make_interval(months=>(greatest(0,((extract(year from age(current_date,current_terms.starts_on))*12+extract(month from age(current_date,current_terms.starts_on)))::integer/current_terms.hours_interval_months))*current_terms.hours_interval_months)))::date period_start,
      least(coalesce(current_terms.ends_on,'infinity'::date),(current_terms.starts_on+make_interval(months=>(greatest(0,((extract(year from age(current_date,current_terms.starts_on))*12+extract(month from age(current_date,current_terms.starts_on)))::integer/current_terms.hours_interval_months)+1)*current_terms.hours_interval_months))-interval '1 day')::date)period_end
  )consumption on current_terms.id is not null
  left join lateral(select coalesce(sum(w.duration_minutes),0)::bigint used_minutes from public.work_entries w where w.client_id=c.id and w.billing_scope='retainer' and w.work_date between consumption.period_start and consumption.period_end)period_work on true
  left join work on work.client_id=c.id left join charges on charges.client_id=c.id order by c.display_name;
$$;
revoke all on function public.get_retainer_management() from public,anon;
grant execute on function public.get_retainer_management() to authenticated;
notify pgrst,'reload schema';
