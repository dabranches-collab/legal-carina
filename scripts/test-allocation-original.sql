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
do $$declare c record;r jsonb;entry_id uuid;begin
 select * into c from allocation_test_context;
 r:=public.create_work_entry_with_allocation('2024-01-01',c.profile,null,c.professional,c.society,'Ensaio sintético com angariador',60,p_hourly_rate=>100,p_task_referrer=>'carina');
 entry_id:=(r->>'workEntryId')::uuid;
 if (select task_referrer from work_entries where id=entry_id) is distinct from 'carina' then raise exception 'Referral not saved';end if;
 if (select effective_amount from work_entries where id=entry_id) is distinct from 100::numeric then raise exception 'Existing price trigger failed';end if;
 begin
  perform public.create_work_entry_with_allocation('2024-01-02',c.profile,null,c.professional,c.society,'Invalid referral',60,p_hourly_rate=>100);
  raise exception 'Missing referral was accepted';
 exception when others then if sqlerrm not like '%angariador%' then raise;end if;end;
 begin
  perform public.create_work_entry_with_allocation('2024-01-02',c.profile,null,c.professional,c.society,'Invalid other name',60,p_hourly_rate=>100,p_task_referrer=>'other',p_task_referrer_other=>'');
  raise exception 'Empty other name was accepted';
 exception when check_violation then null;end;
 if (select count(*) from work_entries where firm_id=c.firm)<>1 then raise exception 'Invalid creation was not rolled back atomically';end if;
 perform public.update_work_entry_with_allocation(entry_id,(select to_jsonb(w)||jsonb_build_object('task_referrer','hugo') from work_entries w where w.id=entry_id),'Ensaio sintético');
 if (select task_referrer from work_entries where id=entry_id) is distinct from 'hugo' then raise exception 'Referral edit failed';end if;
 -- Published UI continues to create through its old RPC, without new fields.
 perform public.create_work_entry_with_treatment('2027-12-31',c.profile,null,c.professional,c.society,'Legacy UI compatibility',60,p_hourly_rate=>100);
 r:=public.get_legalteam_allocation_work(c.society,null,null,0,500);
 if (r->>'total')::int<>2 or r->'items'->0->>'client_id'<>c.client::text then raise exception 'Full-period report or client identity failed';end if;
 r:=public.get_legalteam_allocation_work(c.society,'2024-01-01','2024-01-01',0,1);
 if (r->>'total')::int<>1 then raise exception 'Inclusive date filtering failed';end if;
 r:=public.get_legalteam_allocation_work(c.society,null,null,1,1);
 if jsonb_array_length(r->'items')<>1 or r->'items'->0->>'work_date'<>'2027-12-31' then raise exception 'Pagination failed';end if;
end$$;
select set_config('request.jwt.claim.sub',(select outsider::text from allocation_test_context),true);
do $$begin
 begin perform public.get_legalteam_allocation_work((select society from allocation_test_context),null,null,0,500);raise exception 'Cross-firm access accepted';exception when insufficient_privilege then null;end;
end$$;
reset role;
set local role anon;
do $$begin
 begin perform public.get_legalteam_allocation_work((select society from allocation_test_context),null,null,0,500);raise exception 'Anonymous access accepted';exception when insufficient_privilege then null;end;
end$$;
reset role;
select jsonb_build_object('candidate_schema','valid','real_pricing_trigger','passed','create_and_edit_referrals','passed','invalid_input_rollback','passed','published_ui_compatibility','passed','complete_period_and_pagination','passed','cross_firm_and_anonymous_denial','passed','fixture_policy','ROLLBACK REQUIRED') allocation_validation;
