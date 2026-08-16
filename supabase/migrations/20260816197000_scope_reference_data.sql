create or replace function private.can_read_client(target_firm_id uuid,target_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select private.has_firm_role(target_firm_id,array['owner','admin'])
    or private.has_scope_access(target_firm_id,null,target_client_id,null,'view')
    or exists(
      select 1 from public.work_entries entry
      where entry.firm_id=target_firm_id and entry.client_id=target_client_id
        and private.has_scope_access(entry.firm_id,entry.billing_entity_id,entry.client_id,entry.matter_id,'view')
    );
$$;

revoke all on function private.can_read_client(uuid,uuid) from public,anon;
grant execute on function private.can_read_client(uuid,uuid) to authenticated;

drop policy if exists billing_entities_select_member on public.billing_entities;
create policy billing_entities_select_scoped on public.billing_entities for select to authenticated
using ((select private.has_scope_access(firm_id,id,null,null,'view')));

drop policy if exists clients_select_member on public.clients;
create policy clients_select_scoped on public.clients for select to authenticated
using ((select private.can_read_client(firm_id,id)));

drop policy if exists client_contacts_select_member on public.client_contacts;
create policy client_contacts_select_scoped on public.client_contacts for select to authenticated
using ((select private.can_read_client(firm_id,client_id)));

drop policy if exists client_profiles_select_scope on public.client_profiles;
create policy client_profiles_select_scoped on public.client_profiles for select to authenticated
using ((select private.can_read_client(firm_id,client_id)));

drop policy if exists matters_select_member on public.matters;
create policy matters_select_scoped on public.matters for select to authenticated
using ((select private.has_scope_access(firm_id,billing_entity_id,client_id,id,'view')));

