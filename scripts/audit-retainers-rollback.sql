begin;
-- Run only with the user's explicit authorisation for tests in the original DB.
-- Prepend BEGIN and the candidate migration; append ROLLBACK. Never persist fixtures.
create temp table allocation_test_context as select gen_random_uuid() actor,gen_random_uuid() outsider,gen_random_uuid() firm,gen_random_uuid() society,gen_random_uuid() client,gen_random_uuid() profile,gen_random_uuid() professional;
grant select on allocation_test_context to authenticated,anon;
insert into auth.users(id) select actor from allocation_test_context union all select outsider from allocation_test_context;
select set_config('request.jwt.claim.sub',(select actor::text from allocation_test_context),true);
insert into law_firms(id,name) select firm,'Ensaio transaccional sintético' from allocation_test_context;
insert into firm_members(firm_id,user_id,role) select firm,actor,'owner' from allocation_test_context;
insert into billing_entities(id,firm_id,name) select society,firm,'LEGALTEAM' from allocation_test_context;
insert into clients(id,firm_id,client_code,client_type,display_name) select client,firm,'QA-ALLOCATION','individual','Cliente sintético de ensaio transaccional' from allocation_test_context;
insert into client_profiles(id,firm_id,client_id,client_code,client_type) select profile,firm,client,'QA-ALLOCATION','individual' from allocation_test_context;
insert into professionals(id,firm_id,display_name) select professional,firm,'Responsável sintético' from allocation_test_context;
set local role authenticated;

do $audit$
declare c record;retainer uuid;entry uuid;charge uuid;r jsonb;
begin
 select * into c from allocation_test_context;
 insert into client_retainers(firm_id,client_id,billing_entity_id,monthly_amount,starts_on,ends_on,included_hours)
 values(c.firm,c.client,c.society,500,'2026-01-01','2026-12-31',10) returning id into retainer;
 begin
  insert into client_retainers(firm_id,client_id,billing_entity_id,monthly_amount,starts_on) values(c.firm,c.client,c.society,500,'2026-06-01');
  raise exception 'FAIL overlap allowed';
 exception when others then if sqlerrm not like '%condições de avença%' then raise;end if;end;
 r:=create_work_entry_with_allocation('2026-01-01',c.profile,null,c.professional,c.society,'Ensaio de horas cobertas',120,p_hourly_rate=>100,p_billing_scope=>'retainer',p_billing_state=>'retainer',p_task_referrer=>'carina');
 entry:=(r->>'workEntryId')::uuid;
 if not exists(select 1 from work_entries where id=entry and billing_scope='retainer' and not is_billable and effective_amount is null and duration_minutes=120)then raise exception 'FAIL retainer hours billed';end if;
 begin
  perform create_work_entry_with_allocation('2027-01-01',c.profile,null,c.professional,c.society,'Fora do contrato',60,p_billing_scope=>'retainer',p_billing_state=>'retainer',p_task_referrer=>'carina');
  raise exception 'FAIL work outside retainer accepted';
 exception when others then if sqlerrm not like '%active retainer%' then raise;end if;end;
 insert into retainer_charges(firm_id,retainer_id,client_id,billing_entity_id,period_start,amount)
 values(c.firm,retainer,c.client,c.society,'2026-01-01',500) returning id into charge;
 begin
  insert into retainer_charges(firm_id,retainer_id,client_id,billing_entity_id,period_start,amount)
  values(c.firm,retainer,c.client,c.society,'2026-01-01',500);
  raise exception 'FAIL duplicate charge';
 exception when unique_violation then null;end;
 r:=get_client_retainer_summary(c.client);
 if (r->>'minutes')::int<>120 or (r->>'pendingPeriods')::int<>1 or (r->>'chargesTotal')::numeric<>500 then raise exception 'FAIL pending summary';end if;
 begin
  update retainer_charges set status='paid' where id=charge;raise exception 'FAIL invalid paid state';
 exception when check_violation then null;end;
 update retainer_charges set status='invoiced',invoice_date='2026-01-31' where id=charge;
 r:=get_client_retainer_summary(c.client);
 if (r->>'unpaidPeriods')::int<>1 or (r->>'invoiced')::numeric<>500 or (r->>'effectiveHourlyRate')::numeric<>250 then raise exception 'FAIL invoice summary';end if;
 update retainer_charges set status='paid',paid_on='2026-02-01' where id=charge;
 if (get_client_retainer_summary(c.client)->>'paid')::numeric<>500 then raise exception 'FAIL paid summary';end if;
 update retainer_charges set status='uncollectible',paid_on=null where id=charge;
 if (get_client_retainer_summary(c.client)->>'paid')::numeric<>0 then raise exception 'FAIL uncollectible summary';end if;
 perform set_work_entry_billing_scope(entry,'standard','Ensaio de reclassificação');
 if not exists(select 1 from work_entries where id=entry and billing_scope='standard' and is_billable) then raise exception 'FAIL standard reclassification';end if;
end $audit$;
reset role;
select 'PASS: retainer periods, boundaries, hours, charges, invoice/payment, uncollectible and reclassification' audit;
rollback;
