-- Financial permissions are enforced in PostgreSQL. Hiding controls in the UI is only an additional privacy aid.
drop policy if exists invoices_select_scoped on public.invoices;
create policy invoices_select_scoped on public.invoices for select to authenticated
using (
  (select private.has_scope_access(firm_id, billing_entity_id, client_id, null, 'view'))
  and (select private.can_view_billing_financials(firm_id, billing_entity_id))
);

drop policy if exists payments_select_scoped on public.payments;
create policy payments_select_scoped on public.payments for select to authenticated
using (exists (
  select 1 from public.invoices invoice
  where invoice.id = invoice_id
    and private.can_view_billing_financials(invoice.firm_id, invoice.billing_entity_id)
));

drop policy if exists invoice_lines_select_scoped on public.invoice_lines;
create policy invoice_lines_select_scoped on public.invoice_lines for select to authenticated
using (exists (
  select 1 from public.invoices invoice
  where invoice.id = invoice_id
    and private.can_view_billing_financials(invoice.firm_id, invoice.billing_entity_id)
));

drop policy if exists rate_rules_select_member on public.rate_rules;
create policy rate_rules_select_financial_scope on public.rate_rules for select to authenticated
using (
  (select private.has_firm_role(firm_id, array['owner','admin']))
  or (
    billing_entity_id is not null
    and (select private.can_view_billing_financials(firm_id, billing_entity_id))
  )
);

comment on table public.billing_entity_financial_permissions is
  'Autorização backend obrigatória para consultar valores financeiros por Sociedade; nunca depende apenas da interface.';

create or replace function private.visible_financial_value(
  target_firm_id uuid,
  target_billing_entity_id uuid,
  target_value numeric
)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when private.can_view_billing_financials(target_firm_id, target_billing_entity_id) then target_value
    else null
  end;
$$;

revoke all on function private.visible_financial_value(uuid, uuid, numeric) from public, anon;
grant execute on function private.visible_financial_value(uuid, uuid, numeric) to authenticated;

