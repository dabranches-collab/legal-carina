alter table public.client_profiles drop constraint if exists client_profiles_firm_id_client_code_key;
alter table public.client_profiles add constraint client_profiles_firm_code_type_key unique(firm_id,client_code,client_type);

create or replace function private.import_date(p_value text) returns date language plpgsql immutable set search_path='' as $$
declare result date;
begin
  if coalesce(p_value,'') !~ '^\d{4}-\d{2}-\d{2}$' then return null; end if;
  result := p_value::date;
  return result;
exception when others then return null;
end;$$;

create or replace function private.import_integer(p_value text) returns integer language plpgsql immutable set search_path='' as $$
begin return p_value::integer; exception when others then return null; end;$$;

create or replace function private.import_bigint(p_value text) returns bigint language plpgsql immutable set search_path='' as $$
begin return p_value::bigint; exception when others then return null; end;$$;

create or replace function private.import_numeric(p_value text) returns numeric language plpgsql immutable set search_path='' as $$
begin return p_value::numeric; exception when others then return null; end;$$;

create or replace function private.import_boolean(p_value text) returns boolean language plpgsql immutable set search_path='' as $$
begin return p_value::boolean; exception when others then return null; end;$$;

revoke all on function private.import_date(text), private.import_integer(text), private.import_bigint(text), private.import_numeric(text), private.import_boolean(text) from public,anon,authenticated;

