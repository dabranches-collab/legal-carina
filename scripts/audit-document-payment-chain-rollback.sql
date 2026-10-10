-- Dedicated, isolated PostgreSQL QA only. Every synthetic row is rolled back.
begin;
set local statement_timeout='30s';
do $audit$
declare
 actor uuid:=gen_random_uuid(); firm uuid:=gen_random_uuid(); client uuid:=gen_random_uuid();
 profile uuid:=gen_random_uuid(); professional uuid:=gen_random_uuid(); society uuid:=gen_random_uuid();
 work uuid; expense uuid; options jsonb; note jsonb; revised jsonb; item jsonb; receipt jsonb;
 payment_request uuid:=gen_random_uuid(); before_ledger bigint; before_versions bigint;
begin
 insert into auth.users(id,email)values(actor,actor::text||'@example.test');
 insert into law_firms(id,name)values(firm,'Synthetic document/payment chain');
 insert into firm_members(firm_id,user_id,role)values(firm,actor,'owner');
 insert into billing_entities(id,firm_id,name)values(society,firm,'Synthetic issuer');
 insert into clients(id,firm_id,client_code,client_type,display_name)values(client,firm,'QA-'||client,'individual','Synthetic client');
 insert into client_profiles(id,firm_id,client_id,client_type,client_code)values(profile,firm,client,'individual','QA-'||client);
 insert into professionals(id,firm_id,display_name)values(professional,firm,'Synthetic professional');
 perform set_config('request.jwt.claim.sub',actor::text,true);execute 'set local role authenticated';
 work:=(create_work_entry_with_allocation(current_date,profile,null,professional,society,'Reunião de teste TESTE-123',60,null,100)->>'workEntryId')::uuid;
 expense:=create_work_entry_expense(work,25,'Correio registado de teste');
 perform record_client_credit_payment(client,society,'EUR',30,current_date,'Synthetic provision',gen_random_uuid());
 options:=jsonb_build_object('language','en','translation',jsonb_build_object('language','en','items',jsonb_build_array(jsonb_build_object('id',work,'kind','work','text','Test meeting TESTE-123'))),
  'expenses_included',true,'expenses',jsonb_build_array(jsonb_build_object('id',expense,'work_entry_id',work,'amount',25,'currency','EUR','observations','Synthetic registered post')));
 note:=save_honorarium_document(client,society,array[work],23,options,null,null,true,148,30,gen_random_uuid());
 if (note->>'remaining')::numeric<>118 or (note->>'subtotal')::numeric<>100 or (note->>'vat')::numeric<>23 then raise exception 'Expense/VAT/provision arithmetic failed';end if;
 if (note->'document_options'->'translation'->'items'->0->>'text')<>'Test meeting TESTE-123' then raise exception 'Translation snapshot lost';end if;
 if not exists(select 1 from work_entries where id=work and activity_description='Reunião de teste TESTE-123' and not is_paid and not is_invoiced) then raise exception 'Issuance changed original work or invoice/payment status';end if;
 options:=jsonb_set(options,'{language}','"fr"');
 options:=jsonb_set(options,'{translation}',jsonb_build_object('language','fr','items',jsonb_build_array(jsonb_build_object('id',work,'kind','work','text','Réunion de test TESTE-123'))));
 revised:=save_honorarium_document(client,society,array[work],23,options,(note->>'document_id')::uuid,1,true,148,30,gen_random_uuid());
 if (revised->>'revision')::integer<>2 or revised->>'credit_note_id'<>note->>'credit_note_id' then raise exception 'Revision duplicated provision or lost version';end if;
 select value into item from jsonb_array_elements(get_workflow_payment_queue(society,professional,'individual')) where value->>'id'=note->>'document_id';
 if (item->>'remaining')::numeric<>118 then raise exception 'Scoped queue lost integral note amount';end if;
 receipt:=record_pending_payment('note',(note->>'document_id')::uuid,18,current_date,'Synthetic partial receipt',item->>'token',payment_request);
 if (receipt->>'remaining')::numeric<>100 then raise exception 'Partial receipt has incorrect balance';end if;
 receipt:=record_pending_payment('note',(note->>'document_id')::uuid,18,current_date,'Synthetic partial receipt',item->>'token',payment_request);
 if not(receipt->>'replayed')::boolean then raise exception 'Receipt retry duplicated settlement';end if;
 -- The receipt ledger is intentionally server-only. Observe it as the QA owner,
 -- then restore authenticated before the next product mutation.
 execute 'reset role';
 select count(*) into before_ledger from pending_payment_receipts where firm_id=firm;
 select count(*) into before_versions from honorarium_document_versions where firm_id=firm;
 if before_ledger<>1 or before_versions<>2 then raise exception 'Payment reissued note or duplicated ledger';end if;
 execute 'set local role authenticated';
 select document_options into options from honorarium_document_versions where id=(revised->>'id')::uuid;
 options:=jsonb_set(options,'{expenses,0,amount}','50');
 begin
  perform save_honorarium_document(client,society,array[work],23,options,(note->>'document_id')::uuid,2,true,173,30,gen_random_uuid());
  raise exception 'Forged expense amount accepted';
 exception when raise_exception then
  if sqlerrm not like '%despesas dos registos mudaram%' then raise;end if;
 end;
 execute 'reset role';
 if (select count(*) from pending_payment_receipts where firm_id=firm)<>before_ledger or (select count(*) from honorarium_document_versions where firm_id=firm)<>before_versions then raise exception 'Rejected revision changed persisted financial rows';end if;
 if not exists(select 1 from honorarium_document_versions where id=(revised->>'id')::uuid and remaining=100) then raise exception 'Rejected revision lost partial receipt';end if;
 execute 'reset role';
end $audit$;
select 'PASS: actual PostgreSQL work -> expense -> VAT -> provision -> EN/FR snapshots -> revision -> scoped queue -> partial receipt -> replay -> forged expense rollback' result;
rollback;