-- The search model masks both monetary fields before pagination and ordering. This
-- prevents callers without financial access from inferring values through amount sorting.
create or replace function public.search_work_entries(
  p_page integer default 1,
  p_page_size integer default 25,
  p_search text default null,
  p_year integer default null,
  p_professional_id uuid default null,
  p_billing_entity_id uuid default null,
  p_invoiced boolean default null,
  p_paid boolean default null,
  p_archive text default null,
  p_review_only boolean default false,
  p_sort text default 'work_date',
  p_direction text default 'desc'
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
with filtered as materialized (
  select
    w.id, w.work_date, w.activity_description, w.duration_minutes,
    private.visible_financial_value(w.firm_id, w.billing_entity_id, w.effective_hourly_rate) as effective_hourly_rate,
    private.visible_financial_value(w.firm_id, w.billing_entity_id, w.effective_amount) as effective_amount,
    w.is_invoiced, w.invoice_date, w.is_paid, w.archive_status, w.observations,
    w.source_type, w.has_manual_override, w.has_historical_state_exception,
    w.client_id, w.professional_id, w.billing_entity_id, w.matter_id, w.import_row_id
  from public.work_entries w
  where private.has_scope_access(w.firm_id, w.billing_entity_id, w.client_id, w.matter_id, 'view')
    and (
      p_search is null or btrim(p_search) = ''
      or w.activity_description ilike '%' || p_search || '%'
      or coalesce(w.observations, '') ilike '%' || p_search || '%'
      or exists (
        select 1 from public.clients search_client
        where search_client.id = w.client_id
          and (search_client.display_name ilike '%' || p_search || '%'
            or search_client.client_code ilike '%' || p_search || '%')
      )
    )
    and (p_year is null or w.work_date >= make_date(p_year, 1, 1) and w.work_date < make_date(p_year + 1, 1, 1))
    and (p_professional_id is null or w.professional_id = p_professional_id)
    and (p_billing_entity_id is null or w.billing_entity_id = p_billing_entity_id)
    and (p_invoiced is null or w.is_invoiced = p_invoiced)
    and (p_paid is null or w.is_paid = p_paid)
    and (p_archive is null or w.archive_status = p_archive)
    and (not p_review_only or w.has_historical_state_exception or exists (
      select 1 from public.import_rows review_row
      where review_row.id = w.import_row_id
        and jsonb_array_length(coalesce(review_row.validation_warnings, '[]'::jsonb)) > 0
    ))
), paged as (
  select f.* from filtered f
  order by
    case when p_sort = 'work_date' and p_direction = 'asc' then f.work_date end asc,
    case when p_sort = 'work_date' and p_direction = 'desc' then f.work_date end desc,
    case when p_sort = 'client' and p_direction = 'asc' then (select c.display_name from public.clients c where c.id = f.client_id) end asc,
    case when p_sort = 'client' and p_direction = 'desc' then (select c.display_name from public.clients c where c.id = f.client_id) end desc,
    case when p_sort = 'amount' and p_direction = 'asc' then f.effective_amount end asc nulls last,
    case when p_sort = 'amount' and p_direction = 'desc' then f.effective_amount end desc nulls last,
    f.work_date desc, f.id
  offset (greatest(p_page, 1) - 1) * least(greatest(p_page_size, 10), 100)
  limit least(greatest(p_page_size, 10), 100)
), items as (
  select p.id, p.work_date, p.activity_description, p.duration_minutes,
    p.effective_hourly_rate, p.effective_amount, p.is_invoiced, p.invoice_date,
    p.is_paid, p.archive_status, p.observations, p.source_type,
    p.has_manual_override, p.has_historical_state_exception,
    c.display_name as client_name, c.client_code,
    matter.matter_code, matter.title as matter_title,
    professional.display_name as professional_name, billing.name as billing_entity_name,
    coalesce(import_row.validation_warnings, '[]'::jsonb) as validation_warnings
  from paged p
  join public.clients c on c.id = p.client_id
  join public.professionals professional on professional.id = p.professional_id
  left join public.matters matter on matter.id = p.matter_id
  left join public.billing_entities billing on billing.id = p.billing_entity_id
  left join public.import_rows import_row on import_row.id = p.import_row_id
)
select jsonb_build_object(
  'items', coalesce((select jsonb_agg(to_jsonb(items)) from items), '[]'::jsonb),
  'total', (select count(*) from filtered), 'page', greatest(p_page, 1),
  'pageSize', least(greatest(p_page_size, 10), 100),
  'professionals', (select coalesce(jsonb_agg(jsonb_build_object('id', professional.id, 'label', professional.display_name) order by professional.display_name), '[]'::jsonb) from public.professionals professional where exists(select 1 from filtered f where f.professional_id=professional.id)),
  'billingEntities', (select coalesce(jsonb_agg(jsonb_build_object('id', billing.id, 'label', billing.name) order by billing.name), '[]'::jsonb) from public.billing_entities billing where exists(select 1 from filtered f where f.billing_entity_id=billing.id))
);
$$;

revoke all on function public.search_work_entries(integer,integer,text,integer,uuid,uuid,boolean,boolean,text,boolean,text,text) from public, anon;
grant execute on function public.search_work_entries(integer,integer,text,integer,uuid,uuid,boolean,boolean,text,boolean,text,text) to authenticated;

-- Direct PostgREST reads would otherwise bypass column masking. Work entries are
-- therefore exposed to the application through the scoped read models only.
revoke select on public.work_entries from authenticated;

create or replace function public.get_dashboard_overview()
returns jsonb
language sql stable security definer set search_path = ''
as $$
with entries as materialized (
  select w.work_date, w.duration_minutes, w.is_invoiced, w.is_paid, w.archive_status,
    w.has_manual_override, w.client_id, w.billing_entity_id,
    private.visible_financial_value(w.firm_id,w.billing_entity_id,w.effective_hourly_rate) effective_hourly_rate,
    private.visible_financial_value(w.firm_id,w.billing_entity_id,w.effective_amount) effective_amount,
    c.display_name client_name, c.client_type, b.name billing_name, p.display_name professional_name
  from public.work_entries w
  join public.clients c on c.id=w.client_id
  join public.professionals p on p.id=w.professional_id
  left join public.billing_entities b on b.id=w.billing_entity_id
  where private.has_scope_access(w.firm_id,w.billing_entity_id,w.client_id,w.matter_id,'view')
), totals as (
  select coalesce(sum(duration_minutes),0) minutes, sum(effective_amount) worked,
    sum(effective_amount) filter(where is_invoiced) invoiced,
    sum(effective_amount) filter(where is_paid) paid,
    count(*) filter(where not is_invoiced) uninvoiced_count,
    count(*) filter(where is_invoiced and not is_paid) unpaid_count,
    count(*) filter(where effective_hourly_rate is null) missing_price,
    count(*) filter(where has_manual_override) overrides, count(distinct client_id) active_clients
  from entries
), annual_totals as (
  select extract(year from work_date)::int label,round(sum(effective_amount),2) value,sum(duration_minutes) minutes
  from entries group by 1
), annual as (
  select a.label,a.value,a.minutes,
    coalesce((select jsonb_object_agg(series.society,series.value) from (
      select coalesce(e2.billing_name,'Sem sociedade') society,round(sum(e2.effective_amount),2) value
      from entries e2 where extract(year from e2.work_date)::int=a.label group by 1
    ) series),'{}'::jsonb) societies
  from annual_totals a order by a.label
), latest_year as (select max(extract(year from work_date)::int) value from entries), latest_month as (
  select date_trunc('month',current_date)::date value
), rolling_months as (
  select generate_series((select value from latest_month)-interval '11 months',(select value from latest_month),interval '1 month')::date month_start
  where (select value from latest_month) is not null
), monthly as (
  select to_char(m.month_start,'YYYY-MM') label,round(coalesce(sum(e.effective_amount),0),2) value,
    coalesce((select jsonb_object_agg(series.society,series.value) from (
      select coalesce(e2.billing_name,'Sem sociedade') society,round(sum(e2.effective_amount),2) value
      from entries e2 where e2.work_date>=m.month_start and e2.work_date<m.month_start+interval '1 month' group by 1
    ) series),'{}'::jsonb) societies
  from rolling_months m left join entries e on e.work_date>=m.month_start and e.work_date<m.month_start+interval '1 month'
  group by m.month_start order by m.month_start
), monthly_by_year as (
  select extract(year from work_date)::int year, extract(month from work_date)::int month,
    round(sum(effective_amount),2) value
  from entries group by 1,2 order by 1,2
), billing_monthly as (
  select s.society,to_char(m.month_start,'YYYY-MM') period,round(coalesce(sum(e.effective_amount),0),2) value
  from rolling_months m cross join (select distinct coalesce(billing_name,'Sem sociedade') society from entries) s
  left join entries e on e.work_date>=m.month_start and e.work_date<m.month_start+interval '1 month'
    and coalesce(e.billing_name,'Sem sociedade')=s.society
  group by s.society,m.month_start order by m.month_start,s.society
), billing_annual as (
  select coalesce(billing_name,'Sem sociedade') society, extract(year from work_date)::int year,
    round(sum(effective_amount),2) value
  from entries group by 1,2 order by 1,2
), by_client as (
  select client_name label,round(sum(effective_amount),2) value from entries group by client_name order by value desc nulls last limit 5
), by_billing as (
  select coalesce(billing_name,'Sem sociedade') label,round(sum(effective_amount),2) value from entries group by billing_name order by value desc nulls last
), by_professional as (
  select professional_name label,round(sum(effective_amount),2) value from entries group by professional_name order by value desc nulls last
), by_archive as (
  select coalesce(archive_status,'none') label,count(*) value from entries group by archive_status order by value desc
), client_types as (
  select client_type label,count(distinct client_id) value from entries group by client_type
)
select jsonb_build_object(
 'metrics',jsonb_build_object('minutes',t.minutes,'worked',t.worked,'invoiced',t.invoiced,'paid',t.paid,
   'receivable',case when t.invoiced is null then null else t.invoiced-coalesce(t.paid,0) end,
   'uninvoicedCount',t.uninvoiced_count,'unpaidCount',t.unpaid_count,
   'averageRate',case when t.minutes=0 or t.worked is null then null else round(t.worked*60/t.minutes,2) end,
   'activeClients',t.active_clients,'missingPrice',t.missing_price,'overrides',t.overrides,
   'importErrors',(select count(*) from public.imports i where i.invalid_rows>0 and private.is_firm_member(i.firm_id))),
 'annual',coalesce((select jsonb_agg(to_jsonb(annual)) from annual),'[]'::jsonb),
 'monthly',coalesce((select jsonb_agg(to_jsonb(monthly)) from monthly),'[]'::jsonb),
 'monthlyByYear',coalesce((select jsonb_agg(to_jsonb(monthly_by_year)) from monthly_by_year),'[]'::jsonb),
 'billingMonthly',coalesce((select jsonb_agg(to_jsonb(billing_monthly)) from billing_monthly),'[]'::jsonb),
 'billingAnnual',coalesce((select jsonb_agg(to_jsonb(billing_annual)) from billing_annual),'[]'::jsonb),
 'latestYear',(select value from latest_year),
 'byClient',coalesce((select jsonb_agg(to_jsonb(by_client)) from by_client),'[]'::jsonb),
 'byBilling',coalesce((select jsonb_agg(to_jsonb(by_billing)) from by_billing),'[]'::jsonb),
 'byProfessional',coalesce((select jsonb_agg(to_jsonb(by_professional)) from by_professional),'[]'::jsonb),
 'byArchive',coalesce((select jsonb_agg(to_jsonb(by_archive)) from by_archive),'[]'::jsonb),
 'clientTypes',coalesce((select jsonb_agg(to_jsonb(client_types)) from client_types),'[]'::jsonb)
) from totals t;
$$;

revoke all on function public.get_dashboard_overview() from public,anon;
grant execute on function public.get_dashboard_overview() to authenticated;

create or replace function public.get_entity_dashboard(p_kind text,p_entity_id uuid default null)
returns jsonb
language plpgsql stable security definer set search_path=''
as $$
declare selected_id uuid; result jsonb;
begin
  if p_kind not in ('client','billing','professional') then raise exception 'Invalid entity kind'; end if;
  if p_kind='client' then
    select coalesce(p_entity_id,(select w.client_id from public.work_entries w where private.has_scope_access(w.firm_id,w.billing_entity_id,w.client_id,w.matter_id,'view') order by w.work_date desc limit 1)) into selected_id;
  elsif p_kind='billing' then
    select coalesce(p_entity_id,(select w.billing_entity_id from public.work_entries w where w.billing_entity_id is not null and private.has_scope_access(w.firm_id,w.billing_entity_id,w.client_id,w.matter_id,'view') order by w.work_date desc limit 1)) into selected_id;
  else
    select coalesce(p_entity_id,(select w.professional_id from public.work_entries w where private.has_scope_access(w.firm_id,w.billing_entity_id,w.client_id,w.matter_id,'view') order by w.work_date desc limit 1)) into selected_id;
  end if;

  if p_entity_id is not null and not exists(
    select 1 from public.work_entries w where private.has_scope_access(w.firm_id,w.billing_entity_id,w.client_id,w.matter_id,'view') and
      ((p_kind='client' and w.client_id=p_entity_id)or(p_kind='billing'and w.billing_entity_id=p_entity_id)or(p_kind='professional'and w.professional_id=p_entity_id))
  ) then raise exception 'Entity access denied' using errcode='42501'; end if;
  with entries as materialized (
    select w.work_date,w.created_at,w.activity_description,w.duration_minutes,w.is_invoiced,w.is_paid,
      w.client_id,w.professional_id,w.billing_entity_id,
      private.visible_financial_value(w.firm_id,w.billing_entity_id,w.effective_amount) effective_amount
    from public.work_entries w
    where private.has_scope_access(w.firm_id,w.billing_entity_id,w.client_id,w.matter_id,'view') and
      ((p_kind='client' and w.client_id=selected_id) or (p_kind='billing' and w.billing_entity_id=selected_id) or (p_kind='professional' and w.professional_id=selected_id))
  ), annual as (select extract(year from work_date)::int label,round(sum(effective_amount),2)value from entries group by 1 order by 1),
  monthly as (select extract(month from work_date)::int label,round(sum(effective_amount),2)value from entries where extract(year from work_date)=(select max(extract(year from work_date))from entries)group by 1 order by 1),
  recent as (select work_date,activity_description,duration_minutes,effective_amount from entries order by work_date desc,created_at desc limit 8),
  totals as (select coalesce(sum(duration_minutes),0)minutes,sum(effective_amount)total,sum(effective_amount)filter(where is_invoiced)invoiced,sum(effective_amount)filter(where is_paid)paid,count(*)movements,count(distinct client_id)clients,count(distinct professional_id)professionals,count(distinct billing_entity_id)billing_entities from entries)
  select jsonb_build_object('selectedId',selected_id,
    'options',case p_kind
      when 'client' then(select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'label',c.display_name)order by c.display_name),'[]'::jsonb)from public.clients c where exists(select 1 from public.work_entries w where w.client_id=c.id and private.has_scope_access(w.firm_id,w.billing_entity_id,w.client_id,w.matter_id,'view')))
      when 'billing' then(select coalesce(jsonb_agg(jsonb_build_object('id',b.id,'label',b.name)order by b.name),'[]'::jsonb)from public.billing_entities b where exists(select 1 from public.work_entries w where w.billing_entity_id=b.id and private.has_scope_access(w.firm_id,w.billing_entity_id,w.client_id,w.matter_id,'view')))
      else(select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'label',p.display_name)order by p.display_name),'[]'::jsonb)from public.professionals p where exists(select 1 from public.work_entries w where w.professional_id=p.id and private.has_scope_access(w.firm_id,w.billing_entity_id,w.client_id,w.matter_id,'view')))end,
    'identity',case p_kind when 'client' then(select jsonb_build_object('title',display_name,'subtitle',case client_type when'individual'then'Particular'else'Empresa'end,'code',client_code)from public.clients where id=selected_id)when'billing'then(select jsonb_build_object('title',name,'subtitle','Sociedade','code','')from public.billing_entities where id=selected_id)else(select jsonb_build_object('title',display_name,'subtitle','Responsável','code','')from public.professionals where id=selected_id)end,
    'metrics',jsonb_build_object('minutes',t.minutes,'total',t.total,'invoiced',t.invoiced,'paid',t.paid,'pending',case when t.invoiced is null then null else t.invoiced-coalesce(t.paid,0)end,'averageRate',case when t.minutes=0 or t.total is null then null else round(t.total*60/t.minutes,2)end,'movements',t.movements,'clients',t.clients,'professionals',t.professionals,'billingEntities',t.billing_entities),
    'annual',coalesce((select jsonb_agg(to_jsonb(annual))from annual),'[]'::jsonb),'monthly',coalesce((select jsonb_agg(to_jsonb(monthly))from monthly),'[]'::jsonb),'recent',coalesce((select jsonb_agg(to_jsonb(recent))from recent),'[]'::jsonb)) into result from totals t;
  return result;
