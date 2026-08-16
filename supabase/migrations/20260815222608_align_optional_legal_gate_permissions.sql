create or replace function private.has_accepted_current_terms(target_user_id uuid default auth.uid()) returns boolean language sql stable security definer set search_path='' as $$ select not exists (select 1 from public.legal_documents d where d.status='published' and d.effective_at<=now() and not exists (select 1 from public.user_legal_acceptances a where a.user_id=target_user_id and a.legal_document_id=d.id and a.document_type=d.document_type and a.document_version=d.version)); $$;
revoke all on function private.has_accepted_current_terms(uuid) from public,anon;
revoke all on function private.has_scope_access(uuid,uuid,uuid,uuid,text) from public,anon;
grant execute on function private.has_accepted_current_terms(uuid) to authenticated;
grant execute on function private.has_scope_access(uuid,uuid,uuid,uuid,text) to authenticated;
comment on function private.has_accepted_current_terms(uuid) is 'Returns true when every currently published legal document is accepted; also true when the optional legal-document module has no published documents.';;
