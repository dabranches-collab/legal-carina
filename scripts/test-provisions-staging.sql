-- Run only in an empty, disposable staging database with the real schema and pgTAP.
-- Synthetic identities; all rows and test objects are rolled back.
begin;
set local search_path=public,extensions;
create temp table tap_results(line text);
grant all on tap_results to authenticated,anon;
insert into tap_results select no_plan();
insert into auth.users(id) values
 ('00000000-0000-4000-8000-000000000001'),
 ('00000000-0000-4000-8000-000000000002'),
 ('00000000-0000-4000-8000-000000000003');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
insert into law_firms(id,name) values('00000000-0000-4000-8000-000000000010','Escritório Sintético');
insert into firm_members(firm_id,user_id,role) values
 ('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000001','owner'),
 ('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000002','operator');
insert into billing_entities(id,firm_id,name) values('00000000-0000-4000-8000-000000000030','00000000-0000-4000-8000-000000000010','Sociedade Sintética');
insert into clients(id,firm_id,client_code,client_type,display_name) values('00000000-0000-4000-8000-000000000020','00000000-0000-4000-8000-000000000010','QA-070','individual','Cliente Sintético');
insert into client_profiles(id,firm_id,client_id,client_code,client_type) values('00000000-0000-4000-8000-000000000021','00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000020','QA-070','individual');
insert into professionals(id,firm_id,display_name) values('00000000-0000-4000-8000-000000000050','00000000-0000-4000-8000-000000000010','Responsável Sintético');
insert into work_entries(id,firm_id,client_id,client_profile_id,professional_id,billing_entity_id,work_date,activity_description,duration_minutes,specific_hourly_rate)
select id::uuid,'00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000020','00000000-0000-4000-8000-000000000021','00000000-0000-4000-8000-000000000050','00000000-0000-4000-8000-000000000030','2026-01-01','Análise sintética',60,rate
from (values('00000000-0000-4000-8000-000000000040',100),('00000000-0000-4000-8000-000000000041',1000)) x(id,rate);
create temp table context(account uuid,payment uuid,note jsonb,request uuid default gen_random_uuid());
grant all on context to authenticated;
set local role authenticated;
insert into tap_results select is((select effective_amount from work_entries where id='00000000-0000-4000-8000-000000000040'),100::numeric,'Real trigger computes hourly amount');
insert into context(payment) select record_client_credit_payment('00000000-0000-4000-8000-000000000020','00000000-0000-4000-8000-000000000030','EUR',1000,'2026-01-01','Saldo inicial sintético','00000000-0000-4000-8000-000000000060');
update context set account=(get_client_credit_accounts()->0->>'id')::uuid;
insert into tap_results select is((get_client_credit_accounts()->0->>'balance')::numeric,1000::numeric,'Initial balance');
insert into tap_results select is(record_client_credit_payment('00000000-0000-4000-8000-000000000020','00000000-0000-4000-8000-000000000030','EUR',1000,'2026-01-01','Saldo inicial sintético','00000000-0000-4000-8000-000000000060'),payment,'Payment retry is idempotent') from context;
update context set note=issue_provision_honorarium_note(account,array['00000000-0000-4000-8000-000000000040'::uuid],23,123,123,'{}',request);
insert into tap_results select is((note->>'balance_after')::numeric,877::numeric,'Deduction includes VAT') from context;
insert into tap_results select is(issue_provision_honorarium_note(account,array['00000000-0000-4000-8000-000000000040'::uuid],23,123,123,'{}',request)->>'id',note->>'id','Note retry is idempotent') from context;
insert into tap_results select throws_like(format('select issue_provision_honorarium_note(%L,array[%L::uuid],23,123,123,%L,gen_random_uuid())',account,'00000000-0000-4000-8000-000000000040','{}'),'%já consta%','Duplicate note denied') from context;
insert into tap_results select throws_like('update client_credit_movements set amount=999','%permission denied%','Ledger cannot be edited directly');
insert into tap_results select throws_like('delete from client_credit_movements','%permission denied%','Ledger cannot be deleted directly');
-- Existing work updates use SECURITY DEFINER RPCs. Exercise the invariant as
-- the database owner too, retaining the synthetic actor and every trigger.
reset role;
insert into tap_results select throws_like('update work_entries set activity_description=''Alteração'' where id=''00000000-0000-4000-8000-000000000040''','%Estorne a nota%','Noted work is protected even for privileged writes');
set local role authenticated;
insert into tap_results select throws_like(format('select reverse_client_credit(%L,%L,gen_random_uuid())',payment,'Estorno sintético'),'%saldo não pode%','Payment reversal cannot create negative balance') from context;
select reverse_client_credit((select id from client_credit_movements where kind='consumption'),'Estorno sintético',gen_random_uuid());
insert into tap_results select is((get_client_credit_accounts()->0->>'balance')::numeric,1000::numeric,'Note reversal restores balance');
update context set note=issue_provision_honorarium_note(account,array['00000000-0000-4000-8000-000000000041'::uuid],23,1230,1000,'{}',gen_random_uuid());
insert into tap_results select is((note->>'remaining')::numeric,230::numeric,'Partial coverage keeps remaining amount') from context;
insert into tap_results select is((get_client_credit_accounts()->0->>'balance')::numeric,0::numeric,'Exhausted account remains listed');
insert into tap_results select is(jsonb_array_length(get_client_credit_detail(account)->'movements'),4,'Full payment, deduction and reversal history') from context;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
insert into tap_results select is(get_client_credit_accounts(),'[]'::jsonb,'Operator without financial permission sees no accounts');
insert into tap_results select throws_like(format('select get_client_credit_detail(%L)',account),'%sem permissão%','Operator cannot retrieve history') from context;
insert into tap_results select throws_like('select record_client_credit_payment(''00000000-0000-4000-8000-000000000020'',''00000000-0000-4000-8000-000000000030'',''EUR'',1,current_date,''Sem permissão'',gen_random_uuid())','%Sem permissão%','Operator cannot add payment');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',true);
insert into tap_results select is(get_client_credit_accounts(),'[]'::jsonb,'Unrelated user cannot see accounts');
insert into tap_results select throws_like(format('select issue_provision_honorarium_note(%L,array[%L::uuid],23,123,123,%L,gen_random_uuid())',account,'00000000-0000-4000-8000-000000000040','{}'),'%Sem permissão%','Unrelated user cannot issue note') from context;
reset role;
set local role anon;
insert into tap_results select throws_like('select get_client_credit_accounts()','%permission denied%','Anonymous caller denied');
reset role;
insert into tap_results select * from finish();
select jsonb_agg(line) as tap_results from tap_results;
rollback;
