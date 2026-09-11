begin;
create temp table audit_results(line text);grant all on audit_results to authenticated,anon;
create function pg_temp.audit_is(actual anyelement,expected anyelement,label text) returns text language plpgsql as $$begin if actual is distinct from expected then raise exception 'FAIL: % expected %, got %',label,expected,actual;end if;return 'PASS: '||label;end$$;
create function pg_temp.audit_ok(actual boolean,label text) returns text language plpgsql as $$begin if actual is distinct from true then raise exception 'FAIL: %',label;end if;return 'PASS: '||label;end$$;
create function pg_temp.audit_lives(statement text,label text) returns text language plpgsql as $$begin execute statement;return 'PASS: '||label;end$$;
create function pg_temp.audit_throws(statement text,code text,message text,label text) returns text language plpgsql as $$declare caught text;state text;begin begin execute statement;exception when others then caught:=sqlerrm;state:=sqlstate;end;if caught is distinct from message or state is distinct from code then raise exception 'FAIL: % expected % %, got % %',label,code,message,state,caught;end if;return 'PASS: '||label;end$$;
insert into auth.users(id,email) values
 ('4119d9a6-e4af-4645-850e-5396d6e69c42','expense-admin@example.test'),
 ('5e681246-fefd-4190-814d-41099188968b','expense-operator@example.test'),
 ('dcb65395-5af1-49d1-8a92-cf61ee7af213','expense-outsider@example.test');
insert into public.law_firms(id,name) values('c3830faa-7463-4b9e-8aed-31802d667244','Escritório despesas sintético');
insert into public.firm_members(firm_id,user_id,role) values
 ('c3830faa-7463-4b9e-8aed-31802d667244','4119d9a6-e4af-4645-850e-5396d6e69c42','admin'),
 ('c3830faa-7463-4b9e-8aed-31802d667244','5e681246-fefd-4190-814d-41099188968b','operator');
insert into public.clients(id,firm_id,client_code,client_type,display_name) values('e1cb7c5d-d0a5-42d7-830a-f0fdb73b3833','c3830faa-7463-4b9e-8aed-31802d667244','QA-EXP','company','Cliente despesas sintético');
insert into public.client_profiles(id,firm_id,client_id,client_type,client_code) values('f5530934-2d04-4dcc-8b67-2cda48812283','c3830faa-7463-4b9e-8aed-31802d667244','e1cb7c5d-d0a5-42d7-830a-f0fdb73b3833','company','QA-EXP');
insert into public.professionals(id,firm_id,display_name) values('d0a01baa-16f3-403f-8bea-06fd1a3d57de','c3830faa-7463-4b9e-8aed-31802d667244','Responsável despesas sintético');
insert into public.billing_entities(id,firm_id,name,legal_name) values('3997e0b5-9b31-40f3-89a6-d2e98a35883f','c3830faa-7463-4b9e-8aed-31802d667244','Sociedade despesas','Sociedade despesas');
insert into public.billing_entity_financial_permissions(firm_id,user_id,billing_entity_id,can_view_financials,created_by) values
 ('c3830faa-7463-4b9e-8aed-31802d667244','4119d9a6-e4af-4645-850e-5396d6e69c42','3997e0b5-9b31-40f3-89a6-d2e98a35883f',true,'4119d9a6-e4af-4645-850e-5396d6e69c42'),
 ('c3830faa-7463-4b9e-8aed-31802d667244','5e681246-fefd-4190-814d-41099188968b','3997e0b5-9b31-40f3-89a6-d2e98a35883f',true,'4119d9a6-e4af-4645-850e-5396d6e69c42');
select set_config('request.jwt.claim.sub','4119d9a6-e4af-4645-850e-5396d6e69c42',true);
select set_config('request.jwt.claim.role','authenticated',true);
insert into public.work_entries(id,firm_id,work_date,client_id,client_profile_id,professional_id,billing_entity_id,activity_description,duration_minutes,effective_hourly_rate,effective_amount,calculated_hourly_rate,calculated_amount,charge_type,currency,status,is_billable,is_invoiced,source_type,created_by) values('d4e4cb81-bddc-4ff2-8ccc-d8921cd6d216','c3830faa-7463-4b9e-8aed-31802d667244','2026-08-21','e1cb7c5d-d0a5-42d7-830a-f0fdb73b3833','f5530934-2d04-4dcc-8b67-2cda48812283','d0a01baa-16f3-403f-8bea-06fd1a3d57de','3997e0b5-9b31-40f3-89a6-d2e98a35883f','tcodexadministrador despesas',60,100,100,100,100,'hourly','EUR','draft',true,false,'manual','4119d9a6-e4af-4645-850e-5396d6e69c42');

