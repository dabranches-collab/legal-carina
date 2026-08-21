begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select plan(30);

select has_table('public','work_entry_expenses','expense table exists');
select ok((select c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='work_entry_expenses'),'expense RLS is active');
select policies_are('public','work_entry_expenses',array['work_entry_expenses_select_scoped'],'expense writes are RPC-only');
select has_column('public','work_entry_expenses','work_entry_id','expense belongs to a work entry');
select has_column('public','work_entry_expenses','observations','expense supports notes');
select has_column('public','work_entry_expenses','amount','expense records its informational amount');
select has_table('public','work_entry_expense_documents','expense document metadata exists');
select ok((select c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='work_entry_expense_documents'),'expense document RLS is active');
select policies_are('public','work_entry_expense_documents',array['work_entry_expense_documents_select_scoped'],'document writes are Edge Function-only');
select has_function('public','create_work_entry_expense',array['uuid','numeric','text'],'expense creation RPC exists');
select has_function('public','update_work_entry_expense',array['uuid','numeric','text','text'],'expense update RPC exists');
select has_function('public','remove_work_entry_expense',array['uuid','text'],'expense removal RPC exists');
select has_function('public','create_work_entry_with_expenses',array['date','uuid','uuid','uuid','uuid','text','integer','text','numeric','jsonb'],'atomic work entry and expenses RPC exists');
select function_privs_are('public','create_work_entry_expense',array['uuid','numeric','text'],'authenticated',array['EXECUTE'],'authenticated users may create permitted expenses');
select function_privs_are('public','update_work_entry_expense',array['uuid','numeric','text','text'],'authenticated',array['EXECUTE'],'authenticated users may update permitted expenses');
select function_privs_are('public','remove_work_entry_expense',array['uuid','text'],'authenticated',array['EXECUTE'],'authenticated users may remove permitted expenses');
select function_privs_are('public','create_work_entry_with_expenses',array['date','uuid','uuid','uuid','uuid','text','integer','text','numeric','jsonb'],'authenticated',array['EXECUTE'],'authenticated users may create movement and expenses atomically');
select ok(position('facturação' in obj_description('public.work_entry_expenses'::regclass))>0,'schema documents that expenses are excluded from billing');

insert into auth.users(id,email) values
 ('00000000-0000-0000-0000-000000000151','expense-admin@example.test'),
 ('00000000-0000-0000-0000-000000000152','expense-operator@example.test');
insert into public.law_firms(id,name) values('10000000-0000-0000-0000-000000000151','Escritório despesas sintético');
insert into public.firm_members(firm_id,user_id,role) values
 ('10000000-0000-0000-0000-000000000151','00000000-0000-0000-0000-000000000151','admin'),
 ('10000000-0000-0000-0000-000000000151','00000000-0000-0000-0000-000000000152','operator');
insert into public.clients(id,firm_id,client_code,client_type,display_name) values('20000000-0000-0000-0000-000000000151','10000000-0000-0000-0000-000000000151','QA-EXP','company','Cliente despesas sintético');
insert into public.client_profiles(id,firm_id,client_id,client_type,client_code) values('25000000-0000-0000-0000-000000000151','10000000-0000-0000-0000-000000000151','20000000-0000-0000-0000-000000000151','company','QA-EXP');
insert into public.professionals(id,firm_id,display_name) values('30000000-0000-0000-0000-000000000151','10000000-0000-0000-0000-000000000151','Responsável despesas sintético');
insert into public.billing_entities(id,firm_id,name,legal_name) values('50000000-0000-0000-0000-000000000151','10000000-0000-0000-0000-000000000151','Sociedade despesas','Sociedade despesas');
insert into public.billing_entity_financial_permissions(firm_id,user_id,billing_entity_id,can_view_financials,created_by) values
 ('10000000-0000-0000-0000-000000000151','00000000-0000-0000-0000-000000000151','50000000-0000-0000-0000-000000000151',true,'00000000-0000-0000-0000-000000000151'),
 ('10000000-0000-0000-0000-000000000151','00000000-0000-0000-0000-000000000152','50000000-0000-0000-0000-000000000151',true,'00000000-0000-0000-0000-000000000151');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000151',true);
