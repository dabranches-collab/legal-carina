-- Adds the functional Gestor profile requested for application administration.
-- A manager is not an administrator: access remains limited to the Societies
-- explicitly granted and financial visibility is configured independently.
alter table public.firm_members drop constraint if exists firm_members_role_check;
alter table public.firm_members add constraint firm_members_role_check
  check (role in ('owner', 'admin', 'manager', 'billing', 'professional', 'viewer', 'auditor'));

drop policy if exists work_entries_insert_scoped on public.work_entries;
drop policy if exists work_entries_update_scoped on public.work_entries;
create policy work_entries_insert_scoped on public.work_entries for insert to authenticated
with check (created_by = (select auth.uid())
  and (select private.has_firm_role(firm_id, array['owner', 'admin', 'manager', 'billing', 'professional']))
  and (select private.has_scope_access(firm_id, billing_entity_id, client_id, matter_id, 'edit')));
create policy work_entries_update_scoped on public.work_entries for update to authenticated
using ((select private.has_firm_role(firm_id, array['owner', 'admin', 'manager', 'billing', 'professional']))
  and (select private.has_scope_access(firm_id, billing_entity_id, client_id, matter_id, 'edit')))
with check ((select private.has_firm_role(firm_id, array['owner', 'admin', 'manager', 'billing', 'professional']))
  and (select private.has_scope_access(firm_id, billing_entity_id, client_id, matter_id, 'edit')));

create or replace function public.replace_user_billing_permissions(
  p_firm_id uuid,
  p_user_id uuid,
  p_permissions jsonb,
  p_actor_user_id uuid
)
returns void
language plpgsql
security definer
set search_path=''
as $$
declare target_role text; invalid_count integer;
begin
  if jsonb_typeof(p_permissions)<>'array' then raise exception 'permissions must be an array'; end if;
  select role into target_role from public.firm_members where firm_id=p_firm_id and user_id=p_user_id;
  if target_role is null then raise exception 'target user is not a firm member'; end if;
  if target_role in('owner','admin') then raise exception 'this profile has integral permissions'; end if;
  if not exists(select 1 from public.firm_members where firm_id=p_firm_id and user_id=p_actor_user_id and active and role in('owner','admin')) then raise exception 'actor is not authorized' using errcode='42501'; end if;
  select count(*) into invalid_count from jsonb_array_elements(p_permissions) item
  where not exists(select 1 from public.billing_entities b where b.firm_id=p_firm_id and b.id=(item->>'billingEntityId')::uuid)
     or coalesce((item->>'financial')::boolean,false) and not coalesce((item->>'visible')::boolean,false);
  if invalid_count>0 then raise exception 'invalid billing permissions'; end if;

  delete from public.access_grants where firm_id=p_firm_id and user_id=p_user_id and principal_type='user' and resource_type='billing_entity';
  delete from public.billing_entity_financial_permissions where firm_id=p_firm_id and user_id=p_user_id;
  insert into public.access_grants(firm_id,principal_type,user_id,resource_type,billing_entity_id,permission,created_by)
  select p_firm_id,'user',p_user_id,'billing_entity',(item->>'billingEntityId')::uuid,
    case target_role when'billing'then'billing' when'manager'then'edit' when'professional'then'edit' else'view'end,p_actor_user_id
  from jsonb_array_elements(p_permissions)item where coalesce((item->>'visible')::boolean,false);
  insert into public.billing_entity_financial_permissions(firm_id,user_id,billing_entity_id,can_view_financials,created_by)
  select p_firm_id,p_user_id,(item->>'billingEntityId')::uuid,coalesce((item->>'financial')::boolean,false),p_actor_user_id
  from jsonb_array_elements(p_permissions)item where coalesce((item->>'visible')::boolean,false);
  insert into public.audit_log(firm_id,actor_user_id,action,entity_type,entity_id,new_data)
  values(p_firm_id,p_actor_user_id,'update','user_billing_permissions',p_user_id,jsonb_build_object('billing_entities',p_permissions));
end;$$;

revoke all on function public.replace_user_billing_permissions(uuid,uuid,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.replace_user_billing_permissions(uuid,uuid,jsonb,uuid) to service_role;
