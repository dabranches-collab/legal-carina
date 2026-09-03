begin;
create temp table audit_results(line text);grant all on audit_results to authenticated,anon;
create function pg_temp.audit_is(actual anyelement,expected anyelement,label text) returns text language plpgsql as $$begin if actual is distinct from expected then raise exception 'FAIL: % expected %, got %',label,expected,actual;end if;return 'PASS: '||label;end$$;
create function pg_temp.audit_ok(actual boolean,label text) returns text language plpgsql as $$begin if actual is distinct from true then raise exception 'FAIL: %',label;end if;return 'PASS: '||label;end$$;
create function pg_temp.audit_lives(statement text,label text) returns text language plpgsql as $$begin execute statement;return 'PASS: '||label;end$$;
create function pg_temp.audit_throws(statement text,code text,message text,label text) returns text language plpgsql as $$declare caught text;state text;begin begin execute statement;exception when others then caught:=sqlerrm;state:=sqlstate;end;if caught is distinct from message or state is distinct from code then raise exception 'FAIL: % expected % %, got % %',label,code,message,state,caught;end if;return 'PASS: '||label;end$$;
insert into auth.users (id, email) values ('17d0099b-6125-406e-8da5-bffe800e8b52', 'pricing-owner@example.test');
insert into public.law_firms (id, name) values ('fab64aa2-be79-4203-89ef-cda108f8b5d4', 'Escritório de preços sintético');
insert into public.firm_members (firm_id, user_id, role) values
  ('fab64aa2-be79-4203-89ef-cda108f8b5d4', '17d0099b-6125-406e-8da5-bffe800e8b52', 'owner');
insert into public.clients (id, firm_id, client_code, client_type, display_name) values
  ('9b9674ec-9468-4073-8ddd-cf498f3bd90f', 'fab64aa2-be79-4203-89ef-cda108f8b5d4', 'PRICE-1', 'company', 'Cliente sintético');
insert into public.client_profiles(id,firm_id,client_id,client_type,client_code) values
  ('8ec2187a-9e85-415b-8cbd-6d27351905bc','fab64aa2-be79-4203-89ef-cda108f8b5d4','9b9674ec-9468-4073-8ddd-cf498f3bd90f','company','PRICE-1');
insert into public.professionals (id, firm_id, display_name) values
  ('19847a9a-32b9-4bb3-8d49-8f80becff98e', 'fab64aa2-be79-4203-89ef-cda108f8b5d4', 'Profissional sintético');
insert into public.billing_entities (id, firm_id, name, legal_name) values
  ('97148bd9-d109-47e8-8934-a8a8667ac107', 'fab64aa2-be79-4203-89ef-cda108f8b5d4', 'Sociedade sintética', 'Sociedade sintética');
insert into public.service_types (id, firm_id, name) values
  ('8322cc7e-76c0-4490-8811-5d8ffe08fe9d', 'fab64aa2-be79-4203-89ef-cda108f8b5d4', 'Serviço sintético');
insert into public.matters (id, firm_id, client_id, matter_code, title) values
  ('33392fb1-c761-49c4-8a4d-92f95160a8cb', 'fab64aa2-be79-4203-89ef-cda108f8b5d4', '9b9674ec-9468-4073-8ddd-cf498f3bd90f', 'MAT-1', 'Processo sintético');

insert into public.rate_rules (
  id, firm_id, name, hourly_rate, currency, valid_from, priority, created_by,
  client_id, matter_id, professional_id, billing_entity_id, service_type_id
) values
  ('b43ca9c6-54df-4d9a-83da-a04ea9db6250', 'fab64aa2-be79-4203-89ef-cda108f8b5d4', 'Padrão', 50, 'EUR', '2020-01-01', 999, '17d0099b-6125-406e-8da5-bffe800e8b52', null, null, null, null, null),
  ('cbbf4913-d640-45c1-8214-bc09c0db7a30', 'fab64aa2-be79-4203-89ef-cda108f8b5d4', 'Cliente', 80, 'EUR', '2020-01-01', 100, '17d0099b-6125-406e-8da5-bffe800e8b52', '9b9674ec-9468-4073-8ddd-cf498f3bd90f', null, null, null, null),
  ('3fb2632b-43cc-4f47-8217-964f5814bfbb', 'fab64aa2-be79-4203-89ef-cda108f8b5d4', 'Processo e profissional', 100, 'EUR', '2020-01-01', 0, '17d0099b-6125-406e-8da5-bffe800e8b52', null, '33392fb1-c761-49c4-8a4d-92f95160a8cb', '19847a9a-32b9-4bb3-8d49-8f80becff98e', null, null),
  ('7772f25b-a894-43e9-8cca-6dc3bdb7a0cf', 'fab64aa2-be79-4203-89ef-cda108f8b5d4', 'Expirada', 999, 'EUR', '2019-01-01', 9999, '17d0099b-6125-406e-8da5-bffe800e8b52', '9b9674ec-9468-4073-8ddd-cf498f3bd90f', null, '19847a9a-32b9-4bb3-8d49-8f80becff98e', null, null);
update public.rate_rules set valid_until = '2019-12-31' where id = '7772f25b-a894-43e9-8cca-6dc3bdb7a0cf';

