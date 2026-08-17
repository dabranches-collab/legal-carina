-- Private, auditable client documents. No document content is stored in PostgreSQL.
create table public.client_documents (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.law_firms(id) on delete restrict,
  client_id uuid not null,
  category text not null check (category in (
    'commercial_registry', 'identification', 'tax', 'address', 'power_of_attorney',
    'contract', 'correspondence', 'court', 'invoice', 'other'
  )),
  title text not null check (btrim(title) <> ''),
  description text,
  original_filename text not null check (btrim(original_filename) <> ''),
  storage_path text not null check (storage_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}/[^/]+$'),
  mime_type text not null check (mime_type in (
    'application/pdf', 'image/jpeg', 'image/png',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  )),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 20971520),
  sha256 text check (sha256 is null or sha256 ~ '^[0-9a-f]{64}$'),
  document_date date,
  expires_at date,
  status text not null default 'active' check (status in ('active', 'archived', 'removed')),
  uploaded_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (firm_id, client_id) references public.clients(firm_id, id) on delete restrict,
  unique (firm_id, storage_path),
  unique (firm_id, id)
);

create index client_documents_client_idx on public.client_documents(firm_id, client_id, created_at desc)
  where status <> 'removed';

create trigger client_documents_set_updated_at before update on public.client_documents
for each row execute function private.set_updated_at();
create trigger client_documents_audit after insert or update or delete on public.client_documents
for each row execute function private.audit_business_change();

alter table public.client_documents enable row level security;
revoke all on public.client_documents from public, anon;
grant select, insert, update on public.client_documents to authenticated;

create policy client_documents_select_scoped on public.client_documents for select to authenticated
using ((select private.has_scope_access(firm_id, null, client_id, null, 'view')));
create policy client_documents_insert_scoped on public.client_documents for insert to authenticated
with check (
  uploaded_by = (select auth.uid())
  and (select private.has_scope_access(firm_id, null, client_id, null, 'edit'))
);
create policy client_documents_update_scoped on public.client_documents for update to authenticated
using ((select private.has_scope_access(firm_id, null, client_id, null, 'edit')))
with check ((select private.has_scope_access(firm_id, null, client_id, null, 'edit')));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'client-documents', 'client-documents', false, 20971520,
  array[
    'application/pdf', 'image/jpeg', 'image/png',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function private.storage_path_uuid(path text, p_position integer)
returns uuid language plpgsql immutable set search_path = '' as $$
begin
  return ((storage.foldername(path))[p_position])::uuid;
exception when others then
  return null;
end;
$$;

create policy client_documents_storage_select on storage.objects for select to authenticated
using (
  bucket_id = 'client-documents'
  and (select private.has_scope_access(
    private.storage_path_uuid(name, 1), null, private.storage_path_uuid(name, 2), null, 'view'
  ))
);
create policy client_documents_storage_insert on storage.objects for insert to authenticated
with check (
  bucket_id = 'client-documents'
  and (select private.has_scope_access(
    private.storage_path_uuid(name, 1), null, private.storage_path_uuid(name, 2), null, 'edit'
  ))
);
create policy client_documents_storage_delete on storage.objects for delete to authenticated
using (
  bucket_id = 'client-documents'
  and (select private.has_scope_access(
    private.storage_path_uuid(name, 1), null, private.storage_path_uuid(name, 2), null, 'edit'
  ))
);

revoke all on function private.storage_path_uuid(text, integer) from public, anon, authenticated;

comment on table public.client_documents is
  'Metadata for private client documents; object content remains in the private client-documents bucket.';
