begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000081', 'admin-auth@example.test'),
  ('00000000-0000-0000-0000-000000000082', 'lawyer-auth@example.test');
insert into public.law_firms (id, name) values ('10000000-0000-0000-0000-000000000081', 'Escritório Auth sintético');
insert into public.firm_members (firm_id, user_id, role) values
  ('10000000-0000-0000-0000-000000000081', '00000000-0000-0000-0000-000000000081', 'owner'),
  ('10000000-0000-0000-0000-000000000081', '00000000-0000-0000-0000-000000000082', 'professional');
insert into public.clients (id, firm_id, client_code, client_type, display_name) values
  ('20000000-0000-0000-0000-000000000081', '10000000-0000-0000-0000-000000000081', 'AUTH-1', 'company', 'Cliente Auth sintético');

select has_table('public', 'user_login_credentials', 'credenciais de username existem');
select has_table('public', 'security_events', 'eventos de segurança existem');
select has_table('public', 'access_grants', 'concessões granulares existem');
select col_type_is('public', 'security_events', 'metadata', 'jsonb', 'metadata de segurança usa jsonb');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000081', true);
select is((select count(*) from public.clients), 1::bigint, 'proprietário acede sem qualquer bloqueio documental');
select ok(not has_function_privilege('authenticated','public.get_pending_legal_documents()','EXECUTE'),'módulo documental legal não está exposto à aplicação');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000082', true);
select is((select count(*) from public.clients), 0::bigint, 'advogado sem grant não vê clientes');

reset role;
insert into public.access_grants (firm_id, principal_type, user_id, resource_type, client_id, permission, created_by)
values ('10000000-0000-0000-0000-000000000081', 'user', '00000000-0000-0000-0000-000000000082', 'client',
  '20000000-0000-0000-0000-000000000081', 'view', '00000000-0000-0000-0000-000000000081');
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000082', true);
select is((select count(*) from public.clients), 1::bigint, 'grant por cliente permite acesso explícito');

reset role;
insert into public.user_login_credentials(firm_id,user_id,username,auth_email,created_by,must_change_pin,display_name)
values('10000000-0000-0000-0000-000000000081','00000000-0000-0000-0000-000000000082','lawyer-auth','lawyer-auth@example.test','00000000-0000-0000-0000-000000000081',true,'Advogado Auth');
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000082', true);
select is((select count(*) from public.clients), 0::bigint, 'PIN inicial por substituir bloqueia os dados de negócio');
reset role;
update public.user_login_credentials set must_change_pin=false where user_id='00000000-0000-0000-0000-000000000082';
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000082', true);
select is((select count(*) from public.clients), 1::bigint, 'substituição do PIN inicial restaura o acesso concedido');

reset role;
update public.firm_members set active=false where firm_id='10000000-0000-0000-0000-000000000081' and user_id='00000000-0000-0000-0000-000000000082';
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000082', true);
select is((select count(*) from public.clients), 0::bigint, 'suspensão invalida imediatamente grants ainda activos');

select * from finish();
rollback;
