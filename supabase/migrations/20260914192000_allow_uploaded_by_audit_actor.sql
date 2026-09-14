-- Validated document uploads are written by the Edge Function with the
-- service role, while uploaded_by preserves the authenticated human actor.
-- Let the generic audit trigger use that explicit actor when auth.uid() is
-- unavailable in the privileged database request.
create or replace function private.audit_business_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_data jsonb;
  new_data jsonb;
  target_firm_id uuid;
  target_id uuid;
  actor uuid;
begin
  old_data := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end;
  new_data := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end;
  target_firm_id := coalesce((new_data ->> 'firm_id')::uuid, (old_data ->> 'firm_id')::uuid);
  target_id := coalesce((new_data ->> 'id')::uuid, (old_data ->> 'id')::uuid);
  actor := coalesce(
    (select auth.uid()),
    nullif(new_data ->> 'updated_by', '')::uuid,
    nullif(new_data ->> 'created_by', '')::uuid,
    nullif(new_data ->> 'uploaded_by', '')::uuid,
    nullif(old_data ->> 'updated_by', '')::uuid,
    nullif(old_data ->> 'created_by', '')::uuid,
    nullif(old_data ->> 'uploaded_by', '')::uuid
  );
  if actor is null then
    raise exception 'O utilizador executor é obrigatório para criar o registo de auditoria.';
  end if;
  insert into public.audit_log (
    firm_id, actor_user_id, action, entity_type, entity_id, previous_data, new_data
  ) values (
    target_firm_id, actor, lower(tg_op), tg_table_name, target_id, old_data, new_data
  );
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function private.audit_business_change() from public, anon, authenticated;

comment on function private.audit_business_change() is
  'Audits business changes against the authenticated actor or an explicit created_by, updated_by or uploaded_by actor.';
