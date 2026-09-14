-- Operational profile for the person who maintains daily work-entry data.
-- Access remains limited to explicitly assigned Societies. Financial values
-- remain controlled by billing_entity_financial_permissions.
alter table public.firm_members drop constraint if exists firm_members_role_check;
alter table public.firm_members add constraint firm_members_role_check
  check (role in ('owner','admin','manager','operator','billing','professional','viewer','auditor'));

-- Operator follows the operational capability of a professional when a
-- function explicitly asks for that role, while retaining its own identity.
create or replace function private.has_firm_role(target_firm_id uuid,allowed_roles text[])
returns boolean language sql stable security definer set search_path='' as $$
  select private.has_completed_pin_setup((select auth.uid())) and exists(
    select 1 from public.firm_members fm
    where fm.firm_id=target_firm_id and fm.user_id=(select auth.uid())
      and fm.active
      and (
        fm.role=any(allowed_roles)
        or (fm.role='operator' and 'professional'=any(allowed_roles))
      )
  );
$$;

create or replace function public.replace_user_billing_permissions(
  p_firm_id uuid,p_user_id uuid,p_permissions jsonb,p_actor_user_id uuid
)
returns void language plpgsql security definer set search_path='' as $$
declare target_role text;invalid_count integer;
begin
  if jsonb_typeof(p_permissions)<>'array' then raise exception 'permissions must be an array';end if;
  select role into target_role from public.firm_members where firm_id=p_firm_id and user_id=p_user_id;
  if target_role is null then raise exception 'target user is not a firm member';end if;
  if target_role in('owner','admin') then raise exception 'this profile has integral permissions';end if;
  if not exists(select 1 from public.firm_members where firm_id=p_firm_id and user_id=p_actor_user_id and active and role in('owner','admin')) then raise exception 'actor is not authorized' using errcode='42501';end if;
  select count(*) into invalid_count from jsonb_array_elements(p_permissions)item
  where not exists(select 1 from public.billing_entities b where b.firm_id=p_firm_id and b.id=(item->>'billingEntityId')::uuid)
    or coalesce((item->>'financial')::boolean,false) and not coalesce((item->>'visible')::boolean,false);
  if invalid_count>0 then raise exception 'invalid billing permissions';end if;

  delete from public.access_grants where firm_id=p_firm_id and user_id=p_user_id and principal_type='user' and resource_type='billing_entity';
  delete from public.billing_entity_financial_permissions where firm_id=p_firm_id and user_id=p_user_id;
  insert into public.access_grants(firm_id,principal_type,user_id,resource_type,billing_entity_id,permission,created_by)
  select p_firm_id,'user',p_user_id,'billing_entity',(item->>'billingEntityId')::uuid,
    case target_role when'billing'then'billing' when'manager'then'edit' when'operator'then'edit' when'professional'then'edit' else'view'end,p_actor_user_id
  from jsonb_array_elements(p_permissions)item where coalesce((item->>'visible')::boolean,false);
  insert into public.billing_entity_financial_permissions(firm_id,user_id,billing_entity_id,can_view_financials,created_by)
  select p_firm_id,p_user_id,(item->>'billingEntityId')::uuid,coalesce((item->>'financial')::boolean,false),p_actor_user_id
  from jsonb_array_elements(p_permissions)item where coalesce((item->>'visible')::boolean,false);
  insert into public.audit_log(firm_id,actor_user_id,action,entity_type,entity_id,new_data)
  values(p_firm_id,p_actor_user_id,'update','user_billing_permissions',p_user_id,jsonb_build_object('billing_entities',p_permissions));
end;$$;
revoke all on function public.replace_user_billing_permissions(uuid,uuid,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.replace_user_billing_permissions(uuid,uuid,jsonb,uuid) to service_role;

create or replace function public.update_user_membership(
  p_firm_id uuid,p_user_id uuid,p_role text,p_active boolean,p_actor_user_id uuid
)
returns void language plpgsql security definer set search_path='' as $$
declare previous_role text;previous_active boolean;
begin
  if p_role not in('admin','manager','operator','billing','professional','viewer','auditor') then raise exception 'invalid role';end if;
  if not exists(select 1 from public.firm_members where firm_id=p_firm_id and user_id=p_actor_user_id and active and role in('owner','admin')) then raise exception 'actor is not authorized' using errcode='42501';end if;
  select role,active into previous_role,previous_active from public.firm_members where firm_id=p_firm_id and user_id=p_user_id for update;
  if previous_role is null then raise exception 'target user is not a firm member';end if;
  if previous_role='owner' then raise exception 'owner membership cannot be changed';end if;
  update public.firm_members set role=p_role,active=p_active where firm_id=p_firm_id and user_id=p_user_id;
  if p_role='admin' then
    delete from public.access_grants where firm_id=p_firm_id and user_id=p_user_id and principal_type='user';
    delete from public.billing_entity_financial_permissions where firm_id=p_firm_id and user_id=p_user_id;
  end if;
  insert into public.audit_log(firm_id,actor_user_id,action,entity_type,entity_id,previous_data,new_data)
  values(p_firm_id,p_actor_user_id,'update','user_membership',p_user_id,jsonb_build_object('role',previous_role,'active',previous_active),jsonb_build_object('role',p_role,'active',p_active));
end;$$;
revoke all on function public.update_user_membership(uuid,uuid,text,boolean,uuid) from public,anon,authenticated;
grant execute on function public.update_user_membership(uuid,uuid,text,boolean,uuid) to service_role;

create or replace function public.finalize_pin_user_creation(
  p_firm_id uuid,p_user_id uuid,p_credential_id uuid,p_username text,p_display_name text,
  p_auth_email text,p_role text,p_actor_id uuid
) returns void language plpgsql security definer set search_path='' as $$
begin
  if coalesce((select auth.jwt()->>'role'),'')<>'service_role' then raise exception 'service role required' using errcode='42501';end if;
  if p_role not in('admin','manager','operator','billing','professional','viewer','auditor') then raise exception 'invalid role';end if;
  if not exists(select 1 from public.firm_members fm where fm.firm_id=p_firm_id and fm.user_id=p_actor_id and fm.active and fm.role in('owner','admin')) then raise exception 'not authorized' using errcode='42501';end if;
  insert into public.firm_members(firm_id,user_id,role)values(p_firm_id,p_user_id,p_role);
  insert into public.user_login_credentials(id,firm_id,user_id,username,display_name,auth_email,created_by,must_change_pin)
    values(p_credential_id,p_firm_id,p_user_id,p_username,p_display_name,p_auth_email,p_actor_id,true);
  insert into public.audit_log(firm_id,actor_user_id,action,entity_type,entity_id,new_data)
    values(p_firm_id,p_actor_id,'insert','user_access',p_user_id,jsonb_build_object('username',p_username,'display_name',p_display_name,'role',p_role,'active',true,'auth_method','pin'));
end;$$;
revoke all on function public.finalize_pin_user_creation(uuid,uuid,uuid,text,text,text,text,uuid) from public,anon,authenticated;
grant execute on function public.finalize_pin_user_creation(uuid,uuid,uuid,text,text,text,text,uuid) to service_role;
