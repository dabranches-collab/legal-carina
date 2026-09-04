-- Reconcile the complete workbook against the latest imported lineage.
-- This migration intentionally depends on 20260816181000_commit_validated_import.sql.

create or replace function private.import_changed_fields(p_row jsonb, p_work_entry_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(field_name order by ordinal), '[]'::jsonb)
  from (
    select field_name, ordinal
    from public.work_entries w
    join public.clients c on c.id = w.client_id and c.firm_id = w.firm_id
    join public.client_profiles cp on cp.id = w.client_profile_id and cp.firm_id = w.firm_id
    join public.professionals p on p.id = w.professional_id and p.firm_id = w.firm_id
    left join public.billing_entities b on b.id = w.billing_entity_id and b.firm_id = w.firm_id
    cross join lateral (values
      ('date', 1, to_jsonb(w.work_date) is distinct from to_jsonb(private.import_date(p_row#>>'{normalized,date}'))),
      ('client', 2, upper(c.display_name) is distinct from upper(btrim(p_row#>>'{cells,clientName,text}'))),
      ('clientCode', 3, upper(c.client_code) is distinct from upper(btrim(p_row#>>'{cells,clientCode,text}'))),
      ('clientType', 4, cp.client_type is distinct from p_row#>>'{normalized,clientType}'),
      ('activity', 5, upper(w.activity_description) is distinct from upper(btrim(p_row#>>'{cells,activity,text}'))),
      ('responsible', 6, upper(p.display_name) is distinct from upper(btrim(p_row#>>'{cells,responsible,text}'))),
      ('duration', 7, w.imported_duration_minutes is distinct from private.import_integer(p_row#>>'{normalized,durationMinutes}')),
      ('hourlyRate', 8, w.imported_hourly_rate is distinct from private.import_numeric(p_row#>>'{normalized,hourlyRate}')),
      ('amount', 9, w.imported_amount is distinct from private.import_numeric(p_row#>>'{normalized,importedAmount}')),
      ('billingEntity', 10, upper(coalesce(b.name, '')) is distinct from upper(btrim(coalesce(p_row#>>'{cells,billingEntity,text}', '')))),
      ('invoiced', 11, w.is_invoiced is distinct from coalesce(private.import_boolean(p_row#>>'{normalized,invoiced}'), false)),
      ('invoiceDate', 12, w.invoice_date is distinct from private.import_date(p_row#>>'{normalized,invoiceDate}')),
      ('paid', 13, w.is_paid is distinct from coalesce(private.import_boolean(p_row#>>'{normalized,paid}'), false)),
      ('archive', 14, w.archive_status is distinct from nullif(p_row#>>'{normalized,archive}', '')),
      ('notes', 15, coalesce(w.observations, '') is distinct from btrim(coalesce(p_row#>>'{cells,notes,text}', '')))
    ) changed(field_name, ordinal, differs)
    where w.id = p_work_entry_id and differs
  ) differences;
$$;

revoke all on function private.import_changed_fields(jsonb, uuid) from public, anon, authenticated;

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
  candidate jsonb;
  candidate_source_row integer;
  matched_work_entry_id uuid;
  changed_fields jsonb;
  action_name text;
  reconciliation_rows jsonb := '[]'::jsonb;
  known_clients text[] := '{}';
  new_clients text[] := '{}';
  missing_rows integer := 0;
  new_rows integer := 0;
  unchanged_rows integer := 0;
  updated_rows integer := 0;
  conflict_rows integer := 0;
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

  for candidate in select value from jsonb_array_elements(p_rows) loop
    candidate_source_row := private.import_integer(candidate->>'sourceRow');
    matched_work_entry_id := null;

    if latest_import_id is not null and candidate_source_row is not null then
      select w.id into matched_work_entry_id
      from public.import_rows prior_row
      join public.work_entries w on w.id = prior_row.work_entry_id and w.firm_id = prior_row.firm_id
      where prior_row.firm_id = target_firm_id
        and prior_row.import_id = latest_import_id
        and prior_row.source_row_number = candidate_source_row
      limit 1;
    end if;

    if exists (
      select 1 from public.clients c
      where c.firm_id = target_firm_id
        and (c.client_code = btrim(candidate#>>'{cells,clientCode,text}')
          or upper(c.display_name) = upper(btrim(candidate#>>'{cells,clientName,text}')))
    ) then
      known_clients := array_append(known_clients, upper(btrim(candidate#>>'{cells,clientName,text}')));
    else
      new_clients := array_append(new_clients, upper(btrim(candidate#>>'{cells,clientName,text}')));
    end if;

    if matched_work_entry_id is null then
      action_name := 'new';
      changed_fields := '[]'::jsonb;
      new_rows := new_rows + 1;
    else
      changed_fields := private.import_changed_fields(candidate, matched_work_entry_id);
      if jsonb_array_length(changed_fields) = 0 then
        action_name := 'unchanged';
        unchanged_rows := unchanged_rows + 1;
      elsif exists (select 1 from public.work_entries w where w.id = matched_work_entry_id and w.has_manual_override) then
        action_name := 'conflict';
        conflict_rows := conflict_rows + 1;
      else
        action_name := 'update';
        updated_rows := updated_rows + 1;
      end if;
    end if;

    reconciliation_rows := reconciliation_rows || jsonb_build_array(jsonb_build_object(
      'sourceRow', candidate_source_row,
      'action', action_name,
      'workEntryId', matched_work_entry_id,
      'changedFields', changed_fields
    ));
  end loop;

  if latest_import_id is not null then
    select count(*) into missing_rows
    from public.import_rows prior_row
    where prior_row.firm_id = target_firm_id
      and prior_row.import_id = latest_import_id
      and prior_row.work_entry_id is not null
      and not exists (
        select 1 from jsonb_array_elements(p_rows) candidate_row
        where private.import_integer(candidate_row->>'sourceRow') = prior_row.source_row_number
      );
  end if;

  return jsonb_build_object(
    'rows', reconciliation_rows,
    'newRows', new_rows,
    'unchangedRows', unchanged_rows,
    'updatedRows', updated_rows,
    'conflictRows', conflict_rows,
    'missingRows', missing_rows,
    'existingClients', (select count(distinct item) from unnest(known_clients) item where item <> ''),
    'newClients', (select count(distinct item) from unnest(new_clients) item where item <> '')
  );
end;
$$;

revoke all on function public.analyze_import_candidates(jsonb) from public, anon;
grant execute on function public.analyze_import_candidates(jsonb) to authenticated;

create or replace function public.commit_validated_import(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_variable
declare
  actor_id uuid := (select auth.uid());
  target_firm_id uuid;
  import_id uuid := gen_random_uuid();
  analysis jsonb;
  reconciliation jsonb;
  row_data jsonb;
  directory_data jsonb;
  row_id uuid;
  work_id uuid;
  matched_work_id uuid;
  client_id uuid;
  profile_id uuid;
  professional_id uuid;
  billing_id uuid;
  client_name text;
  client_code text;
  client_type text;
  responsible_name text;
  billing_name text;
  errors jsonb;
  warnings jsonb;
  row_status text;
  source_type text;
  action_name text;
  new_count integer := 0;
  updated_count integer := 0;
  unchanged_count integer := 0;
  invalid_count integer := 0;
  exception_state boolean;
  archive_value text;
begin
  if actor_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  select fm.firm_id into target_firm_id
  from public.firm_members fm
  where fm.user_id = actor_id and fm.active and fm.role in ('owner', 'admin')
  order by case when fm.role = 'owner' then 0 else 1 end
  limit 1;
  if target_firm_id is null then raise exception 'only owner or administrator may confirm an import' using errcode = '42501'; end if;
  if jsonb_typeof(p_payload->'rows') <> 'array' or jsonb_array_length(p_payload->'rows') > 10000 then raise exception 'invalid import row collection'; end if;
  if coalesce(p_payload->>'fileName', '') !~* '^[^/\\]+\.(xlsx|csv)$'
    or coalesce(p_payload->>'sha256', '') !~ '^[0-9a-f]{64}$'
    or coalesce(private.import_bigint(p_payload->>'fileSize'), -1) < 0
    or coalesce(private.import_bigint(p_payload->>'fileSize'), 0) > 52428800 then
    raise exception 'invalid file metadata';
  end if;
  if exists (select 1 from public.imports i where i.firm_id = target_firm_id and i.file_hash = p_payload->>'sha256') then
    raise exception 'this file was already imported';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(target_firm_id::text, 0));
  analysis := public.analyze_import_candidates(p_payload->'rows');
  if coalesce(private.import_integer(analysis->>'conflictRows'), 0) > 0 then
    raise exception 'manual changes conflict with this workbook; review is required';
  end if;

  source_type := case when lower(p_payload->>'fileName') like '%.csv' then 'csv' else 'xlsx' end;
  insert into public.imports(id, firm_id, original_filename, file_hash, file_size, status, total_rows, valid_rows, warning_rows, invalid_rows, duplicate_rows, imported_by, started_at)
  values(import_id, target_firm_id, left(p_payload->>'fileName', 255), p_payload->>'sha256', greatest(0, coalesce(private.import_bigint(p_payload->>'fileSize'), 0)), 'importing', jsonb_array_length(p_payload->'rows'), coalesce(private.import_integer(p_payload#>>'{summary,validRows}'), 0), coalesce(private.import_integer(p_payload#>>'{summary,warningRows}'), 0), coalesce(private.import_integer(p_payload#>>'{summary,invalidRows}'), 0), 0, actor_id, now());

  if p_payload ? 'clientDirectory' then
    if jsonb_typeof(p_payload->'clientDirectory') <> 'array' or jsonb_array_length(p_payload->'clientDirectory') > 10000 then raise exception 'invalid client directory'; end if;
    for directory_data in select value from jsonb_array_elements(p_payload->'clientDirectory') loop
      client_name := btrim(coalesce(directory_data->>'name', ''));
      client_code := btrim(coalesce(directory_data->>'code', ''));
      client_type := directory_data->>'clientType';
      if client_name = '' or client_code = '' or client_type not in ('individual', 'company') then continue; end if;
      client_id := null; profile_id := null;
      select c.id into client_id from public.clients c where c.firm_id = target_firm_id and (c.client_code = client_code or upper(c.display_name) = upper(client_name)) order by case when c.client_code = client_code then 0 else 1 end limit 1;
      if client_id is null then insert into public.clients(firm_id, client_code, client_type, display_name) values(target_firm_id, client_code, client_type, client_name) returning id into client_id; end if;
      select cp.id into profile_id from public.client_profiles cp where cp.firm_id = target_firm_id and cp.client_id = client_id and cp.client_type = client_type;
      if profile_id is null then insert into public.client_profiles(firm_id, client_id, client_type, client_code) values(target_firm_id, client_id, client_type, client_code); end if;
    end loop;
  end if;

  for row_data in select value from jsonb_array_elements(p_payload->'rows') loop
    row_id := gen_random_uuid();
    work_id := gen_random_uuid();
    select item into reconciliation from jsonb_array_elements(analysis->'rows') item where private.import_integer(item->>'sourceRow') = private.import_integer(row_data->>'sourceRow') limit 1;
    action_name := coalesce(reconciliation->>'action', 'conflict');
    matched_work_id := nullif(reconciliation->>'workEntryId', '')::uuid;

    select coalesce(jsonb_agg(issue->>'code'), '[]'::jsonb) into errors from jsonb_array_elements(coalesce(row_data->'issues', '[]'::jsonb)) issue where issue->>'severity' = 'error';
    select coalesce(jsonb_agg(issue->>'code'), '[]'::jsonb) into warnings from jsonb_array_elements(coalesce(row_data->'issues', '[]'::jsonb)) issue where issue->>'severity' = 'warning';
    if private.import_date(row_data#>>'{normalized,date}') is null
      or coalesce(private.import_integer(row_data#>>'{normalized,durationMinutes}'), 0) < 1
      or btrim(coalesce(row_data#>>'{cells,clientName,text}', '')) = ''
      or btrim(coalesce(row_data#>>'{cells,activity,text}', '')) = ''
      or btrim(coalesce(row_data#>>'{cells,responsible,text}', '')) = '' then
      errors := errors || '["backend_validation_failed"]'::jsonb;
    end if;
    row_status := case when jsonb_array_length(errors) > 0 then 'invalid' when jsonb_array_length(warnings) > 0 then 'warning' else 'valid' end;

    insert into public.import_rows(id, firm_id, import_id, sheet_name, source_row_number, raw_data, normalized_data, validation_errors, validation_warnings, row_hash, status, work_entry_id)
    values(row_id, target_firm_id, import_id, left(coalesce(p_payload->>'selectedSheet', 'DADOS'), 100), greatest(1, coalesce(private.import_integer(row_data->>'sourceRow'), 1)), coalesce(row_data->'cells', '{}'::jsonb), coalesce(row_data->'normalized', '{}'::jsonb), errors, warnings || case when action_name = 'update' then jsonb_build_array('source_row_updated') else '[]'::jsonb end, encode(extensions.digest(convert_to((p_payload->>'sha256') || '|' || coalesce(p_payload->>'selectedSheet', 'DADOS') || '|' || coalesce(row_data->>'sourceRow', '') || '|' || coalesce(row_data->>'fingerprint', ''), 'UTF8'), 'sha256'), 'hex'), case when row_status = 'invalid' then 'invalid' when action_name = 'unchanged' then 'skipped' else 'pending' end, matched_work_id);

    if row_status = 'invalid' then invalid_count := invalid_count + 1; continue; end if;
    if action_name = 'conflict' then raise exception 'ambiguous or manually changed source row requires review'; end if;

    client_name := btrim(coalesce(row_data#>>'{cells,clientName,text}', ''));
    client_code := btrim(coalesce(row_data#>>'{cells,clientCode,text}', ''));
    client_type := coalesce(row_data#>>'{normalized,clientType}', 'individual');
    responsible_name := btrim(coalesce(row_data#>>'{cells,responsible,text}', ''));
    billing_name := btrim(coalesce(row_data#>>'{cells,billingEntity,text}', ''));
    if client_type not in ('individual', 'company') then update public.import_rows set status = 'invalid', validation_errors = validation_errors || '["invalid_client_type"]'::jsonb where id = row_id; invalid_count := invalid_count + 1; continue; end if;

    select c.id into client_id from public.clients c where c.firm_id = target_firm_id and (c.client_code = client_code or upper(c.display_name) = upper(client_name)) order by case when c.client_code = client_code then 0 else 1 end limit 1;
    if client_id is null then insert into public.clients(firm_id, client_code, client_type, display_name) values(target_firm_id, client_code, client_type, client_name) returning id into client_id; end if;
    select cp.id into profile_id from public.client_profiles cp where cp.firm_id = target_firm_id and cp.client_id = client_id and cp.client_type = client_type;
    if profile_id is null then insert into public.client_profiles(firm_id, client_id, client_type, client_code) values(target_firm_id, client_id, client_type, client_code) returning id into profile_id; end if;
    select p.id into professional_id from public.professionals p where p.firm_id = target_firm_id and upper(p.display_name) = upper(responsible_name) limit 1;
    if professional_id is null then insert into public.professionals(firm_id, display_name) values(target_firm_id, responsible_name) returning id into professional_id; end if;
    billing_id := null;
    if billing_name <> '' then
      select b.id into billing_id from public.billing_entities b where b.firm_id = target_firm_id and upper(b.name) = upper(billing_name) limit 1;
      if billing_id is null then insert into public.billing_entities(firm_id, name) values(target_firm_id, billing_name) returning id into billing_id; end if;
    end if;
    exception_state := coalesce(private.import_boolean(row_data#>>'{normalized,invoiced}'), false) and private.import_date(row_data#>>'{normalized,invoiceDate}') is null
      or coalesce(private.import_boolean(row_data#>>'{normalized,paid}'), false) and not coalesce(private.import_boolean(row_data#>>'{normalized,invoiced}'), false);
    archive_value := nullif(row_data#>>'{normalized,archive}', '');

    if action_name = 'unchanged' then
      update public.work_entries set import_row_id = row_id, updated_by = actor_id where id = matched_work_id and firm_id = target_firm_id;
      update public.import_rows set status = 'skipped', work_entry_id = matched_work_id where id = row_id;
      unchanged_count := unchanged_count + 1;
    elsif action_name = 'update' then
      update public.work_entries set
        work_date = private.import_date(row_data#>>'{normalized,date}'), client_id = client_id, client_profile_id = profile_id,
        professional_id = professional_id, billing_entity_id = billing_id, activity_description = row_data#>>'{cells,activity,text}',
        duration_minutes = private.import_integer(row_data#>>'{normalized,durationMinutes}'), imported_duration_minutes = private.import_integer(row_data#>>'{normalized,durationMinutes}'),
        imported_hourly_rate = private.import_numeric(row_data#>>'{normalized,hourlyRate}'), calculated_hourly_rate = private.import_numeric(row_data#>>'{normalized,hourlyRate}'), effective_hourly_rate = private.import_numeric(row_data#>>'{normalized,hourlyRate}'),
        imported_amount = private.import_numeric(row_data#>>'{normalized,importedAmount}'), calculated_amount = case when private.import_numeric(row_data#>>'{normalized,hourlyRate}') is null then null else round(private.import_numeric(row_data#>>'{normalized,hourlyRate}') * private.import_integer(row_data#>>'{normalized,durationMinutes}')::numeric / 60, 2) end,
        effective_amount = coalesce(private.import_numeric(row_data#>>'{normalized,importedAmount}'), case when private.import_numeric(row_data#>>'{normalized,hourlyRate}') is null then null else round(private.import_numeric(row_data#>>'{normalized,hourlyRate}') * private.import_integer(row_data#>>'{normalized,durationMinutes}')::numeric / 60, 2) end),
        status = case when coalesce(private.import_boolean(row_data#>>'{normalized,paid}'), false) then 'paid' when coalesce(private.import_boolean(row_data#>>'{normalized,invoiced}'), false) then 'invoiced' else 'approved' end,
        is_invoiced = coalesce(private.import_boolean(row_data#>>'{normalized,invoiced}'), false), invoice_date = private.import_date(row_data#>>'{normalized,invoiceDate}'), is_paid = coalesce(private.import_boolean(row_data#>>'{normalized,paid}'), false),
        archive_status = archive_value, observations = nullif(row_data#>>'{cells,notes,text}', ''), source_type = source_type, import_row_id = row_id, updated_by = actor_id, has_historical_state_exception = exception_state
      where id = matched_work_id and firm_id = target_firm_id;
      if not found then raise exception 'matched work entry is no longer available'; end if;
      update public.import_rows set status = 'imported', work_entry_id = matched_work_id where id = row_id;
      updated_count := updated_count + 1;
    else
      insert into public.work_entries(id, firm_id, work_date, client_id, client_profile_id, professional_id, billing_entity_id, activity_description, duration_minutes, imported_duration_minutes, imported_hourly_rate, calculated_hourly_rate, effective_hourly_rate, imported_amount, calculated_amount, effective_amount, currency, status, is_billable, is_invoiced, invoice_date, is_paid, archive_status, observations, source_type, import_row_id, created_by, updated_by, has_historical_state_exception)
      values(work_id, target_firm_id, private.import_date(row_data#>>'{normalized,date}'), client_id, profile_id, professional_id, billing_id, row_data#>>'{cells,activity,text}', private.import_integer(row_data#>>'{normalized,durationMinutes}'), private.import_integer(row_data#>>'{normalized,durationMinutes}'), private.import_numeric(row_data#>>'{normalized,hourlyRate}'), private.import_numeric(row_data#>>'{normalized,hourlyRate}'), private.import_numeric(row_data#>>'{normalized,hourlyRate}'), private.import_numeric(row_data#>>'{normalized,importedAmount}'), case when private.import_numeric(row_data#>>'{normalized,hourlyRate}') is null then null else round(private.import_numeric(row_data#>>'{normalized,hourlyRate}') * private.import_integer(row_data#>>'{normalized,durationMinutes}')::numeric / 60, 2) end, coalesce(private.import_numeric(row_data#>>'{normalized,importedAmount}'), case when private.import_numeric(row_data#>>'{normalized,hourlyRate}') is null then null else round(private.import_numeric(row_data#>>'{normalized,hourlyRate}') * private.import_integer(row_data#>>'{normalized,durationMinutes}')::numeric / 60, 2) end), 'EUR', case when coalesce(private.import_boolean(row_data#>>'{normalized,paid}'), false) then 'paid' when coalesce(private.import_boolean(row_data#>>'{normalized,invoiced}'), false) then 'invoiced' else 'approved' end, true, coalesce(private.import_boolean(row_data#>>'{normalized,invoiced}'), false), private.import_date(row_data#>>'{normalized,invoiceDate}'), coalesce(private.import_boolean(row_data#>>'{normalized,paid}'), false), archive_value, nullif(row_data#>>'{cells,notes,text}', ''), source_type, row_id, actor_id, actor_id, exception_state);
      update public.import_rows set status = 'imported', work_entry_id = work_id where id = row_id;
      new_count := new_count + 1;
    end if;
  end loop;

  update public.imports i set status = 'completed', completed_at = now(),
    valid_rows = (select count(*) from public.import_rows r where r.import_id = import_id and r.status in ('imported', 'skipped') and jsonb_array_length(r.validation_warnings) = 0),
    warning_rows = (select count(*) from public.import_rows r where r.import_id = import_id and r.status in ('imported', 'skipped') and jsonb_array_length(r.validation_warnings) > 0),
    invalid_rows = (select count(*) from public.import_rows r where r.import_id = import_id and r.status = 'invalid')
  where i.id = import_id;

  return jsonb_build_object('importId', import_id, 'newRows', new_count, 'updatedRows', updated_count, 'unchangedRows', unchanged_count, 'invalidRows', invalid_count, 'missingRows', coalesce(private.import_integer(analysis->>'missingRows'), 0), 'status', 'completed');
end;
$$;

revoke all on function public.commit_validated_import(jsonb) from public, anon;
grant execute on function public.commit_validated_import(jsonb) to authenticated;

notify pgrst, 'reload schema';
