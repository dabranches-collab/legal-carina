-- Analyse complete workbooks in one set-based pass.
-- Avoids quadratic JSON concatenation for large imports.

create or replace function public.analyze_import_candidates(p_rows jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  target_firm_id uuid;
  latest_import_id uuid;
  result jsonb;
begin
  select fm.firm_id into target_firm_id
  from public.firm_members fm
  where fm.user_id = actor_id and fm.active and fm.role in ('owner', 'admin')
  order by case when fm.role = 'owner' then 0 else 1 end
  limit 1;

  if target_firm_id is null then
    raise exception 'only owner or administrator may analyse imports' using errcode = '42501';
  end if;
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) > 10000 then
    raise exception 'invalid candidate rows';
  end if;

  select i.id into latest_import_id
  from public.imports i
  where i.firm_id = target_firm_id and i.status = 'completed'
  order by i.completed_at desc nulls last, i.created_at desc
  limit 1;

  with candidates as materialized (
    select
      candidate,
      private.import_integer(candidate->>'sourceRow') as source_row,
      upper(btrim(candidate#>>'{cells,clientName,text}')) as client_name,
      btrim(candidate#>>'{cells,clientCode,text}') as client_code
    from jsonb_array_elements(p_rows) candidate
  ),
  matched as materialized (
    select
      c.*,
      w.id as work_entry_id,
      coalesce(changes.fields, '[]'::jsonb) as changed_fields,
      coalesce(w.has_manual_override, false) as has_manual_override
    from candidates c
    left join public.import_rows prior_row
      on prior_row.firm_id = target_firm_id
      and prior_row.import_id = latest_import_id
      and prior_row.source_row_number = c.source_row
    left join public.work_entries w
      on w.id = prior_row.work_entry_id
      and w.firm_id = prior_row.firm_id
    left join lateral (
      select private.import_changed_fields(c.candidate, w.id) as fields
      where w.id is not null
    ) changes on true
  ),
  classified as materialized (
    select
      m.*,
      case
        when m.work_entry_id is null then 'new'
        when jsonb_array_length(m.changed_fields) = 0 then 'unchanged'
        when m.has_manual_override then 'conflict'
        else 'update'
      end as action_name
    from matched m
  ),
  row_summary as (
    select
      coalesce(jsonb_agg(jsonb_build_object(
        'sourceRow', source_row,
        'action', action_name,
        'workEntryId', work_entry_id,
        'changedFields', changed_fields
      )), '[]'::jsonb) as rows,
      count(*) filter (where action_name = 'new') as new_rows,
      count(*) filter (where action_name = 'unchanged') as unchanged_rows,
      count(*) filter (where action_name = 'update') as updated_rows,
      count(*) filter (where action_name = 'conflict') as conflict_rows
    from classified
  ),
  client_summary as (
    select
      count(distinct c.client_name) filter (
        where c.client_name <> '' and exists (
          select 1 from public.clients existing
          where existing.firm_id = target_firm_id
            and (existing.client_code = c.client_code or upper(existing.display_name) = c.client_name)
        )
      ) as existing_clients,
      count(distinct c.client_name) filter (
        where c.client_name <> '' and not exists (
          select 1 from public.clients existing
          where existing.firm_id = target_firm_id
            and (existing.client_code = c.client_code or upper(existing.display_name) = c.client_name)
        )
      ) as new_clients
    from candidates c
  ),
  missing_summary as (
    select count(*) as missing_rows
    from public.import_rows prior_row
    where latest_import_id is not null
      and prior_row.firm_id = target_firm_id
      and prior_row.import_id = latest_import_id
      and prior_row.work_entry_id is not null
      and not exists (
        select 1 from candidates c where c.source_row = prior_row.source_row_number
      )
  )
  select jsonb_build_object(
    'rows', rs.rows,
    'newRows', rs.new_rows,
    'unchangedRows', rs.unchanged_rows,
    'updatedRows', rs.updated_rows,
    'conflictRows', rs.conflict_rows,
    'missingRows', ms.missing_rows,
    'existingClients', cs.existing_clients,
    'newClients', cs.new_clients
  ) into result
  from row_summary rs cross join client_summary cs cross join missing_summary ms;

  return result;
end;
$$;

revoke all on function public.analyze_import_candidates(jsonb) from public, anon;
grant execute on function public.analyze_import_candidates(jsonb) to authenticated;

notify pgrst, 'reload schema';
