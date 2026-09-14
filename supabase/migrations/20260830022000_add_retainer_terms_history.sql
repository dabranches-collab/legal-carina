-- Uma avença conserva todas as condições que vigoraram ao longo do tempo.
alter table public.client_retainers
  add column if not exists included_hours numeric(10,2)
  check (included_hours is null or included_hours >= 0);
alter table public.client_retainers
  add column if not exists billing_interval_months integer not null default 1
  check (billing_interval_months in (1,2,3,6,12));

alter table public.client_retainers
  drop constraint if exists client_retainers_firm_id_client_id_key;

create index if not exists client_retainers_client_period_idx
  on public.client_retainers(client_id, starts_on desc);

create or replace function private.prevent_overlapping_retainer_terms()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists (
    select 1
    from public.client_retainers current_terms
    where current_terms.firm_id = new.firm_id
      and current_terms.client_id = new.client_id
      and current_terms.id <> new.id
      and daterange(current_terms.starts_on, coalesce(current_terms.ends_on + 1, 'infinity'::date), '[)')
          && daterange(new.starts_on, coalesce(new.ends_on + 1, 'infinity'::date), '[)')
  ) then
    raise exception 'Já existem condições de avença que abrangem parte deste período.';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_overlapping_retainer_terms on public.client_retainers;
create trigger prevent_overlapping_retainer_terms
before insert or update of firm_id, client_id, starts_on, ends_on
on public.client_retainers for each row
execute function private.prevent_overlapping_retainer_terms();

create unique index if not exists retainer_charges_client_period_unique
  on public.retainer_charges(firm_id, client_id, period_start);

create or replace function public.get_client_retainer_summary(p_client_id uuid)
returns jsonb language sql stable security invoker set search_path='' as $$
with r as(
  select coalesce(jsonb_agg(to_jsonb(client_retainers) order by starts_on desc),'[]'::jsonb) terms
  from public.client_retainers where client_id=p_client_id
),
w as(select coalesce(sum(duration_minutes),0) minutes,count(*) movements,min(work_date) first_work,max(work_date) last_work from public.work_entries where client_id=p_client_id and billing_scope='retainer'),
c as(select coalesce(sum(amount),0) total,coalesce(sum(amount)filter(where status in('invoiced','paid','uncollectible')),0) invoiced,coalesce(sum(amount)filter(where status='paid'),0) paid,count(*) periods,count(*)filter(where status='pending') pending_periods,count(*)filter(where status='invoiced') unpaid_periods from public.retainer_charges where client_id=p_client_id)
select jsonb_build_object('retainers',r.terms,'minutes',w.minutes,'movements',w.movements,'firstWork',w.first_work,'lastWork',w.last_work,'chargesTotal',c.total,'invoiced',c.invoiced,'paid',c.paid,'periods',c.periods,'pendingPeriods',c.pending_periods,'unpaidPeriods',c.unpaid_periods,'effectiveHourlyRate',case when w.minutes=0 then null else round(c.invoiced*60/w.minutes,2)end) from r,w,c;
$$;

create or replace function public.get_retainer_management()
returns table(
  client_id uuid, client_name text, client_code text, terms_count bigint,
  current_monthly_amount numeric, currency text, included_hours numeric,
  billing_interval_months integer, consumption_period_start date, consumption_period_end date,
  period_used_minutes bigint, period_included_minutes numeric,
  current_starts_on date, current_ends_on date, billing_entity_name text,
  covered_minutes bigint, effective_hourly_rate numeric,
  pending_amount numeric, unpaid_amount numeric
) language sql stable security invoker set search_path='' as $$
  with clients_with_terms as (
    select distinct client_id from public.client_retainers
  ), current_terms as (
    select distinct on (r.client_id) r.*
    from public.client_retainers r
    where r.active and r.starts_on <= current_date and (r.ends_on is null or r.ends_on >= current_date)
    order by r.client_id, r.starts_on desc
  ), work as (
    select w.client_id, coalesce(sum(w.duration_minutes),0)::bigint covered_minutes
    from public.work_entries w where w.billing_scope='retainer' group by w.client_id
  ), charges as (
    select client_id,
      coalesce(sum(amount) filter(where status='pending'),0) pending_amount,
      coalesce(sum(amount) filter(where status='invoiced'),0) unpaid_amount,
      coalesce(sum(amount) filter(where status in('invoiced','paid','uncollectible')),0) invoiced_amount
    from public.retainer_charges group by client_id
  )
  select c.id,c.display_name,c.client_code,
    (select count(*) from public.client_retainers history where history.client_id=c.id),
    current_terms.monthly_amount,current_terms.currency,current_terms.included_hours,current_terms.billing_interval_months,
    consumption.period_start,consumption.period_end,coalesce(period_work.used_minutes,0),current_terms.included_hours*60,
    current_terms.starts_on,current_terms.ends_on,b.name,
    coalesce(work.covered_minutes,0),
    case when coalesce(work.covered_minutes,0)=0 then null else round(coalesce(charges.invoiced_amount,0)*60/work.covered_minutes,2) end,
    coalesce(charges.pending_amount,0),coalesce(charges.unpaid_amount,0)
  from clients_with_terms list
  join public.clients c on c.id=list.client_id
  left join current_terms on current_terms.client_id=c.id
  left join public.billing_entities b on b.id=current_terms.billing_entity_id
  left join lateral (
    select
      (current_terms.starts_on + make_interval(months => (greatest(0,((extract(year from age(current_date,current_terms.starts_on))*12+extract(month from age(current_date,current_terms.starts_on)))::integer/current_terms.billing_interval_months))*current_terms.billing_interval_months)))::date period_start,
      least(coalesce(current_terms.ends_on,'infinity'::date),(current_terms.starts_on + make_interval(months => (greatest(0,((extract(year from age(current_date,current_terms.starts_on))*12+extract(month from age(current_date,current_terms.starts_on)))::integer/current_terms.billing_interval_months)+1)*current_terms.billing_interval_months))-interval '1 day')::date) period_end
  ) consumption on current_terms.id is not null
  left join lateral (
    select coalesce(sum(w.duration_minutes),0)::bigint used_minutes from public.work_entries w
    where w.client_id=c.id and w.billing_scope='retainer' and w.work_date between consumption.period_start and consumption.period_end
  ) period_work on true
  left join work on work.client_id=c.id
  left join charges on charges.client_id=c.id
  order by c.display_name;
