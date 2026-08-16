-- This is an internal client and billing management application. The proprietor
-- explicitly removed the legal-document acceptance module from its access flow.
create or replace function private.has_scope_access(
  target_firm_id uuid, target_billing_entity_id uuid default null,
  target_client_id uuid default null, target_matter_id uuid default null,
  required_permission text default 'view'
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_completed_pin_setup((select auth.uid())) and (
    exists (
      select 1 from public.firm_members fm
      where fm.firm_id = target_firm_id
        and fm.user_id = (select auth.uid())
        and fm.active and fm.role in ('owner', 'admin')
    )
    or exists (
      select 1 from public.access_grants ag
      where ag.firm_id = target_firm_id and ag.active and ag.valid_from <= now()
        and (ag.valid_until is null or ag.valid_until > now())
        and private.permission_rank(ag.permission) >= private.permission_rank(required_permission)
        and (
          (ag.principal_type = 'user' and ag.user_id = (select auth.uid()))
          or (ag.principal_type = 'team' and exists (
            select 1 from public.team_members tm
            where tm.team_id = ag.team_id and tm.user_id = (select auth.uid())
              and tm.firm_id = target_firm_id
          ))
        )
        and (
          ag.resource_type = 'firm'
          or (ag.resource_type = 'billing_entity' and ag.billing_entity_id = target_billing_entity_id)
          or (ag.resource_type = 'client' and ag.client_id = target_client_id)
          or (ag.resource_type = 'matter' and ag.matter_id = target_matter_id)
        )
    )
  );
$$;

revoke all on function private.has_scope_access(uuid,uuid,uuid,uuid,text) from public, anon;
grant execute on function private.has_scope_access(uuid,uuid,uuid,uuid,text) to authenticated;

comment on function private.has_scope_access(uuid,uuid,uuid,uuid,text) is
  'Enforces initial PIN completion and scoped application permissions; no legal-document gate is configured.';