select set_config('request.jwt.claim.role','authenticated',true);
insert into public.work_entries(id,firm_id,work_date,client_id,client_profile_id,professional_id,billing_entity_id,activity_description,duration_minutes,effective_hourly_rate,effective_amount,calculated_hourly_rate,calculated_amount,charge_type,currency,status,is_billable,is_invoiced,source_type,created_by) values('40000000-0000-0000-0000-000000000151','10000000-0000-0000-0000-000000000151','2026-08-21','20000000-0000-0000-0000-000000000151','25000000-0000-0000-0000-000000000151','30000000-0000-0000-0000-000000000151','50000000-0000-0000-0000-000000000151','tcodexadministrador despesas',60,100,100,100,100,'hourly','EUR','draft',true,false,'manual','00000000-0000-0000-0000-000000000151');

select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000151',true);
set local role authenticated;
select lives_ok($$select public.create_work_entry_expense('40000000-0000-0000-0000-000000000151',12.50,'Certidão')$$,'Administrador cria despesa');
reset role;
select is((select effective_amount from public.work_entries where id='40000000-0000-0000-0000-000000000151'),100.00::numeric,'criar despesa não altera o valor do movimento');
select is((select count(*) from public.work_entry_expenses where work_entry_id='40000000-0000-0000-0000-000000000151' and status='active'),1::bigint,'a despesa fica associada ao movimento');

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000152',true);
set local role authenticated;
select throws_ok(format('select public.update_work_entry_expense(%L,15,%L,null)',(select id from public.work_entry_expenses where work_entry_id='40000000-0000-0000-0000-000000000151'),'Certidão revista'),'P0001','reason required','Operador não altera despesa sem motivo');
select lives_ok(format('select public.update_work_entry_expense(%L,15,%L,%L)',(select id from public.work_entry_expenses where work_entry_id='40000000-0000-0000-0000-000000000151'),'Certidão revista','tcodexoperador: correcção'),'motivo permite ao Operador alterar a despesa');
reset role;
select is((select effective_amount from public.work_entries where id='40000000-0000-0000-0000-000000000151'),100.00::numeric,'alterar despesa não recalcula nem contamina facturação');
select is((select is_invoiced from public.work_entries where id='40000000-0000-0000-0000-000000000151'),false,'alterar despesa não altera o estado de factura');

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000151',true);
set local role authenticated;
select lives_ok(format('select public.update_work_entry_expense(%L,18,%L,null)',(select id from public.work_entry_expenses where work_entry_id='40000000-0000-0000-0000-000000000151'),'Administrador sem motivo'),'Administrador altera despesa sem justificação');
select lives_ok(format('select public.remove_work_entry_expense(%L,null)',(select id from public.work_entry_expenses where work_entry_id='40000000-0000-0000-0000-000000000151')),'Administrador remove despesa sem justificação');
select lives_ok($$select public.create_work_entry_with_expenses('2026-08-21','25000000-0000-0000-0000-000000000151',null,'30000000-0000-0000-0000-000000000151','50000000-0000-0000-0000-000000000151','tcodexadministrador criação atómica',30,null,120,'[{"key":"a","amount":3.25,"observations":"Portes"},{"key":"b","amount":4.75,"observations":"Cópias"}]'::jsonb)$$,'movimento e várias despesas são criados atomicamente');
reset role;
select is((select effective_amount from public.work_entries where id='40000000-0000-0000-0000-000000000151'),100.00::numeric,'remover despesa preserva o total facturável');
select is((select count(*) from public.work_entry_expenses e join public.work_entries w on w.id=e.work_entry_id where w.activity_description='tcodexadministrador criação atómica' and e.status='active'),2::bigint,'a criação atómica associa todas as despesas ao novo movimento');

select * from finish();
rollback;