end;$$;

revoke all on function public.get_entity_dashboard(text,uuid) from public,anon;
grant execute on function public.get_entity_dashboard(text,uuid) to authenticated;

create or replace function public.get_client_category_dashboard(p_client_type text default null)
returns jsonb
language sql stable security definer set search_path=''
as $$
with mixed_clients as materialized(
 select cp.firm_id,cp.client_id from public.client_profiles cp where cp.active group by cp.firm_id,cp.client_id having count(distinct cp.client_type)>1
),entries as materialized(
 select w.work_date,w.created_at,w.activity_description,w.duration_minutes,w.is_invoiced,w.is_paid,w.client_id,w.professional_id,w.billing_entity_id,
   private.visible_financial_value(w.firm_id,w.billing_entity_id,w.effective_amount)effective_amount
 from public.work_entries w join public.client_profiles cp on cp.id=w.client_profile_id
 left join mixed_clients mc on mc.firm_id=cp.firm_id and mc.client_id=cp.client_id
 where private.has_scope_access(w.firm_id,w.billing_entity_id,w.client_id,w.matter_id,'view') and
 (p_client_type is null or(p_client_type in('individual','company')and cp.client_type=p_client_type)or(p_client_type='mixed'and mc.client_id is not null))
),latest_year as(select max(extract(year from work_date)::int)value from entries),
annual as(select extract(year from work_date)::int label,round(sum(effective_amount),2)value from entries group by 1 order by 1),
monthly as(select extract(month from work_date)::int label,round(sum(effective_amount),2)value from entries where extract(year from work_date)::int=(select value from latest_year)group by 1 order by 1),
recent as(select work_date,activity_description,duration_minutes,effective_amount from entries order by work_date desc,created_at desc limit 8),
totals as(select coalesce(sum(duration_minutes),0)minutes,sum(effective_amount)total,sum(effective_amount)filter(where is_invoiced)invoiced,sum(effective_amount)filter(where is_paid)paid,count(*)movements,count(distinct client_id)clients,count(distinct professional_id)professionals,count(distinct billing_entity_id)billing_entities from entries)
select jsonb_build_object('selectedId',coalesce(p_client_type,'all'),'options','[]'::jsonb,
 'identity',jsonb_build_object('title',case p_client_type when'individual'then'Particulares'when'company'then'Empresas'when'mixed'then'Clientes mistos'else'Todos os clientes'end,'subtitle',case p_client_type when'individual'then'Clientes particulares'when'company'then'Clientes empresariais'when'mixed'then'Clientes com vertente particular e empresa'else'Consolidado de particulares e empresas'end,'code',''),
 'metrics',jsonb_build_object('minutes',t.minutes,'total',t.total,'invoiced',t.invoiced,'paid',t.paid,'pending',case when t.invoiced is null then null else t.invoiced-coalesce(t.paid,0)end,'averageRate',case when t.minutes=0 or t.total is null then null else round(t.total*60/t.minutes,2)end,'movements',t.movements,'clients',t.clients,'professionals',t.professionals,'billingEntities',t.billing_entities),
 'annual',coalesce((select jsonb_agg(to_jsonb(annual))from annual),'[]'::jsonb),'monthly',coalesce((select jsonb_agg(to_jsonb(monthly))from monthly),'[]'::jsonb),'recent',coalesce((select jsonb_agg(to_jsonb(recent))from recent),'[]'::jsonb))from totals t where p_client_type is null or p_client_type in('individual','company','mixed');
