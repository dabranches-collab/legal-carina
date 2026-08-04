begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000081', 'admin-auth@example.test'),
  ('00000000-0000-0000-0000-000000000082', 'lawyer-auth@example.test');
insert into public.law_firms (id, name) values ('10000000-0000-0000-0000-000000000081', 'Escritório Auth sintético');
insert into public.firm_members (firm_id, user_id, role) values
  ('10000000-0000-0000-0000-000000000081', '00000000-0000-0000-0000-000000000081', 'owner'),
  ('10000000-0000-0000-0000-000000000081', '00000000-0000-0000-0000-000000000082', 'professional');
insert into public.clients (id, firm_id, client_code, client_type, display_name) values
  ('20000000-0000-0000-0000-000000000081', '10000000-0000-0000-0000-000000000081', 'AUTH-1', 'company', 'Cliente Auth sintético');

select has_table('public', 'user_legal_acceptances', 'aceitações legais existem');
select has_table('public', 'security_events', 'eventos de segurança existem');
select has_table('public', 'access_grants', 'concessões granulares existem');
select col_type_is('public', 'security_events', 'metadata', 'jsonb', 'metadata de segurança usa jsonb');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000081', true);
select is((select count(*) from public.clients), 0::bigint, 'dados ficam bloqueados antes dos termos');

reset role;
insert into public.legal_documents (id, document_type, version, title, body_markdown, effective_at, status, content_hash) values
  ('90000000-0000-0000-0000-000000000081', 'terms_of_service', 'auth-test-1', 'Termos sintéticos', 'Conteúdo de teste', now(), 'published', repeat('a', 64)),
  ('90000000-0000-0000-0000-000000000082', 'privacy_policy', 'auth-test-1', 'Privacidade sintética', 'Conteúdo de teste', now(), 'published', repeat('b', 64)),
  ('90000000-0000-0000-0000-000000000083', 'gdpr_terms', 'auth-test-1', 'RGPD sintético', 'Conteúdo de teste', now(), 'published', repeat('c', 64));

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000081', true);
select is((select count(*) from public.get_pending_legal_documents()), 3::bigint, 'os três documentos surgem pendentes');
select is(public.accept_legal_documents(array[
  '90000000-0000-0000-0000-000000000081'::uuid, '90000000-0000-0000-0000-000000000082'::uuid,
  '90000000-0000-0000-0000-000000000083'::uuid
], '{"user_agent":"pgtap"}'::jsonb), 3, 'aceita os três documentos atomicamente');
select is((select count(*) from public.clients), 1::bigint, 'administrador acede depois dos termos');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000082', true);
insert into public.user_legal_acceptances (user_id, legal_document_id, document_type, document_version, evidence)
select '00000000-0000-0000-0000-000000000082', d.id, d.document_type, d.version, '{"source":"pgtap"}'::jsonb from public.legal_documents d;
select is((select count(*) from public.clients), 0::bigint, 'advogado sem grant não vê clientes');

reset role;
insert into public.access_grants (firm_id, principal_type, user_id, resource_type, client_id, permission, created_by)
values ('10000000-0000-0000-0000-000000000081', 'user', '00000000-0000-0000-0000-000000000082', 'client',
  '20000000-0000-0000-0000-000000000081', 'view', '00000000-0000-0000-0000-000000000081');
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000082', true);
select is((select count(*) from public.clients), 1::bigint, 'grant por cliente permite acesso explícito');

select * from finish();
rollback;
