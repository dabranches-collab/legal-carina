begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000000091', 'pricing-owner@example.test');
insert into public.legal_documents (id, document_type, version, title, body_markdown, effective_at, status, content_hash) values
  ('90000000-0000-0000-0000-000000000091', 'terms_of_service', 'price-test-1', 'Termos sintéticos', 'Conteúdo de teste', now(), 'published', repeat('a', 64)),
  ('90000000-0000-0000-0000-000000000092', 'privacy_policy', 'price-test-1', 'Privacidade sintética', 'Conteúdo de teste', now(), 'published', repeat('b', 64)),
  ('90000000-0000-0000-0000-000000000093', 'gdpr_terms', 'price-test-1', 'RGPD sintético', 'Conteúdo de teste', now(), 'published', repeat('c', 64));
insert into public.user_legal_acceptances (user_id, legal_document_id, document_type, document_version, evidence)
select '00000000-0000-0000-0000-000000000091', d.id, d.document_type, d.version, '{"source":"pgtap"}'::jsonb
from public.legal_documents d;
insert into public.law_firms (id, name) values ('10000000-0000-0000-0000-000000000091', 'Escritório de preços sintético');
insert into public.firm_members (firm_id, user_id, role) values
  ('10000000-0000-0000-0000-000000000091', '00000000-0000-0000-0000-000000000091', 'owner');
insert into public.clients (id, firm_id, client_code, client_type, display_name) values
  ('20000000-0000-0000-0000-000000000091', '10000000-0000-0000-0000-000000000091', 'PRICE-1', 'company', 'Cliente sintético');
insert into public.professionals (id, firm_id, display_name) values
  ('30000000-0000-0000-0000-000000000091', '10000000-0000-0000-0000-000000000091', 'Profissional sintético');
insert into public.billing_entities (id, firm_id, legal_name) values
  ('50000000-0000-0000-0000-000000000091', '10000000-0000-0000-0000-000000000091', 'Sociedade sintética');
insert into public.service_types (id, firm_id, code, name) values
  ('60000000-0000-0000-0000-000000000091', '10000000-0000-0000-0000-000000000091', 'SYN', 'Serviço sintético');
insert into public.matters (id, firm_id, client_id, matter_code, title) values
  ('70000000-0000-0000-0000-000000000091', '10000000-0000-0000-0000-000000000091', '20000000-0000-0000-0000-000000000091', 'MAT-1', 'Processo sintético');

insert into public.rate_rules (
  id, firm_id, name, hourly_rate, currency, valid_from, priority, created_by,
  client_id, matter_id, professional_id, billing_entity_id, service_type_id
) values
  ('80000000-0000-0000-0000-000000000091', '10000000-0000-0000-0000-000000000091', 'Padrão', 50, 'EUR', '2020-01-01', 999, '00000000-0000-0000-0000-000000000091', null, null, null, null, null),
  ('80000000-0000-0000-0000-000000000092', '10000000-0000-0000-0000-000000000091', 'Cliente', 80, 'EUR', '2020-01-01', 100, '00000000-0000-0000-0000-000000000091', '20000000-0000-0000-0000-000000000091', null, null, null, null),
  ('80000000-0000-0000-0000-000000000093', '10000000-0000-0000-0000-000000000091', 'Processo e profissional', 100, 'EUR', '2020-01-01', 0, '00000000-0000-0000-0000-000000000091', null, '70000000-0000-0000-0000-000000000091', '30000000-0000-0000-0000-000000000091', null, null),
  ('80000000-0000-0000-0000-000000000094', '10000000-0000-0000-0000-000000000091', 'Expirada', 999, 'EUR', '2019-01-01', 9999, '00000000-0000-0000-0000-000000000091', '20000000-0000-0000-0000-000000000091', null, '30000000-0000-0000-0000-000000000091', null, null);
update public.rate_rules set valid_until = '2019-12-31' where id = '80000000-0000-0000-0000-000000000094';

