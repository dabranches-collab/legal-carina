-- Authorised isolated synthetic original-DB audit. Random identifiers; every change rolled back.
-- Synthetic identities; all rows and test objects are rolled back.
begin;
set local search_path=public,extensions;
create temp table tap_results(line text);
grant all on tap_results to authenticated,anon;
create function pg_temp.audit_is(actual anyelement,expected anyelement,label text) returns text language plpgsql as $$begin if actual is distinct from expected then raise exception 'FAIL: % expected %, got %',label,expected,actual;end if;return 'PASS: '||label;end$$;
create function pg_temp.audit_throws(statement text,pattern text,label text) returns text language plpgsql as $$declare caught text;begin begin execute statement;exception when others then caught:=sqlerrm;end;if caught is null or caught not like pattern then raise exception 'FAIL: % expected %, got %',label,pattern,caught;end if;return 'PASS: '||label;end$$;

insert into auth.users(id) values
 ('e2d923d8-1e2e-4c15-8e18-8604cd7cc077'),
 ('0594e072-186d-4044-882c-a507f881bac4'),
 ('44908136-09c6-46b9-8697-c97d39440ee1');
select set_config('request.jwt.claim.sub','e2d923d8-1e2e-4c15-8e18-8604cd7cc077',true);
insert into law_firms(id,name) values('0148fb10-f6ef-4b0b-8c06-12ac15304b17','Escritório Sintético');
insert into firm_members(firm_id,user_id,role) values
 ('0148fb10-f6ef-4b0b-8c06-12ac15304b17','e2d923d8-1e2e-4c15-8e18-8604cd7cc077','owner'),
 ('0148fb10-f6ef-4b0b-8c06-12ac15304b17','0594e072-186d-4044-882c-a507f881bac4','operator');
