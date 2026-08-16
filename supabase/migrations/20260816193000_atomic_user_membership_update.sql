create or replace function public.update_user_membership(
  p_firm_id uuid,
  p_user_id uuid,
  p_role text,
  p_active boolean,
  p_actor_user_id uuid
)
returns void
language plpgsql
security definer
set search_path=''
as $$
declare
  previous_role text;
  previous_active boolean;
begin
  if p_role not in ('admin','manager','billing','professional','viewer','auditor') then
    raise exception 'invalid role';
  end if;

  if not exists (
    select 1 from public.firm_members
    where firm_id=p_firm_id and user_id=p_actor_user_id
      and active and role in ('owner','admin')
  ) then
    raise exception 'actor is not authorized' using errcode='42501';
  end if;

  select role,active into previous_role,previous_active
  from public.firm_members
  where firm_id=p_firm_id and user_id=p_user_id
  for update;

  if previous_role is null then raise exception 'target user is not a firm member'; end if;
  if previous_role='owner' then raise exception 'owner membership cannot be changed'; end if;

  update public.firm_members
  set role=p_role,active=p_active
  where firm_id=p_firm_id and user_id=p_user_id;

  -- An administrator has integral access. Remove dormant scoped permissions so
  -- that a later demotion starts from an explicit, empty authorisation matrix.
  if p_role='admin' then
    delete from public.access_grants
    where firm_id=p_firm_id and user_id=p_user_id and principal_type='user';
    delete from public.billing_entity_financial_permissions
    where firm_id=p_firm_id and user_id=p_user_id;
  end if;

  insert into public.audit_log(
    firm_id,actor_user_id,action,entity_type,entity_id,previous_data,new_data
  ) values (
    p_firm_id,p_actor_user_id,'update','user_membership',p_user_id,
    jsonb_build_object('role',previous_role,'active',previous_active),
    jsonb_build_object('role',p_role,'active',p_active)
  );
end;
$$;

revoke all on function public.update_user_membership(uuid,uuid,text,boolean,uuid)
  from public,anon,authenticated;
grant execute on function public.update_user_membership(uuid,uuid,text,boolean,uuid)
  to service_role;