insert into public.work_entries (
  id, firm_id, work_date, client_id, matter_id, professional_id, billing_entity_id, service_type_id,
  activity_description, duration_minutes, imported_amount, effective_amount, source_type, created_by
) values
  ('40000000-0000-0000-0000-000000000091', '10000000-0000-0000-0000-000000000091', '2026-04-07', '20000000-0000-0000-0000-000000000091', '70000000-0000-0000-0000-000000000091', '30000000-0000-0000-0000-000000000091', '50000000-0000-0000-0000-000000000091', '60000000-0000-0000-0000-000000000091', 'Trabalho de teste', 90, 140, 140, 'xlsx', '00000000-0000-0000-0000-000000000091'),
  ('40000000-0000-0000-0000-000000000092', '10000000-0000-0000-0000-000000000091', '2026-04-07', '20000000-0000-0000-0000-000000000091', null, '30000000-0000-0000-0000-000000000091', null, null, 'Sem regra específica', 60, null, 10, 'manual', '00000000-0000-0000-0000-000000000091');

select is((select imported_amount from public.work_entries where id = '40000000-0000-0000-0000-000000000091'), 140.00::numeric, 'o valor Excel é preservado');
select is((select imported_duration_minutes from public.work_entries where id = '40000000-0000-0000-0000-000000000091'), 90, 'a duração importada é preservada');
select is((select rule_id from private.resolve_rate_rule('10000000-0000-0000-0000-000000000091', '2026-04-07', '20000000-0000-0000-0000-000000000091', '70000000-0000-0000-0000-000000000091', '30000000-0000-0000-0000-000000000091', '50000000-0000-0000-0000-000000000091', '60000000-0000-0000-0000-000000000091')), '80000000-0000-0000-0000-000000000093'::uuid, 'a regra mais específica vence a prioridade global');
select is((select hourly_rate from private.resolve_rate_rule('10000000-0000-0000-0000-000000000091', '2026-04-07', '20000000-0000-0000-0000-000000000091', null, '30000000-0000-0000-0000-000000000091', null, null)), 80.00::numeric, 'uma regra expirada é ignorada');
select is((select proposed_amount from private.calculate_work_entry('40000000-0000-0000-0000-000000000091')), 150.00::numeric, 'calcula preço por hora em minutos');

insert into public.discounts (firm_id, name, scope_type, work_entry_id, discount_type, percentage, valid_from, reason, authorized_by)
values ('10000000-0000-0000-0000-000000000091', 'Desconto sintético', 'work_entry', '40000000-0000-0000-0000-000000000091', 'percentage', 10, '2026-01-01', 'Aprovação sintética', '00000000-0000-0000-0000-000000000091');
select is((select discount_amount from private.calculate_work_entry('40000000-0000-0000-0000-000000000091')), 15.00::numeric, 'aplica desconto percentual');
select is((select proposed_amount from private.calculate_work_entry('40000000-0000-0000-0000-000000000091')), 135.00::numeric, 'calcula o valor após desconto');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000091', true);
select lives_ok(
  $$select private.apply_work_entry_override('40000000-0000-0000-0000-000000000091', 'effective_amount', '145'::jsonb, 'Acordo sintético autorizado')$$,
  'o RPC aplica um override com motivo'
);
select is((select manual_amount from public.work_entries where id = '40000000-0000-0000-0000-000000000091'), 145.00::numeric, 'guarda o valor manual separadamente');
select ok((select has_manual_override from public.work_entries where id = '40000000-0000-0000-0000-000000000091'), 'mostra o indicador de override');
select is((select updated_count from private.recalculate_work_entries(array['40000000-0000-0000-0000-000000000091'::uuid], true, true)), 0, 'o recálculo não substitui overrides');
select throws_ok(
  $$select private.apply_work_entry_override('40000000-0000-0000-0000-000000000092', 'is_paid', 'true'::jsonb, 'Pagamento sintético')$$,
  'P0001', 'an entry must be invoiced before it can be marked as paid', 'não permite pagar antes de faturar'
);

select * from finish();
rollback;