insert into billing_entities(id,firm_id,name) values('326dd1e3-8aed-4127-803c-8b4f4e897d09','0148fb10-f6ef-4b0b-8c06-12ac15304b17','Sociedade Sintética');
insert into clients(id,firm_id,client_code,client_type,display_name) values('983b585e-f9ac-4e60-8b64-277f671386ea','0148fb10-f6ef-4b0b-8c06-12ac15304b17','QA-070','individual','Cliente Sintético');
insert into client_profiles(id,firm_id,client_id,client_code,client_type) values('ce21af15-833f-46f3-879a-56afcef7d628','0148fb10-f6ef-4b0b-8c06-12ac15304b17','983b585e-f9ac-4e60-8b64-277f671386ea','QA-070','individual');
insert into professionals(id,firm_id,display_name) values('8f0d34ed-f75c-49af-8755-05f834875d4b','0148fb10-f6ef-4b0b-8c06-12ac15304b17','Responsável Sintético');
insert into work_entries(id,firm_id,client_id,client_profile_id,professional_id,billing_entity_id,work_date,activity_description,duration_minutes,specific_hourly_rate)
select id::uuid,'0148fb10-f6ef-4b0b-8c06-12ac15304b17','983b585e-f9ac-4e60-8b64-277f671386ea','ce21af15-833f-46f3-879a-56afcef7d628','8f0d34ed-f75c-49af-8755-05f834875d4b','326dd1e3-8aed-4127-803c-8b4f4e897d09','2026-01-01','Análise sintética',60,rate
from (values('5e14e611-879b-4a68-89c8-4247eaa4938d',100),('b8d8b7b7-710c-492f-8663-010954a08411',1000)) x(id,rate);
create temp table context(account uuid,payment uuid,note jsonb,request uuid default gen_random_uuid());
grant all on context to authenticated;
set local role authenticated;
insert into tap_results select pg_temp.audit_is((select effective_amount from work_entries where id='5e14e611-879b-4a68-89c8-4247eaa4938d'),100::numeric,'Real trigger computes hourly amount');
insert into context(payment) select record_client_credit_payment('983b585e-f9ac-4e60-8b64-277f671386ea','326dd1e3-8aed-4127-803c-8b4f4e897d09','EUR',1000,'2026-01-01','Saldo inicial sintético','d1739ea2-1f9c-48e7-875e-bd1480b49a64');
update context set account=(get_client_credit_accounts()->0->>'id')::uuid;
insert into tap_results select pg_temp.audit_is((get_client_credit_accounts()->0->>'balance')::numeric,1000::numeric,'Initial balance');
insert into tap_results select pg_temp.audit_is(record_client_credit_payment('983b585e-f9ac-4e60-8b64-277f671386ea','326dd1e3-8aed-4127-803c-8b4f4e897d09','EUR',1000,'2026-01-01','Saldo inicial sintético','d1739ea2-1f9c-48e7-875e-bd1480b49a64'),payment,'Payment retry is idempotent') from context;
update context set note=issue_provision_honorarium_note(account,array['5e14e611-879b-4a68-89c8-4247eaa4938d'::uuid],23,123,123,'{}',request);
insert into tap_results select pg_temp.audit_is((note->>'balance_after')::numeric,877::numeric,'Deduction includes VAT') from context;
insert into tap_results select pg_temp.audit_is(issue_provision_honorarium_note(account,array['5e14e611-879b-4a68-89c8-4247eaa4938d'::uuid],23,123,123,'{}',request)->>'id',note->>'id','Note retry is idempotent') from context;
insert into tap_results select pg_temp.audit_throws(format('select issue_provision_honorarium_note(%L,array[%L::uuid],23,123,123,%L,gen_random_uuid())',account,'5e14e611-879b-4a68-89c8-4247eaa4938d','{}'),'%já consta%','Duplicate note denied') from context;
insert into tap_results select pg_temp.audit_throws('update client_credit_movements set amount=999 where account_id=(select account from context)','%permission denied%','Ledger cannot be edited directly');
insert into tap_results select pg_temp.audit_throws('delete from client_credit_movements where account_id=(select account from context)','%permission denied%','Ledger cannot be deleted directly');
-- Existing work updates use SECURITY DEFINER RPCs. Exercise the invariant as
-- the database owner too, retaining the synthetic actor and every trigger.
reset role;
insert into tap_results select pg_temp.audit_throws('update work_entries set activity_description=''Alteração'' where id=''5e14e611-879b-4a68-89c8-4247eaa4938d''','%Estorne a nota%','Noted work is protected even for privileged writes');
set local role authenticated;
insert into tap_results select pg_temp.audit_throws(format('select reverse_client_credit(%L,%L,gen_random_uuid())',payment,'Estorno sintético'),'%saldo não pode%','Payment reversal cannot create negative balance') from context;
select reverse_client_credit((select id from client_credit_movements where kind='consumption' and account_id=(select account from context)),'Estorno sintético',gen_random_uuid());
insert into tap_results select pg_temp.audit_is((get_client_credit_accounts()->0->>'balance')::numeric,1000::numeric,'Note reversal restores balance');
update context set note=issue_provision_honorarium_note(account,array['b8d8b7b7-710c-492f-8663-010954a08411'::uuid],23,1230,1000,'{}',gen_random_uuid());
insert into tap_results select pg_temp.audit_is((note->>'remaining')::numeric,230::numeric,'Partial coverage keeps remaining amount') from context;
insert into tap_results select pg_temp.audit_is((get_client_credit_accounts()->0->>'balance')::numeric,0::numeric,'Exhausted account remains listed');
insert into tap_results select pg_temp.audit_is(jsonb_array_length(get_client_credit_detail(account)->'movements'),4,'Full payment, deduction and reversal history') from context;
select set_config('request.jwt.claim.sub','0594e072-186d-4044-882c-a507f881bac4',true);
insert into tap_results select pg_temp.audit_is(get_client_credit_accounts(),'[]'::jsonb,'Operator without financial permission sees no accounts');
insert into tap_results select pg_temp.audit_throws(format('select get_client_credit_detail(%L)',account),'%sem permissão%','Operator cannot retrieve history') from context;
insert into tap_results select pg_temp.audit_throws('select record_client_credit_payment(''983b585e-f9ac-4e60-8b64-277f671386ea'',''326dd1e3-8aed-4127-803c-8b4f4e897d09'',''EUR'',1,current_date,''Sem permissão'',gen_random_uuid())','%Sem permissão%','Operator cannot add payment');
select set_config('request.jwt.claim.sub','44908136-09c6-46b9-8697-c97d39440ee1',true);
insert into tap_results select pg_temp.audit_is(get_client_credit_accounts(),'[]'::jsonb,'Unrelated user cannot see accounts');
insert into tap_results select pg_temp.audit_throws(format('select issue_provision_honorarium_note(%L,array[%L::uuid],23,123,123,%L,gen_random_uuid())',account,'5e14e611-879b-4a68-89c8-4247eaa4938d','{}'),'%Sem permissão%','Unrelated user cannot issue note') from context;
reset role;
set local role anon;
insert into tap_results select pg_temp.audit_throws('select get_client_credit_accounts()','%permission denied%','Anonymous caller denied');
reset role;

select jsonb_agg(line) as tap_results from tap_results;
rollback;