select set_config('request.jwt.claim.sub','17d0099b-6125-406e-8da5-bffe800e8b52',true);
insert into public.work_entries (
  id, firm_id, work_date, client_id, client_profile_id, matter_id, professional_id, billing_entity_id, service_type_id,
  activity_description, duration_minutes, imported_amount, effective_amount, source_type, created_by
) values
  ('5b60e8f5-750a-4193-8155-e2e70d3800af', 'fab64aa2-be79-4203-89ef-cda108f8b5d4', '2026-04-07', '9b9674ec-9468-4073-8ddd-cf498f3bd90f', '8ec2187a-9e85-415b-8cbd-6d27351905bc', '33392fb1-c761-49c4-8a4d-92f95160a8cb', '19847a9a-32b9-4bb3-8d49-8f80becff98e', '97148bd9-d109-47e8-8934-a8a8667ac107', '8322cc7e-76c0-4490-8811-5d8ffe08fe9d', 'Trabalho de teste', 90, 140, 140, 'xlsx', '17d0099b-6125-406e-8da5-bffe800e8b52'),
  ('674e0610-e9f8-47cf-8983-ad4dfb0a0b5f', 'fab64aa2-be79-4203-89ef-cda108f8b5d4', '2026-04-07', '9b9674ec-9468-4073-8ddd-cf498f3bd90f', '8ec2187a-9e85-415b-8cbd-6d27351905bc', null, '19847a9a-32b9-4bb3-8d49-8f80becff98e', null, null, 'Sem regra específica', 60, null, 10, 'manual', '17d0099b-6125-406e-8da5-bffe800e8b52');

insert into audit_results select pg_temp.audit_is((select imported_amount from public.work_entries where id = '5b60e8f5-750a-4193-8155-e2e70d3800af'), 140.00::numeric, 'o valor Excel é preservado');
insert into audit_results select pg_temp.audit_is((select imported_duration_minutes from public.work_entries where id = '5b60e8f5-750a-4193-8155-e2e70d3800af'), 90, 'a duração importada é preservada');
insert into audit_results select pg_temp.audit_is((select rule_id from private.resolve_rate_rule('fab64aa2-be79-4203-89ef-cda108f8b5d4', '2026-04-07', '9b9674ec-9468-4073-8ddd-cf498f3bd90f', '33392fb1-c761-49c4-8a4d-92f95160a8cb', '19847a9a-32b9-4bb3-8d49-8f80becff98e', '97148bd9-d109-47e8-8934-a8a8667ac107', '8322cc7e-76c0-4490-8811-5d8ffe08fe9d')), '3fb2632b-43cc-4f47-8217-964f5814bfbb'::uuid, 'a regra mais específica vence a prioridade global');
insert into audit_results select pg_temp.audit_is((select hourly_rate from private.resolve_rate_rule('fab64aa2-be79-4203-89ef-cda108f8b5d4', '2026-04-07', '9b9674ec-9468-4073-8ddd-cf498f3bd90f', null, '19847a9a-32b9-4bb3-8d49-8f80becff98e', null, null)), 80.00::numeric, 'uma regra expirada é ignorada');
insert into audit_results select pg_temp.audit_is((select proposed_amount from private.calculate_work_entry('5b60e8f5-750a-4193-8155-e2e70d3800af')), 150.00::numeric, 'calcula preço por hora em minutos');

insert into public.discounts (firm_id, name, scope_type, work_entry_id, discount_type, percentage, valid_from, reason, authorized_by)
values ('fab64aa2-be79-4203-89ef-cda108f8b5d4', 'Desconto sintético', 'work_entry', '5b60e8f5-750a-4193-8155-e2e70d3800af', 'percentage', 10, '2026-01-01', 'Aprovação sintética', '17d0099b-6125-406e-8da5-bffe800e8b52');
insert into audit_results select pg_temp.audit_is((select discount_amount from private.calculate_work_entry('5b60e8f5-750a-4193-8155-e2e70d3800af')), 15.00::numeric, 'aplica desconto percentual');
insert into audit_results select pg_temp.audit_is((select proposed_amount from private.calculate_work_entry('5b60e8f5-750a-4193-8155-e2e70d3800af')), 135.00::numeric, 'calcula o valor após desconto');

set local role authenticated;
select set_config('request.jwt.claim.sub', '17d0099b-6125-406e-8da5-bffe800e8b52', true);
insert into audit_results select pg_temp.audit_lives(
  $$select private.apply_work_entry_override('5b60e8f5-750a-4193-8155-e2e70d3800af', 'effective_amount', '145'::jsonb, 'Acordo sintético autorizado')$$,
  'o RPC aplica um override com motivo'
);
insert into audit_results select pg_temp.audit_is((select manual_amount from public.work_entries where id = '5b60e8f5-750a-4193-8155-e2e70d3800af'), 145.00::numeric, 'guarda o valor manual separadamente');
insert into audit_results select pg_temp.audit_ok((select has_manual_override from public.work_entries where id = '5b60e8f5-750a-4193-8155-e2e70d3800af'), 'mostra o indicador de override');
insert into audit_results select pg_temp.audit_is((select updated_count from private.recalculate_work_entries(array['5b60e8f5-750a-4193-8155-e2e70d3800af'::uuid], true, true)), 0, 'o recálculo não substitui overrides');
insert into audit_results select pg_temp.audit_throws(
  $$select private.apply_work_entry_override('674e0610-e9f8-47cf-8983-ad4dfb0a0b5f', 'is_paid', 'true'::jsonb, 'Pagamento sintético')$$,
  'P0001', 'an entry must be invoiced before it can be marked as paid', 'não permite pagar antes de facturar'
);

select count(*) checks,jsonb_agg(line) results from audit_results;
rollback;
