create or replace function public.get_entity_dashboard_rolling(p_kind text,p_entity_id uuid default null)
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
begin
  if p_kind not in('client','billing','professional') then
    raise exception 'Invalid entity kind';
  end if;

  if selected_id is null then
    select case p_kind when 'client' then w.client_id when 'billing' then w.billing_entity_id else w.professional_id end
    into selected_id
    from public.work_entries w
    where private.has_scope_access(w.firm_id,w.billing_entity_id,w.client_id,w.matter_id,'view')
      and case p_kind when 'client' then w.client_id when 'billing' then w.billing_entity_id else w.professional_id end is not null
    order by w.work_date desc,w.id
    limit 1;
  end if;

  with entries as materialized(
    select w.work_date,w.created_at,w.activity_description,w.duration_minutes,w.is_invoiced,w.is_paid,w.status,
      w.client_id,w.professional_id,w.billing_entity_id,w.effective_hourly_rate,
      c.display_name client_name,c.client_code,c.client_type,p.display_name professional_name,
      coalesce(b.name,'Sem sociedade') billing_name,
      private.visible_financial_value(w.firm_id,w.billing_entity_id,w.effective_amount) effective_amount,
      case when p_kind='billing' then p.display_name else coalesce(b.name,'Sem sociedade') end segment_label
    from public.work_entries w
    join public.clients c on c.id=w.client_id
    join public.professionals p on p.id=w.professional_id
    left join public.billing_entities b on b.id=w.billing_entity_id
    where private.has_scope_access(w.firm_id,w.billing_entity_id,w.client_id,w.matter_id,'view')
      and ((p_kind='client' and w.client_id=selected_id)
        or (p_kind='billing' and w.billing_entity_id=selected_id)
        or (p_kind='professional' and w.professional_id=selected_id))
  ), options as materialized(
    select distinct on(id) id,label from(
      select w.client_id id,c.display_name label
      from public.work_entries w join public.clients c on c.id=w.client_id
      where p_kind='client' and private.has_scope_access(w.firm_id,w.billing_entity_id,w.client_id,w.matter_id,'view')
      union all
      select w.billing_entity_id,b.name
      from public.work_entries w join public.billing_entities b on b.id=w.billing_entity_id
      where p_kind='billing' and private.has_scope_access(w.firm_id,w.billing_entity_id,w.client_id,w.matter_id,'view')
      union all
      select w.professional_id,p.display_name
      from public.work_entries w join public.professionals p on p.id=w.professional_id
      where p_kind='professional' and private.has_scope_access(w.firm_id,w.billing_entity_id,w.client_id,w.matter_id,'view')
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
    select work_date,activity_description,duration_minutes,effective_amount from entries order by work_date desc,created_at desc limit 8
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
      count(*) filter(where effective_hourly_rate is null) missing_price
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

revoke all on function public.get_entity_dashboard_rolling(text,uuid) from public,anon;
grant execute on function public.get_entity_dashboard_rolling(text,uuid) to authenticated;
notify pgrst,'reload schema';
