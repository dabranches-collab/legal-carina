create index if not exists work_entries_client_profile_date_idx
  on public.work_entries (client_profile_id, work_date desc);

create or replace function public.get_client_category_dashboard(p_client_type text default null)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
with mixed_clients as materialized (
  select cp.firm_id, cp.client_id
  from public.client_profiles cp
  where cp.active
  group by cp.firm_id, cp.client_id
  having count(distinct cp.client_type) > 1
), entries as materialized (
  select
    w.work_date, w.created_at, w.activity_description, w.duration_minutes,
    w.effective_amount, w.is_invoiced, w.is_paid, w.client_id,
    w.professional_id, w.billing_entity_id
  from public.work_entries w
  join public.client_profiles cp on cp.id = w.client_profile_id
  left join mixed_clients mc on mc.firm_id = cp.firm_id and mc.client_id = cp.client_id
  where p_client_type is null
    or (p_client_type in ('individual','company') and cp.client_type = p_client_type)
    or (p_client_type = 'mixed' and mc.client_id is not null)
), latest_year as (
  select max(extract(year from work_date)::int) value from entries
), annual as (
  select extract(year from work_date)::int label, round(sum(effective_amount),2) value
  from entries group by 1 order by 1
), monthly as (
  select extract(month from work_date)::int label, round(sum(effective_amount),2) value
  from entries
  where extract(year from work_date)::int = (select value from latest_year)
  group by 1 order by 1
), recent as (
  select work_date, activity_description, duration_minutes, effective_amount
  from entries order by work_date desc, created_at desc limit 8
), totals as (
  select coalesce(sum(duration_minutes),0) minutes, coalesce(sum(effective_amount),0) total,
    coalesce(sum(effective_amount) filter(where is_invoiced),0) invoiced,
    coalesce(sum(effective_amount) filter(where is_paid),0) paid,
    count(*) movements, count(distinct client_id) clients,
    count(distinct professional_id) professionals,
    count(distinct billing_entity_id) billing_entities
  from entries
)
select jsonb_build_object(
  'selectedId',coalesce(p_client_type,'all'), 'options','[]'::jsonb,
  'identity',jsonb_build_object(
    'title',case p_client_type when 'individual' then 'Particulares' when 'company' then 'Empresas' when 'mixed' then 'Clientes mistos' else 'Todos os clientes' end,
    'subtitle',case p_client_type when 'individual' then 'Clientes particulares' when 'company' then 'Clientes empresariais' when 'mixed' then 'Clientes com vertente particular e empresa' else 'Consolidado de particulares e empresas' end,
    'code',''),
  'metrics',jsonb_build_object('minutes',t.minutes,'total',t.total,'invoiced',t.invoiced,'paid',t.paid,'pending',t.invoiced-t.paid,
    'averageRate',case when t.minutes=0 then 0 else round(t.total*60/t.minutes,2) end,'movements',t.movements,'clients',t.clients,'professionals',t.professionals,'billingEntities',t.billing_entities),
  'annual',coalesce((select jsonb_agg(to_jsonb(annual)) from annual),'[]'::jsonb),
  'monthly',coalesce((select jsonb_agg(to_jsonb(monthly)) from monthly),'[]'::jsonb),
  'recent',coalesce((select jsonb_agg(to_jsonb(recent)) from recent),'[]'::jsonb)
) from totals t where p_client_type is null or p_client_type in ('individual','company','mixed');
$$;

revoke all on function public.get_client_category_dashboard(text) from public, anon;
grant execute on function public.get_client_category_dashboard(text) to authenticated;
