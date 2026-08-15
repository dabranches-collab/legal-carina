-- Aggregated, RLS-aware read models for authenticated dashboards.

create or replace function public.get_dashboard_overview()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
with entries as (
  select w.*, c.display_name as client_name, c.client_type,
         b.name as billing_name, p.display_name as professional_name
  from public.work_entries w
  join public.clients c on c.id = w.client_id
  join public.professionals p on p.id = w.professional_id
  left join public.billing_entities b on b.id = w.billing_entity_id
), totals as (
  select coalesce(sum(duration_minutes),0) minutes,
         coalesce(sum(effective_amount),0) worked,
         coalesce(sum(effective_amount) filter (where is_invoiced),0) invoiced,
         coalesce(sum(effective_amount) filter (where is_paid),0) paid,
         count(*) filter (where not is_invoiced) uninvoiced_count,
         count(*) filter (where is_invoiced and not is_paid) unpaid_count,
         count(*) filter (where effective_hourly_rate is null) missing_price,
         count(*) filter (where has_manual_override) overrides,
         count(distinct client_id) active_clients
  from entries
), annual as (
  select extract(year from work_date)::int label, round(sum(effective_amount),2) value, sum(duration_minutes) minutes
  from entries group by 1 order by 1
), latest_year as (select max(extract(year from work_date)::int) value from entries), monthly as (
  select extract(month from work_date)::int label, round(sum(effective_amount),2) value
  from entries where extract(year from work_date)::int=(select value from latest_year) group by 1 order by 1
), by_client as (
  select client_name label, round(sum(effective_amount),2) value from entries group by client_name order by value desc limit 5
), by_billing as (
  select coalesce(billing_name,'Sem sociedade') label, round(sum(effective_amount),2) value from entries group by billing_name order by value desc
), by_professional as (
  select professional_name label, round(sum(effective_amount),2) value from entries group by professional_name order by value desc
), by_archive as (
  select coalesce(archive_status,'none') label, count(*) value from entries group by archive_status order by value desc
), client_types as (
  select client_type label, count(*) value from public.clients group by client_type
)
select jsonb_build_object(
  'metrics', jsonb_build_object(
    'minutes', t.minutes, 'worked', t.worked, 'invoiced', t.invoiced, 'paid', t.paid,
    'receivable', t.invoiced-t.paid, 'uninvoicedCount', t.uninvoiced_count,
    'unpaidCount', t.unpaid_count, 'averageRate', case when t.minutes=0 then 0 else round(t.worked*60/t.minutes,2) end,
    'activeClients', t.active_clients, 'missingPrice', t.missing_price, 'overrides', t.overrides,
    'importErrors', (select count(*) from public.imports where invalid_rows>0)
  ),
  'annual', coalesce((select jsonb_agg(to_jsonb(annual)) from annual),'[]'::jsonb),
  'monthly', coalesce((select jsonb_agg(to_jsonb(monthly)) from monthly),'[]'::jsonb),
  'latestYear', (select value from latest_year),
  'byClient', coalesce((select jsonb_agg(to_jsonb(by_client)) from by_client),'[]'::jsonb),
  'byBilling', coalesce((select jsonb_agg(to_jsonb(by_billing)) from by_billing),'[]'::jsonb),
  'byProfessional', coalesce((select jsonb_agg(to_jsonb(by_professional)) from by_professional),'[]'::jsonb),
  'byArchive', coalesce((select jsonb_agg(to_jsonb(by_archive)) from by_archive),'[]'::jsonb),
  'clientTypes', coalesce((select jsonb_agg(to_jsonb(client_types)) from client_types),'[]'::jsonb)
) from totals t;
$$;

create or replace function public.get_entity_dashboard(p_kind text, p_entity_id uuid default null)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  selected_id uuid;
  result jsonb;
begin
  if p_kind not in ('client','billing','professional') then raise exception 'Invalid entity kind'; end if;
  if p_kind='client' then select coalesce(p_entity_id,(select id from public.clients order by display_name limit 1)) into selected_id;
  elsif p_kind='billing' then select coalesce(p_entity_id,(select id from public.billing_entities order by name limit 1)) into selected_id;
  else select coalesce(p_entity_id,(select id from public.professionals order by display_name limit 1)) into selected_id;
  end if;

  with entries as (
    select w.*, c.display_name client_name, c.client_code, c.client_type,
           p.display_name professional_name, b.name billing_name
    from public.work_entries w join public.clients c on c.id=w.client_id
    join public.professionals p on p.id=w.professional_id left join public.billing_entities b on b.id=w.billing_entity_id
    where (p_kind='client' and w.client_id=selected_id)
       or (p_kind='billing' and w.billing_entity_id=selected_id)
       or (p_kind='professional' and w.professional_id=selected_id)
  ), annual as (
    select extract(year from work_date)::int label, round(sum(effective_amount),2) value from entries group by 1 order by 1
  ), monthly as (
    select extract(month from work_date)::int label, round(sum(effective_amount),2) value from entries
    where extract(year from work_date)=(select max(extract(year from work_date)) from entries) group by 1 order by 1
  ), recent as (
    select work_date, activity_description, duration_minutes, effective_amount from entries order by work_date desc, created_at desc limit 8
  ), totals as (
    select coalesce(sum(duration_minutes),0) minutes, coalesce(sum(effective_amount),0) total,
      coalesce(sum(effective_amount) filter(where is_invoiced),0) invoiced,
      coalesce(sum(effective_amount) filter(where is_paid),0) paid,
      count(*) movements, count(distinct client_id) clients, count(distinct professional_id) professionals,
      count(distinct billing_entity_id) billing_entities from entries
  )
  select jsonb_build_object(
    'selectedId', selected_id,
    'options', case p_kind
      when 'client' then (select coalesce(jsonb_agg(jsonb_build_object('id',id,'label',display_name) order by display_name),'[]'::jsonb) from public.clients)
      when 'billing' then (select coalesce(jsonb_agg(jsonb_build_object('id',id,'label',name) order by name),'[]'::jsonb) from public.billing_entities)
      else (select coalesce(jsonb_agg(jsonb_build_object('id',id,'label',display_name) order by display_name),'[]'::jsonb) from public.professionals) end,
    'identity', case p_kind
      when 'client' then (select jsonb_build_object('title',display_name,'subtitle',case client_type when 'individual' then 'Particular' else 'Sociedade' end,'code',client_code) from public.clients where id=selected_id)
      when 'billing' then (select jsonb_build_object('title',name,'subtitle','Sociedade faturante','code','') from public.billing_entities where id=selected_id)
      else (select jsonb_build_object('title',display_name,'subtitle','Profissional','code','') from public.professionals where id=selected_id) end,
    'metrics', jsonb_build_object('minutes',t.minutes,'total',t.total,'invoiced',t.invoiced,'paid',t.paid,'pending',t.invoiced-t.paid,
      'averageRate',case when t.minutes=0 then 0 else round(t.total*60/t.minutes,2) end,'movements',t.movements,'clients',t.clients,'professionals',t.professionals,'billingEntities',t.billing_entities),
    'annual',coalesce((select jsonb_agg(to_jsonb(annual)) from annual),'[]'::jsonb),
    'monthly',coalesce((select jsonb_agg(to_jsonb(monthly)) from monthly),'[]'::jsonb),
    'recent',coalesce((select jsonb_agg(to_jsonb(recent)) from recent),'[]'::jsonb)
  ) into result from totals t;
  return result;
end;
$$;

grant execute on function public.get_dashboard_overview() to authenticated;
grant execute on function public.get_entity_dashboard(text,uuid) to authenticated;