create or replace function public.analyze_import_candidates(p_rows jsonb)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare actor_id uuid:=(select auth.uid());target_firm_id uuid;candidate jsonb;duplicates jsonb:='[]'::jsonb;known_clients text[]:='{}';new_clients text[]:='{}';candidate_client_id uuid;candidate_professional_id uuid;
begin
 select fm.firm_id into target_firm_id from public.firm_members fm where fm.user_id=actor_id and fm.active and fm.role in('owner','admin')limit 1;
 if target_firm_id is null then raise exception 'only owner or administrator may analyse imports'using errcode='42501';end if;
 if jsonb_typeof(p_rows)<>'array'or jsonb_array_length(p_rows)>10000 then raise exception 'invalid candidate rows';end if;
 for candidate in select value from jsonb_array_elements(p_rows)loop
  select c.id into candidate_client_id from public.clients c where c.firm_id=target_firm_id and(c.client_code=btrim(candidate#>>'{cells,clientCode,text}')or upper(c.display_name)=upper(btrim(candidate#>>'{cells,clientName,text}')))limit 1;
  if candidate_client_id is null then new_clients:=array_append(new_clients,upper(btrim(candidate#>>'{cells,clientName,text}')));else known_clients:=array_append(known_clients,upper(btrim(candidate#>>'{cells,clientName,text}')));end if;
  select p.id into candidate_professional_id from public.professionals p where p.firm_id=target_firm_id and upper(p.display_name)=upper(btrim(candidate#>>'{cells,responsible,text}'))limit 1;
  if candidate_client_id is not null and candidate_professional_id is not null and private.import_date(candidate#>>'{normalized,date}') is not null and private.import_integer(candidate#>>'{normalized,durationMinutes}') is not null and exists(select 1 from public.work_entries w where w.firm_id=target_firm_id and w.client_id=candidate_client_id and w.professional_id=candidate_professional_id and w.work_date=private.import_date(candidate#>>'{normalized,date}') and w.duration_minutes=private.import_integer(candidate#>>'{normalized,durationMinutes}') and upper(w.activity_description)=upper(btrim(candidate#>>'{cells,activity,text}')))then duplicates:=duplicates||to_jsonb(coalesce(private.import_integer(candidate->>'sourceRow'),0));end if;
 end loop;
 return jsonb_build_object('duplicateSourceRows',duplicates,'existingClients',(select count(distinct item)from unnest(known_clients)item where item<>''),'newClients',(select count(distinct item)from unnest(new_clients)item where item<>''));
end;$$;

revoke all on function public.analyze_import_candidates(jsonb)from public,anon;
grant execute on function public.analyze_import_candidates(jsonb)to authenticated;

create or replace function public.commit_validated_import(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
#variable_conflict use_variable
declare
  actor_id uuid:=(select auth.uid()); target_firm_id uuid; import_id uuid:=gen_random_uuid();
  row_data jsonb; directory_data jsonb; row_id uuid; work_id uuid; client_id uuid; profile_id uuid; professional_id uuid; billing_id uuid;
  client_name text; client_code text; client_type text; responsible_name text; billing_name text;
  errors jsonb; warnings jsonb; row_status text; source_type text; imported_count integer:=0; invalid_count integer:=0;
  exception_state boolean; archive_value text;
begin
  if actor_id is null then raise exception 'authentication required' using errcode='42501';end if;
  select fm.firm_id into target_firm_id from public.firm_members fm where fm.user_id=actor_id and fm.active and fm.role in('owner','admin') order by case when fm.role='owner'then 0 else 1 end limit 1;
  if target_firm_id is null then raise exception 'only owner or administrator may confirm an import' using errcode='42501';end if;
  if jsonb_typeof(p_payload->'rows')<>'array' or jsonb_array_length(p_payload->'rows')>10000 then raise exception 'invalid import row collection';end if;
  if coalesce(p_payload->>'fileName','')!~*'^[^/\\]+\.(xlsx|csv)$' or coalesce(p_payload->>'sha256','')!~'^[0-9a-f]{64}$' or coalesce(private.import_bigint(p_payload->>'fileSize'),-1)<0 or coalesce(private.import_bigint(p_payload->>'fileSize'),0)>52428800 then raise exception 'invalid file metadata';end if;
  if exists(select 1 from public.imports i where i.firm_id=target_firm_id and i.file_hash=p_payload->>'sha256')then raise exception 'this file was already imported';end if;
  source_type:=case when lower(p_payload->>'fileName') like '%.csv' then 'csv' else 'xlsx'end;
  insert into public.imports(id,firm_id,original_filename,file_hash,file_size,status,total_rows,valid_rows,warning_rows,invalid_rows,duplicate_rows,imported_by,started_at)
  values(import_id,target_firm_id,left(p_payload->>'fileName',255),p_payload->>'sha256',greatest(0,coalesce(private.import_bigint(p_payload->>'fileSize'),0)),'importing',jsonb_array_length(p_payload->'rows'),coalesce(private.import_integer(p_payload#>>'{summary,validRows}'),0),coalesce(private.import_integer(p_payload#>>'{summary,warningRows}'),0),coalesce(private.import_integer(p_payload#>>'{summary,invalidRows}'),0),coalesce(private.import_integer(p_payload#>>'{summary,possibleDuplicates}'),0),actor_id,now());
  if p_payload ? 'clientDirectory' then
    if jsonb_typeof(p_payload->'clientDirectory')<>'array' or jsonb_array_length(p_payload->'clientDirectory')>10000 then raise exception 'invalid client directory';end if;
    for directory_data in select value from jsonb_array_elements(p_payload->'clientDirectory') loop
      client_name:=btrim(coalesce(directory_data->>'name',''));client_code:=btrim(coalesce(directory_data->>'code',''));client_type:=directory_data->>'clientType';
      if client_name='' or client_code='' or client_type not in('individual','company') then continue;end if;
      client_id:=null;profile_id:=null;
      select c.id into client_id from public.clients c where c.firm_id=target_firm_id and(c.client_code=client_code or upper(c.display_name)=upper(client_name)) order by case when c.client_code=client_code then 0 else 1 end limit 1;
      if client_id is null then insert into public.clients(firm_id,client_code,client_type,display_name) values(target_firm_id,client_code,client_type,client_name) returning id into client_id;end if;
      select cp.id into profile_id from public.client_profiles cp where cp.firm_id=target_firm_id and cp.client_id=client_id and cp.client_type=client_type;
      if profile_id is null then insert into public.client_profiles(firm_id,client_id,client_type,client_code) values(target_firm_id,client_id,client_type,client_code);end if;
    end loop;
  end if;
  for row_data in select value from jsonb_array_elements(p_payload->'rows')loop
    row_id:=gen_random_uuid();work_id:=gen_random_uuid();
    select coalesce(jsonb_agg(issue->>'code'),'[]'::jsonb) into errors from jsonb_array_elements(coalesce(row_data->'issues','[]'::jsonb))issue where issue->>'severity'='error';
    select coalesce(jsonb_agg(issue->>'code'),'[]'::jsonb) into warnings from jsonb_array_elements(coalesce(row_data->'issues','[]'::jsonb))issue where issue->>'severity'='warning';
    if private.import_date(row_data#>>'{normalized,date}') is null or coalesce(private.import_integer(row_data#>>'{normalized,durationMinutes}'),0)<1 or btrim(coalesce(row_data#>>'{cells,clientName,text}',''))='' or btrim(coalesce(row_data#>>'{cells,activity,text}',''))='' or btrim(coalesce(row_data#>>'{cells,responsible,text}',''))='' then errors:=errors||'["backend_validation_failed"]'::jsonb;end if;
    row_status:=case when jsonb_array_length(errors)>0 then'invalid'when jsonb_array_length(warnings)>0 then'warning'else'valid'end;
    insert into public.import_rows(id,firm_id,import_id,sheet_name,source_row_number,raw_data,normalized_data,validation_errors,validation_warnings,row_hash,status)
    values(row_id,target_firm_id,import_id,left(coalesce(p_payload->>'selectedSheet','DADOS'),100),greatest(1,coalesce(private.import_integer(row_data->>'sourceRow'),1)),coalesce(row_data->'cells','{}'::jsonb),coalesce(row_data->'normalized','{}'::jsonb),errors,warnings,encode(extensions.digest(convert_to((p_payload->>'sha256')||'|'||coalesce(p_payload->>'selectedSheet','DADOS')||'|'||coalesce(row_data->>'sourceRow','')||'|'||coalesce(row_data->>'fingerprint',''),'UTF8'),'sha256'),'hex'),row_status);
    if row_status='invalid'then invalid_count:=invalid_count+1;continue;end if;
    client_name:=btrim(coalesce(row_data#>>'{cells,clientName,text}',''));client_code:=btrim(coalesce(row_data#>>'{cells,clientCode,text}',''));client_type:=coalesce(row_data#>>'{normalized,clientType}','individual');responsible_name:=btrim(coalesce(row_data#>>'{cells,responsible,text}',''));billing_name:=btrim(coalesce(row_data#>>'{cells,billingEntity,text}',''));
    if client_type not in ('individual','company') then update public.import_rows set status='invalid',validation_errors=validation_errors||'["invalid_client_type"]'::jsonb where id=row_id;invalid_count:=invalid_count+1;continue;end if;
    if client_name=''or client_code=''or responsible_name=''then update public.import_rows set status='invalid',validation_errors=validation_errors||'["unresolved_required_entity"]'::jsonb where id=row_id;invalid_count:=invalid_count+1;continue;end if;
    select c.id into client_id from public.clients c where c.firm_id=target_firm_id and(c.client_code=client_code or upper(c.display_name)=upper(client_name))order by case when c.client_code=client_code then 0 else 1 end limit 1;
    if client_id is null then insert into public.clients(firm_id,client_code,client_type,display_name)values(target_firm_id,client_code,client_type,client_name)returning id into client_id;end if;
    select cp.id into profile_id from public.client_profiles cp where cp.firm_id=target_firm_id and cp.client_id=client_id and cp.client_type=client_type;
    if profile_id is null then insert into public.client_profiles(firm_id,client_id,client_type,client_code)values(target_firm_id,client_id,client_type,client_code)returning id into profile_id;end if;
    select p.id into professional_id from public.professionals p where p.firm_id=target_firm_id and upper(p.display_name)=upper(responsible_name)limit 1;
    if professional_id is null then insert into public.professionals(firm_id,display_name)values(target_firm_id,responsible_name)returning id into professional_id;end if;
    billing_id:=null;if billing_name<>''then select b.id into billing_id from public.billing_entities b where b.firm_id=target_firm_id and upper(b.name)=upper(billing_name)limit 1;if billing_id is null then insert into public.billing_entities(firm_id,name)values(target_firm_id,billing_name)returning id into billing_id;end if;end if;
    if exists(select 1 from public.work_entries w where w.firm_id=target_firm_id and w.client_id=client_id and w.professional_id=professional_id and w.work_date=private.import_date(row_data#>>'{normalized,date}') and w.duration_minutes=private.import_integer(row_data#>>'{normalized,durationMinutes}') and upper(w.activity_description)=upper(btrim(row_data#>>'{cells,activity,text}'))) then
      if not (warnings ? 'existing_duplicate') then warnings:=warnings||'["existing_duplicate"]'::jsonb;end if;
      update public.import_rows set validation_warnings=warnings,status='warning' where id=row_id;
    end if;
    exception_state:=coalesce(private.import_boolean(row_data#>>'{normalized,invoiced}'),false)and private.import_date(row_data#>>'{normalized,invoiceDate}')is null or coalesce(private.import_boolean(row_data#>>'{normalized,paid}'),false)and not coalesce(private.import_boolean(row_data#>>'{normalized,invoiced}'),false);
    archive_value:=nullif(row_data#>>'{normalized,archive}','');
    insert into public.work_entries(id,firm_id,work_date,client_id,client_profile_id,professional_id,billing_entity_id,activity_description,duration_minutes,imported_duration_minutes,imported_hourly_rate,calculated_hourly_rate,effective_hourly_rate,imported_amount,calculated_amount,effective_amount,currency,status,is_billable,is_invoiced,invoice_date,is_paid,archive_status,observations,source_type,import_row_id,created_by,has_historical_state_exception)
    values(work_id,target_firm_id,private.import_date(row_data#>>'{normalized,date}'),client_id,profile_id,professional_id,billing_id,row_data#>>'{cells,activity,text}',private.import_integer(row_data#>>'{normalized,durationMinutes}'),private.import_integer(row_data#>>'{normalized,durationMinutes}'),private.import_numeric(row_data#>>'{normalized,hourlyRate}'),case when private.import_numeric(row_data#>>'{normalized,hourlyRate}')is null then null else round(private.import_numeric(row_data#>>'{normalized,hourlyRate}'),2)end,private.import_numeric(row_data#>>'{normalized,hourlyRate}'),private.import_numeric(row_data#>>'{normalized,importedAmount}'),case when private.import_numeric(row_data#>>'{normalized,hourlyRate}')is null then null else round(private.import_numeric(row_data#>>'{normalized,hourlyRate}')*private.import_integer(row_data#>>'{normalized,durationMinutes}')::numeric/60,2)end,coalesce(private.import_numeric(row_data#>>'{normalized,importedAmount}'),case when private.import_numeric(row_data#>>'{normalized,hourlyRate}')is null then null else round(private.import_numeric(row_data#>>'{normalized,hourlyRate}')*private.import_integer(row_data#>>'{normalized,durationMinutes}')::numeric/60,2)end),'EUR',case when coalesce(private.import_boolean(row_data#>>'{normalized,paid}'),false)then'paid'when coalesce(private.import_boolean(row_data#>>'{normalized,invoiced}'),false)then'invoiced'else'approved'end,true,coalesce(private.import_boolean(row_data#>>'{normalized,invoiced}'),false),private.import_date(row_data#>>'{normalized,invoiceDate}'),coalesce(private.import_boolean(row_data#>>'{normalized,paid}'),false),archive_value,nullif(row_data#>>'{cells,notes,text}',''),source_type,row_id,actor_id,exception_state);
    update public.import_rows set work_entry_id=work_id,status='imported'where id=row_id;imported_count:=imported_count+1;
  end loop;
  update public.imports i set status='completed',completed_at=now(),
    valid_rows=(select count(*)from public.import_rows r where r.import_id=import_id and r.status='imported'and jsonb_array_length(r.validation_warnings)=0),
    warning_rows=(select count(*)from public.import_rows r where r.import_id=import_id and r.status='imported'and jsonb_array_length(r.validation_warnings)>0),
    invalid_rows=(select count(*)from public.import_rows r where r.import_id=import_id and r.status='invalid')
  where i.id=import_id;
  return jsonb_build_object('importId',import_id,'importedRows',imported_count,'invalidRows',invalid_count,'status','completed');
end;$$;

revoke all on function public.commit_validated_import(jsonb) from public,anon;
grant execute on function public.commit_validated_import(jsonb) to authenticated;
