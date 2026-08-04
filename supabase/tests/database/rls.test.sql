begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000011', 'admin-a@example.test'),
  ('00000000-0000-0000-0000-000000000012', 'professional-a@example.test'),
  ('00000000-0000-0000-0000-000000000013', 'billing-a@example.test'),
  ('00000000-0000-0000-0000-000000000014', 'viewer-b@example.test');
insert into public.legal_documents (id, document_type, version, title, body_markdown, effective_at, status, content_hash) values
  ('90000000-0000-0000-0000-000000000011', 'terms_of_service', 'test-1', 'Termos sintéticos', 'Conteúdo de teste', now(), 'published', repeat('a', 64)),
  ('90000000-0000-0000-0000-000000000012', 'privacy_policy', 'test-1', 'Privacidade sintética', 'Conteúdo de teste', now(), 'published', repeat('b', 64)),
  ('90000000-0000-0000-0000-000000000013', 'gdpr_terms', 'test-1', 'RGPD sintético', 'Conteúdo de teste', now(), 'published', repeat('c', 64));
insert into public.user_legal_acceptances (user_id, legal_document_id, document_type, document_version, evidence)
select u.id, d.id, d.document_type, d.version, '{"source":"pgtap"}'::jsonb
from auth.users u cross join public.legal_documents d
where u.id in (
  '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000012',
  '00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000014'
);
insert into public.law_firms (id, name) values
  ('10000000-0000-0000-0000-000000000011', 'Escritório RLS A'),
  ('10000000-0000-0000-0000-000000000012', 'Escritório RLS B');
insert into public.firm_members (firm_id, user_id, role) values
  ('10000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000011', 'admin'),
  ('10000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000012', 'professional'),
  ('10000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000013', 'billing'),
  ('10000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000014', 'viewer');
insert into public.clients (id, firm_id, client_code, client_type, display_name) values
  ('20000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000011', 'RLS-A', 'company', 'Cliente RLS A'),
  ('20000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000012', 'RLS-B', 'company', 'Cliente RLS B');
insert into public.professionals (id, firm_id, user_id, display_name) values
  ('30000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000012', 'Profissional RLS A');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000011', true);
select results_eq('select client_code from public.clients order by client_code', array['RLS-A'::text], 'admin sees only its firm');
select lives_ok(
  $$insert into public.clients (firm_id, client_code, client_type, display_name) values ('10000000-0000-0000-0000-000000000011', 'RLS-A2', 'individual', 'Cliente criado por admin')$$,
  'admin can create a client in its firm'
);
select throws_ok(
  $$insert into public.clients (firm_id, client_code, client_type, display_name) values ('10000000-0000-0000-0000-000000000012', 'ESCAPE', 'individual', 'Tentativa cruzada')$$,
  '42501', null, 'admin cannot insert into another firm'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000012', true);
select lives_ok(
  $$insert into public.work_entries (id, firm_id, work_date, client_id, professional_id, activity_description, duration_minutes, calculated_hourly_rate, created_by) values ('40000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000011', current_date, '20000000-0000-0000-0000-000000000011', '30000000-0000-0000-0000-000000000011', 'Trabalho RLS sintético', 60, 100, '00000000-0000-0000-0000-000000000012')$$,
  'professional can create its work entry'
);
select throws_ok(
  $$update public.work_entries set is_invoiced = true, invoice_date = current_date where id = '40000000-0000-0000-0000-000000000011'$$,
  'P0001', 'financial fields require owner, admin, or billing role', 'professional cannot change financial state'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000013', true);
select lives_ok(
  $$insert into public.manual_overrides (firm_id, work_entry_id, field_name, previous_value, calculated_value, override_value, reason, created_by) values ('10000000-0000-0000-0000-000000000011', '40000000-0000-0000-0000-000000000011', 'effective_amount', '100', '100', '125', 'Ajuste sintético autorizado', '00000000-0000-0000-0000-000000000013'); update public.work_entries set effective_amount = 125 where id = '40000000-0000-0000-0000-000000000011'$$,
  'billing can apply a recorded override'
);
select is((select effective_amount from public.work_entries where id = '40000000-0000-0000-0000-000000000011'), 125.00::numeric, 'override value was applied');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000014', true);
select results_eq('select client_code from public.clients order by client_code', array['RLS-B'::text], 'viewer sees only its firm');

select * from finish();
rollback;