select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','4119d9a6-e4af-4645-850e-5396d6e69c42',true);
set local role authenticated;
insert into audit_results select pg_temp.audit_lives($$select public.create_work_entry_expense('d4e4cb81-bddc-4ff2-8ccc-d8921cd6d216',12.50,'Certidão')$$,'Administrador cria despesa');
reset role;
insert into audit_results select pg_temp.audit_is((select effective_amount from public.work_entries where id='d4e4cb81-bddc-4ff2-8ccc-d8921cd6d216'),100.00::numeric,'criar despesa não altera o valor do movimento');
insert into audit_results select pg_temp.audit_is((select count(*) from public.work_entry_expenses where work_entry_id='d4e4cb81-bddc-4ff2-8ccc-d8921cd6d216' and status='active'),1::bigint,'a despesa fica associada ao movimento');

select set_config('request.jwt.claim.sub','5e681246-fefd-4190-814d-41099188968b',true);
set local role authenticated;
insert into audit_results select pg_temp.audit_lives(format('select public.update_work_entry_expense(%L,15,%L,null)',(select id from public.work_entry_expenses where work_entry_id='d4e4cb81-bddc-4ff2-8ccc-d8921cd6d216'),'Certidão revista'), 'Operador autorizado altera sem motivo obrigatório');
insert into audit_results select pg_temp.audit_lives(format('select public.update_work_entry_expense(%L,15,%L,%L)',(select id from public.work_entry_expenses where work_entry_id='d4e4cb81-bddc-4ff2-8ccc-d8921cd6d216'),'Certidão revista','tcodexoperador: correcção'),'motivo permite ao Operador alterar a despesa');
insert into audit_results select pg_temp.audit_ok(public.can_manage_work_entry_expense_document((select id from public.work_entry_expenses where work_entry_id='d4e4cb81-bddc-4ff2-8ccc-d8921cd6d216')),'Operador autorizado pode associar documentos à despesa');
reset role;
insert into audit_results select pg_temp.audit_is((select effective_amount from public.work_entries where id='d4e4cb81-bddc-4ff2-8ccc-d8921cd6d216'),100.00::numeric,'alterar despesa não recalcula nem contamina facturação');
insert into audit_results select pg_temp.audit_is((select is_invoiced from public.work_entries where id='d4e4cb81-bddc-4ff2-8ccc-d8921cd6d216'),false,'alterar despesa não altera o estado de factura');

select set_config('request.jwt.claim.sub','dcb65395-5af1-49d1-8a92-cf61ee7af213',true);
set local role authenticated;
insert into audit_results select pg_temp.audit_throws($$select public.create_work_entry_expense('d4e4cb81-bddc-4ff2-8ccc-d8921cd6d216',1,'Intrusão')$$,'P0001','not authorized','Utilizador exterior não cria despesas noutro escritório');
insert into audit_results select pg_temp.audit_is((select count(*) from public.work_entry_expenses),0::bigint,'RLS não revela despesas a utilizador exterior');
insert into audit_results select pg_temp.audit_is(public.can_manage_work_entry_expense_document((select id from public.work_entry_expenses where work_entry_id='d4e4cb81-bddc-4ff2-8ccc-d8921cd6d216')),false,'Utilizador exterior não obtém autorização documental');
reset role;

select set_config('request.jwt.claim.sub','4119d9a6-e4af-4645-850e-5396d6e69c42',true);
set local role authenticated;
insert into audit_results select pg_temp.audit_lives(format('select public.update_work_entry_expense(%L,18,%L,null)',(select id from public.work_entry_expenses where work_entry_id='d4e4cb81-bddc-4ff2-8ccc-d8921cd6d216'),'Administrador sem motivo'),'Administrador altera despesa sem justificação');
insert into audit_results select pg_temp.audit_lives(format('select public.remove_work_entry_expense(%L,null)',(select id from public.work_entry_expenses where work_entry_id='d4e4cb81-bddc-4ff2-8ccc-d8921cd6d216')),'Administrador remove despesa sem justificação');
insert into audit_results select pg_temp.audit_lives($$select public.create_work_entry_with_expenses('2026-08-21','f5530934-2d04-4dcc-8b67-2cda48812283',null,'d0a01baa-16f3-403f-8bea-06fd1a3d57de','3997e0b5-9b31-40f3-89a6-d2e98a35883f','tcodexadministrador criação atómica',30,null,120,'[{"key":"a","amount":3.25,"observations":"Portes"},{"key":"b","amount":4.75,"observations":"Cópias"}]'::jsonb)$$,'movimento e várias despesas são criados atomicamente');
reset role;
insert into audit_results select pg_temp.audit_is((select effective_amount from public.work_entries where id='d4e4cb81-bddc-4ff2-8ccc-d8921cd6d216'),100.00::numeric,'remover despesa preserva o total facturável');
insert into audit_results select pg_temp.audit_is((select count(*) from public.work_entry_expenses e join public.work_entries w on w.id=e.work_entry_id where w.activity_description='tcodexadministrador criação atómica' and e.status='active'),2::bigint,'a criação atómica associa todas as despesas ao novo movimento');

select count(*) checks,jsonb_agg(line) results from audit_results;
rollback;