$$;
revoke all on function public.get_retainer_management() from public,anon;
grant execute on function public.get_retainer_management() to authenticated;

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
  (p_kind='historical'and(((item->>'is_invoiced')::boolean=true and nullif(item->>'invoice_date','')is null)or(item->>'has_historical_state_exception')::boolean=true))or
  (p_kind='retainer'and w.billing_scope='retainer')or
  (p_kind='missing_price'and w.billing_scope='standard'and w.effective_hourly_rate is null);
 return jsonb_build_object('items',filtered,'total',jsonb_array_length(filtered),'page',1,'pageSize',10000,'professionals',coalesce(payload->'professionals','[]'::jsonb),'billingEntities',coalesce(payload->'billingEntities','[]'::jsonb));
end;$$;

create or replace function public.get_work_attention_counts(
  p_search text default null,p_year integer default null,p_professional_id uuid default null,
  p_billing_entity_id uuid default null,p_archive text default null,p_client_type text default null,p_client_id uuid default null
) returns jsonb language sql stable security definer set search_path='' set statement_timeout='15s' as $$
with memberships as materialized(
 select fm.firm_id,bool_or(fm.role in('owner','admin','operator')) privileged
 from public.firm_members fm where fm.user_id=(select auth.uid()) and fm.active
 and private.has_completed_pin_setup((select auth.uid())) group by fm.firm_id
), filtered as materialized(
 select w.* from public.work_entries w join memberships m on m.firm_id=w.firm_id join public.clients c on c.id=w.client_id
 where (m.privileged or private.has_scope_access(w.firm_id,w.billing_entity_id,w.client_id,w.matter_id,'view'))
 and(p_search is null or btrim(p_search)='' or w.activity_description ilike '%'||p_search||'%' or coalesce(w.observations,'') ilike '%'||p_search||'%' or c.display_name ilike '%'||p_search||'%' or c.client_code ilike '%'||p_search||'%')
 and(p_year is null or w.work_date>=make_date(p_year,1,1) and w.work_date<make_date(p_year+1,1,1))
 and(p_professional_id is null or w.professional_id=p_professional_id) and(p_billing_entity_id is null or w.billing_entity_id=p_billing_entity_id)
 and(p_archive is null or w.archive_status=p_archive) and(p_client_type is null or exists(select 1 from public.client_profiles cp where cp.id=w.client_profile_id and cp.client_type=p_client_type and cp.active)) and(p_client_id is null or w.client_id=p_client_id)
)
select jsonb_build_object(
 'missing_society',count(*)filter(where billing_entity_id is null),
 'missing_price',count(*)filter(where billing_scope='standard' and effective_hourly_rate is null),
 'uninvoiced',count(*)filter(where billing_scope='standard'and not is_invoiced and status<>'uncollectible_uninvoiced'),
 'unpaid',count(*)filter(where billing_scope='standard'and is_invoiced and not is_paid and status<>'uncollectible_invoiced'),
 'historical',count(*)filter(where(is_invoiced and invoice_date is null)or has_historical_state_exception),
 'retainer',count(*)filter(where billing_scope='retainer')) from filtered;
$$;

notify pgrst,'reload schema';
