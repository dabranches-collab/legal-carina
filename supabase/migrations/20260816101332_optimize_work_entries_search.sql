create or replace function private.has_scope_permission(
  target_firm_id uuid,
  target_billing_entity_id uuid default null,
  target_client_id uuid default null,
  target_matter_id uuid default null,
  required_permission text default 'view'
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    exists (
      select 1
      from public.firm_members fm
      where fm.firm_id = target_firm_id
        and fm.user_id = (select auth.uid())
        and fm.active
        and fm.role in ('owner', 'admin')
    )
    or exists (
      select 1
      from public.access_grants ag
      where ag.firm_id = target_firm_id
        and ag.active
        and ag.valid_from <= now()
        and (ag.valid_until is null or ag.valid_until > now())
        and private.permission_rank(ag.permission) >= private.permission_rank(required_permission)
        and (
          (ag.principal_type = 'user' and ag.user_id = (select auth.uid()))
          or (ag.principal_type = 'team' and exists (
            select 1
            from public.team_members tm
            where tm.team_id = ag.team_id
              and tm.user_id = (select auth.uid())
              and tm.firm_id = target_firm_id
          ))
        )
        and (
          ag.resource_type = 'firm'
          or (ag.resource_type = 'billing_entity' and ag.billing_entity_id = target_billing_entity_id)
          or (ag.resource_type = 'client' and ag.client_id = target_client_id)
          or (ag.resource_type = 'matter' and ag.matter_id = target_matter_id)
        )
    );
$$;

revoke all on function private.has_scope_permission(uuid,uuid,uuid,uuid,text) from public, anon;
grant execute on function private.has_scope_permission(uuid,uuid,uuid,uuid,text) to authenticated;

drop policy if exists work_entries_select_scoped on public.work_entries;
create policy work_entries_select_scoped on public.work_entries
for select to authenticated
using (
  (select private.has_accepted_current_terms((select auth.uid())))
  and private.has_scope_permission(firm_id, billing_entity_id, client_id, matter_id, 'view')
);

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
security invoker
set search_path = ''
as $$
with filtered as materialized (
  select
    w.id, w.work_date, w.activity_description, w.duration_minutes,
    w.effective_hourly_rate, w.effective_amount, w.is_invoiced,
    w.invoice_date, w.is_paid, w.archive_status, w.observations,
    w.source_type, w.has_manual_override, w.has_historical_state_exception,
    w.client_id, w.professional_id, w.billing_entity_id, w.import_row_id
  from public.work_entries w
  where (
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
    and (
      not p_review_only
      or w.has_historical_state_exception
      or exists (
        select 1 from public.import_rows review_row
        where review_row.id = w.import_row_id
          and jsonb_array_length(coalesce(review_row.validation_warnings, '[]'::jsonb)) > 0
      )
    )
), paged as (
  select f.*
  from filtered f
  order by
    case when p_sort = 'work_date' and p_direction = 'asc' then f.work_date end asc,
    case when p_sort = 'work_date' and p_direction = 'desc' then f.work_date end desc,
    case when p_sort = 'client' and p_direction = 'asc' then (select c.display_name from public.clients c where c.id = f.client_id) end asc,
    case when p_sort = 'client' and p_direction = 'desc' then (select c.display_name from public.clients c where c.id = f.client_id) end desc,
    case when p_sort = 'amount' and p_direction = 'asc' then f.effective_amount end asc,
    case when p_sort = 'amount' and p_direction = 'desc' then f.effective_amount end desc,
    f.work_date desc, f.id
  offset (greatest(p_page, 1) - 1) * least(greatest(p_page_size, 10), 100)
  limit least(greatest(p_page_size, 10), 100)
), items as (
  select
    p.id, p.work_date, p.activity_description, p.duration_minutes,
    p.effective_hourly_rate, p.effective_amount, p.is_invoiced,
    p.invoice_date, p.is_paid, p.archive_status, p.observations,
    p.source_type, p.has_manual_override, p.has_historical_state_exception,
    c.display_name as client_name, c.client_code,
    professional.display_name as professional_name,
    billing.name as billing_entity_name,
    coalesce(import_row.validation_warnings, '[]'::jsonb) as validation_warnings
  from paged p
  join public.clients c on c.id = p.client_id
  join public.professionals professional on professional.id = p.professional_id
  left join public.billing_entities billing on billing.id = p.billing_entity_id
  left join public.import_rows import_row on import_row.id = p.import_row_id
)
select jsonb_build_object(
  'items', coalesce((select jsonb_agg(to_jsonb(items)) from items), '[]'::jsonb),
  'total', (select count(*) from filtered),
  'page', greatest(p_page, 1),
  'pageSize', least(greatest(p_page_size, 10), 100),
  'professionals', (
    select coalesce(jsonb_agg(jsonb_build_object('id', id, 'label', display_name) order by display_name), '[]'::jsonb)
    from public.professionals
  ),
  'billingEntities', (
    select coalesce(jsonb_agg(jsonb_build_object('id', id, 'label', name) order by name), '[]'::jsonb)
    from public.billing_entities
  )
);
$$;

revoke all on function public.search_work_entries(integer,integer,text,integer,uuid,uuid,boolean,boolean,text,boolean,text,text) from public, anon;
grant execute on function public.search_work_entries(integer,integer,text,integer,uuid,uuid,boolean,boolean,text,boolean,text,text) to authenticated;

;