$$;

revoke all on function public.get_client_category_dashboard(text) from public,anon;
grant execute on function public.get_client_category_dashboard(text) to authenticated;

-- Privileged pricing routines are not exposed directly while the public,
-- society-scoped confirmation endpoints are being finalised.
revoke all on function private.apply_work_entry_override(uuid,text,jsonb,text) from authenticated;
revoke all on function private.recalculate_work_entries(uuid[],boolean,boolean) from authenticated;

create or replace function private.prepare_work_entry()
returns trigger
language plpgsql
set search_path=''
as $$
declare is_recalculation boolean:=coalesce(current_setting('app.pricing_recalculation',true),'')='on';
begin
 if tg_op='INSERT' then
  if(new.imported_hourly_rate is not null or new.calculated_hourly_rate is not null or new.effective_hourly_rate is not null or new.calculated_amount is not null or new.effective_amount is not null or new.imported_amount is not null or new.manual_amount is not null or new.is_invoiced or new.is_paid)
    and not(private.has_scope_access(new.firm_id,new.billing_entity_id,new.client_id,new.matter_id,'edit') and private.can_view_billing_financials(new.firm_id,new.billing_entity_id))then
    raise exception 'financial values require edit and financial permission for the Society' using errcode='42501';
  end if;
  new.imported_duration_minutes:=coalesce(new.imported_duration_minutes,case when new.source_type in('xlsx','csv')then new.duration_minutes end);
  new.effective_hourly_rate:=coalesce(new.effective_hourly_rate,new.specific_hourly_rate,new.calculated_hourly_rate,new.imported_hourly_rate);
  new.calculated_amount:=coalesce(new.calculated_amount,round((new.duration_minutes::numeric/60)*new.calculated_hourly_rate,2));
  new.effective_amount:=coalesce(new.effective_amount,new.imported_amount,new.calculated_amount,round((new.duration_minutes::numeric/60)*new.effective_hourly_rate,2));
  return new;
 end if;
 if(new.billing_entity_id is distinct from old.billing_entity_id or new.imported_hourly_rate is distinct from old.imported_hourly_rate or new.calculated_hourly_rate is distinct from old.calculated_hourly_rate or new.effective_hourly_rate is distinct from old.effective_hourly_rate or new.calculated_amount is distinct from old.calculated_amount or new.effective_amount is distinct from old.effective_amount or new.effective_discount_amount is distinct from old.effective_discount_amount or new.currency is distinct from old.currency or new.is_invoiced is distinct from old.is_invoiced or new.invoice_date is distinct from old.invoice_date or new.is_paid is distinct from old.is_paid)
 and not(private.has_scope_access(old.firm_id,old.billing_entity_id,old.client_id,old.matter_id,'edit') and private.can_view_billing_financials(old.firm_id,old.billing_entity_id) and(new.billing_entity_id is not distinct from old.billing_entity_id or private.can_view_billing_financials(old.firm_id,new.billing_entity_id)))then
  raise exception 'financial fields require edit and financial permission for the Society' using errcode='42501';
 end if;
 if is_recalculation and old.has_manual_override then raise exception 'recalculation cannot replace a manual override';end if;
 if new.duration_minutes is distinct from old.duration_minutes and not is_recalculation and not private.has_current_override(old.id,'duration_minutes',to_jsonb(new.duration_minutes))then raise exception 'duration_minutes requires a matching manual override';end if;
 if new.effective_hourly_rate is distinct from old.effective_hourly_rate and not is_recalculation and not private.has_current_override(old.id,'effective_hourly_rate',to_jsonb(new.effective_hourly_rate))then raise exception 'effective_hourly_rate requires a matching manual override';end if;
 if new.effective_discount_amount is distinct from old.effective_discount_amount and not is_recalculation and not private.has_current_override(old.id,'effective_discount_amount',to_jsonb(new.effective_discount_amount))then raise exception 'effective_discount_amount requires a matching manual override';end if;
 if new.effective_amount is distinct from old.effective_amount and not is_recalculation and not private.has_current_override(old.id,'effective_amount',to_jsonb(new.effective_amount))then raise exception 'effective_amount requires a matching manual override';end if;
 if new.billing_entity_id is distinct from old.billing_entity_id and not private.has_current_override(old.id,'billing_entity_id',to_jsonb(new.billing_entity_id))then raise exception 'billing_entity_id requires a matching manual override';end if;
 if new.is_invoiced is distinct from old.is_invoiced and not private.has_current_override(old.id,'is_invoiced',to_jsonb(new.is_invoiced))then raise exception 'is_invoiced requires a matching manual override';end if;
 if new.is_paid is distinct from old.is_paid and not private.has_current_override(old.id,'is_paid',to_jsonb(new.is_paid))then raise exception 'is_paid requires a matching manual override';end if;
 return new;
end;$$;
