-- File content validation is performed by the authenticated client-documents Edge Function.
-- Browser clients must not be able to bypass it with a direct Storage or metadata write.
drop policy if exists client_documents_storage_insert on storage.objects;
drop policy if exists client_documents_storage_delete on storage.objects;

revoke insert, update, delete on public.client_documents from authenticated;

create or replace function public.can_manage_client_document(
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
      select 1
      from public.clients c
      where c.firm_id = target_firm_id
        and c.id = target_client_id
    )
    and private.has_scope_access(target_firm_id, null, target_client_id, null, 'edit');
$$;

revoke all on function public.can_manage_client_document(uuid, uuid) from public, anon;
grant execute on function public.can_manage_client_document(uuid, uuid) to authenticated;

comment on function public.can_manage_client_document(uuid, uuid) is
  'Authorisation probe used by the client-documents Edge Function before a validated private upload.';

create or replace function public.can_manage_client_document_record(target_document_id uuid)
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

revoke all on function public.can_manage_client_document_record(uuid) from public, anon;
grant execute on function public.can_manage_client_document_record(uuid) to authenticated;
