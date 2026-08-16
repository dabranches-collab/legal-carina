-- Align remaining policies with the internal application model: no legal-term
-- gate, mandatory initial PIN completion, and a read-only Auditor role.
create or replace function private.is_firm_member(target_firm_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select private.has_completed_pin_setup((select auth.uid())) and exists(
    select 1 from public.firm_members fm
    where fm.firm_id=target_firm_id and fm.user_id=(select auth.uid()) and fm.active
  );
$$;

create or replace function private.has_firm_role(target_firm_id uuid,allowed_roles text[])
returns boolean language sql stable security definer set search_path='' as $$
  select private.has_completed_pin_setup((select auth.uid())) and exists(
    select 1 from public.firm_members fm
    where fm.firm_id=target_firm_id and fm.user_id=(select auth.uid())
      and fm.active and fm.role=any(allowed_roles)
  );
$$;

create or replace function private.has_scope_access(
  target_firm_id uuid, target_billing_entity_id uuid default null,
  target_client_id uuid default null, target_matter_id uuid default null,
  required_permission text default 'view'
)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select private.has_completed_pin_setup((select auth.uid()))
    and exists(
      select 1 from public.firm_members membership
      where membership.firm_id=target_firm_id
        and membership.user_id=(select auth.uid())
        and membership.active
    )
    and (
      exists(
        select 1 from public.firm_members privileged
        where privileged.firm_id=target_firm_id
          and privileged.user_id=(select auth.uid())
          and privileged.active and privileged.role in('owner','admin')
      )
      or exists(
        select 1 from public.access_grants ag
        where ag.firm_id=target_firm_id and ag.active and ag.valid_from<=now()
          and (ag.valid_until is null or ag.valid_until>now())
          and private.permission_rank(ag.permission)>=private.permission_rank(required_permission)
          and (
            (ag.principal_type='user' and ag.user_id=(select auth.uid()))
            or (ag.principal_type='team' and exists(
              select 1 from public.team_members tm
              where tm.team_id=ag.team_id and tm.user_id=(select auth.uid())
                and tm.firm_id=target_firm_id
            ))
          )
          and (
            ag.resource_type='firm'
            or (ag.resource_type='billing_entity' and ag.billing_entity_id=target_billing_entity_id)
            or (ag.resource_type='client' and ag.client_id=target_client_id)
            or (ag.resource_type='matter' and ag.matter_id=target_matter_id)
          )
      )
    );
$$;

revoke all on function private.has_scope_access(uuid,uuid,uuid,uuid,text) from public,anon;
grant execute on function private.has_scope_access(uuid,uuid,uuid,uuid,text) to authenticated;

create or replace function private.has_scope_permission(
  target_firm_id uuid,target_billing_entity_id uuid default null,
  target_client_id uuid default null,target_matter_id uuid default null,
  required_permission text default 'view'
)
returns boolean language sql stable security definer set search_path='' as $$
  select private.has_scope_access(target_firm_id,target_billing_entity_id,target_client_id,target_matter_id,required_permission);
$$;

revoke all on function private.is_firm_member(uuid) from public,anon;
revoke all on function private.has_firm_role(uuid,text[]) from public,anon;
revoke all on function private.has_scope_permission(uuid,uuid,uuid,uuid,text) from public,anon;
grant execute on function private.is_firm_member(uuid) to authenticated;
grant execute on function private.has_firm_role(uuid,text[]) to authenticated;
grant execute on function private.has_scope_permission(uuid,uuid,uuid,uuid,text) to authenticated;

drop policy if exists work_entries_select_scoped on public.work_entries;
create policy work_entries_select_scoped on public.work_entries for select to authenticated
using ((select private.has_scope_permission(firm_id,billing_entity_id,client_id,matter_id,'view')));

-- The former legal-document module is retained only as historical schema. It
-- is not exposed through the application and cannot become an access gate.
revoke all on public.legal_documents,public.user_legal_acceptances from authenticated,anon;
revoke all on function public.get_pending_legal_documents() from authenticated,anon,public;
revoke all on function public.accept_legal_documents(uuid[],jsonb) from authenticated,anon,public;
revoke all on function public.publish_legal_document_set(jsonb,uuid) from authenticated,anon,public,service_role;

drop policy if exists audit_log_select_privileged on public.audit_log;
create policy audit_log_select_privileged on public.audit_log for select to authenticated
using (
  (select private.has_completed_pin_setup((select auth.uid())))
  and (select private.has_firm_role(firm_id,array['owner','admin','auditor']))
);

drop policy if exists security_events_read_privileged on public.security_events;
create policy security_events_read_privileged on public.security_events for select to authenticated
using (
  (select private.has_completed_pin_setup((select auth.uid())))
  and (
    user_id=(select auth.uid())
    or exists(
      select 1
      from public.firm_members actor_membership
      join public.firm_members event_membership
        on event_membership.firm_id=actor_membership.firm_id
       and event_membership.user_id=security_events.user_id
       and event_membership.active
      where actor_membership.user_id=(select auth.uid())
        and actor_membership.active
        and actor_membership.role in('owner','admin','auditor')
    )
  )
);

drop policy if exists access_grants_read_own_or_admin on public.access_grants;
create policy access_grants_read_own_or_admin on public.access_grants for select to authenticated
using (
  (select private.has_completed_pin_setup((select auth.uid())))
  and exists(
    select 1 from public.firm_members active_membership
    where active_membership.firm_id=access_grants.firm_id
      and active_membership.user_id=(select auth.uid())
      and active_membership.active
  )
  and (
    user_id=(select auth.uid())
    or exists(
      select 1 from public.team_members tm
      where tm.team_id=access_grants.team_id and tm.user_id=(select auth.uid())
    )
    or (select private.has_firm_role(firm_id,array['owner','admin']))
  )
);
