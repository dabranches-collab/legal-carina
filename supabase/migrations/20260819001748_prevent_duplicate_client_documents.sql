-- The same binary document must not be archived twice for the same client.
-- Removed records do not block a deliberate future re-upload.
create unique index if not exists client_documents_active_content_unique
  on public.client_documents (firm_id, client_id, sha256)
  where sha256 is not null and status <> 'removed';

comment on index public.client_documents_active_content_unique is
  'Prevents duplicate active/archived document content within one client.';
