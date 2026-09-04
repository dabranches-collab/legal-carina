revoke all on public.client_documents from authenticated;
grant select on public.client_documents to authenticated;

revoke all on public.client_identifiers from authenticated;
grant select, insert, update, delete on public.client_identifiers to authenticated;

create or replace function private.can_manage_client_document(
  target_firm_id uuid,
  target_client_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select auth.uid()) is not null
    and exists (
      select 1 from public.clients c
      where c.firm_id = target_firm_id and c.id = target_client_id
    )
    and private.has_scope_access(target_firm_id, null, target_client_id, null, 'edit');
$$;

create or replace function private.can_manage_client_document_record(target_document_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.client_documents d
    where d.id = target_document_id
      and private.has_scope_access(d.firm_id, null, d.client_id, null, 'edit')
  );
$$;

revoke all on function private.can_manage_client_document(uuid, uuid) from public, anon;
revoke all on function private.can_manage_client_document_record(uuid) from public, anon;
grant execute on function private.can_manage_client_document(uuid, uuid) to authenticated;
grant execute on function private.can_manage_client_document_record(uuid) to authenticated;

create or replace function public.can_manage_client_document(target_firm_id uuid, target_client_id uuid)
returns boolean language sql stable security invoker set search_path = ''
as $$ select private.can_manage_client_document(target_firm_id, target_client_id); $$;

create or replace function public.can_manage_client_document_record(target_document_id uuid)
returns boolean language sql stable security invoker set search_path = ''
as $$ select private.can_manage_client_document_record(target_document_id); $$;

revoke all on function public.can_manage_client_document(uuid, uuid) from public, anon;
revoke all on function public.can_manage_client_document_record(uuid) from public, anon;
grant execute on function public.can_manage_client_document(uuid, uuid) to authenticated;
grant execute on function public.can_manage_client_document_record(uuid) to authenticated;
