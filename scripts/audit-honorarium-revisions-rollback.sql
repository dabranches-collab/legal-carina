-- Run after the migration, inside BEGIN / ROLLBACK. Synthetic fixtures only.
do $audit$
declare actor uuid:=gen_random_uuid(); firm uuid:=gen_random_uuid(); client uuid:=gen_random_uuid();
 profile uuid:=gen_random_uuid(); professional uuid:=gen_random_uuid(); society uuid:=gen_random_uuid();
 first_id uuid; second_id uuid; account uuid; request uuid:=gen_random_uuid(); note jsonb; again jsonb; revised jsonb; duplicate jsonb; result jsonb;
 ledger_count integer; outsider uuid:=gen_random_uuid(); legacy jsonb;
begin
 insert into auth.users(id,email) values(actor,actor::text||'@example.test');
 insert into public.law_firms(id,name) values(firm,'Document revisions synthetic');
 insert into public.firm_members(firm_id,user_id,role) values(firm,actor,'owner');
 insert into public.clients(id,firm_id,client_code,client_type,display_name) values(client,firm,'02.1','individual','Synthetic document client');
 insert into public.client_profiles(id,firm_id,client_id,client_type,client_code) values(profile,firm,client,'individual','02.1');
 insert into public.professionals(id,firm_id,display_name) values(professional,firm,'Synthetic professional');
 insert into public.billing_entities(id,firm_id,name,legal_name) values(society,firm,'Synthetic society','Synthetic society');
 perform set_config('request.jwt.claim.sub',actor::text,true);execute 'set local role authenticated';
 first_id:=(public.create_work_entry_with_allocation(current_date,profile,null,professional,society,'Synthetic service one',60,null,100)->>'workEntryId')::uuid;
 second_id:=(public.create_work_entry_with_allocation(current_date,profile,null,professional,society,'Synthetic service two',60,null,200)->>'workEntryId')::uuid;
 perform public.record_client_credit_payment(client,society,'EUR',200,current_date,'Synthetic receipt',gen_random_uuid());
 select id into account from public.client_credit_accounts where client_id=client;
 note:=public.save_honorarium_document(client,society,array[first_id,second_id],0,'{}',null,null,true,300,200,request);
 if (note->>'deducted')::numeric<>200 then raise exception 'Initial deduction failed';end if;
 again:=public.save_honorarium_document(client,society,array[first_id,second_id],0,'{}',null,null,true,300,200,request);
 if again->>'id'<>note->>'id' then raise exception 'Idempotency failed';end if;
 select count(*) into ledger_count from public.client_credit_movements where account_id=account;
 again:=public.save_honorarium_document(client,society,array[first_id,second_id],0,'{"recipient":"Revised recipient"}',(note->>'document_id')::uuid,1,true,300,200,gen_random_uuid());
 if (again->>'revision')::integer<>2 or (select count(*) from public.client_credit_movements where account_id=account)<>ledger_count then raise exception 'Reprint duplicated ledger';end if;
 revised:=public.save_honorarium_document(client,society,array[first_id],0,'{}',(note->>'document_id')::uuid,2,true,100,100,gen_random_uuid());
 if (revised->>'balance_after')::numeric<>100 then raise exception 'Removal did not return excess';end if;
 duplicate:=public.save_honorarium_document(client,society,array[first_id],0,'{}',null,null,true,100,100,gen_random_uuid());
 if (select sum(amount) from public.client_credit_movements where account_id=account)<>100 then raise exception 'Repeated work consumed provision twice';end if;
 if exists(select 1 from public.work_entries where client_id=client and (is_invoiced or is_paid)) then raise exception 'Fee document changed invoice/payment status';end if;
 result:=public.void_honorarium_document((note->>'document_id')::uuid,3,gen_random_uuid());
 if not(result->>'voided')::boolean or (select sum(amount) from public.client_credit_movements where account_id=account)<>200 then raise exception 'Void did not restore provision';end if;
 if jsonb_array_length(public.get_client_credit_accounts(client)->0->'noted_work_ids')<>0 then raise exception 'Void did not free work';end if;
 if jsonb_array_length(public.get_client_honorarium_documents(client))<5 then raise exception 'History lost revisions';end if;
 begin
  perform public.save_honorarium_document(client,society,array[second_id],0,'{}',(note->>'document_id')::uuid,1,true,200,200,gen_random_uuid());
  raise exception 'Stale revision accepted';
 exception when raise_exception then if sqlerrm='Stale revision accepted' then raise;end if;end;
 -- Saving without provision also persists a note and does not consume any balance.
 result:=public.save_honorarium_document(client,society,array[second_id],0,'{}',null,null,false,200,0,gen_random_uuid());
 if (result->>'deducted')::numeric<>0 or (select sum(amount) from public.client_credit_movements where account_id=account)<>200 then raise exception 'Document-only save changed provision';end if;
 result:=public.void_honorarium_document((result->>'document_id')::uuid,1,gen_random_uuid());
 if (result->>'balance_after')::numeric<>200 then raise exception 'Document-only void lost actual balance';end if;
 legacy:=public.issue_provision_honorarium_note(account,array[second_id],0,200,200,'{}',gen_random_uuid());
 result:=public.void_honorarium_document((legacy->>'id')::uuid,1,gen_random_uuid());
 if (result->>'balance_after')::numeric<>200 then raise exception 'Legacy note void did not restore balance';end if;
 result:=public.save_honorarium_document(client,society,array[second_id],0,'{}',(legacy->>'id')::uuid,2,true,200,200,gen_random_uuid());
 if (result->>'revision')::integer<>3 or (result->>'balance_after')::numeric<>0 then raise exception 'Legacy note reissue failed';end if;
 execute 'reset role';
 insert into auth.users(id,email) values(outsider,outsider::text||'@example.test');
 perform set_config('request.jwt.claim.sub',outsider::text,true);execute 'set local role authenticated';
 if jsonb_array_length(public.get_client_honorarium_documents(client))<>0 then raise exception 'Outsider read documents';end if;
 begin
  perform public.save_honorarium_document(client,society,array[second_id],0,'{}',null,null,false,200,0,gen_random_uuid());
  raise exception 'Outsider saved document';
 exception when insufficient_privilege then null;end;
 begin
  perform public.void_honorarium_document((result->>'document_id')::uuid,3,gen_random_uuid());
  raise exception 'Outsider voided document';
 exception when insufficient_privilege then null;end;
 execute 'reset role';
end;$audit$;
select 'PASS: issuance, idempotency, revision, no duplicate debit, removal refund, void, work release, history and invoice independence' result;
