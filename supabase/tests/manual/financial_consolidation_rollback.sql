begin;

insert into auth.users(id,email) values
 ('00000000-0000-0000-0000-000000000151','tcodexadministrador-financial@example.test'),
 ('00000000-0000-0000-0000-000000000152','tcodexoperador-financial@example.test');
insert into public.law_firms(id,name) values('10000000-0000-0000-0000-000000000151','QA financial rollback');
insert into public.firm_members(firm_id,user_id,role) values
 ('10000000-0000-0000-0000-000000000151','00000000-0000-0000-0000-000000000151','admin'),
 ('10000000-0000-0000-0000-000000000151','00000000-0000-0000-0000-000000000152','operator');
insert into public.clients(id,firm_id,client_code,client_type,display_name) values
 ('20000000-0000-0000-0000-000000000151','10000000-0000-0000-0000-000000000151','01.99151','company','tcodexadministrador cliente multi-sociedade'),
 ('20000000-0000-0000-0000-000000000152','10000000-0000-0000-0000-000000000151','02.99152','individual','tcodexadministrador cliente particular');
insert into public.client_profiles(id,firm_id,client_id,client_type,client_code) values
 ('25000000-0000-0000-0000-000000000151','10000000-0000-0000-0000-000000000151','20000000-0000-0000-0000-000000000151','company','01.99151'),
 ('25000000-0000-0000-0000-000000000152','10000000-0000-0000-0000-000000000151','20000000-0000-0000-0000-000000000152','individual','02.99152');
insert into public.professionals(id,firm_id,display_name) values
 ('30000000-0000-0000-0000-000000000151','10000000-0000-0000-0000-000000000151','tcodexadministrador responsável A'),
 ('30000000-0000-0000-0000-000000000152','10000000-0000-0000-0000-000000000151','tcodexoperador responsável B');
insert into public.billing_entities(id,firm_id,name) values
 ('50000000-0000-0000-0000-000000000151','10000000-0000-0000-0000-000000000151','QA Sociedade A'),
 ('50000000-0000-0000-0000-000000000152','10000000-0000-0000-0000-000000000151','QA Sociedade B');
insert into public.billing_entity_financial_permissions(firm_id,user_id,billing_entity_id,can_view_financials,created_by) values
 ('10000000-0000-0000-0000-000000000151','00000000-0000-0000-0000-000000000152','50000000-0000-0000-0000-000000000151',true,'00000000-0000-0000-0000-000000000151'),
 ('10000000-0000-0000-0000-000000000151','00000000-0000-0000-0000-000000000152','50000000-0000-0000-0000-000000000152',true,'00000000-0000-0000-0000-000000000151');

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000151',true);
select set_config('request.jwt.claim.role','authenticated',true);
insert into public.work_entries(id,firm_id,work_date,created_at,client_id,client_profile_id,professional_id,billing_entity_id,activity_description,duration_minutes,effective_hourly_rate,effective_amount,calculated_hourly_rate,calculated_amount,charge_type,currency,status,is_billable,is_invoiced,invoice_date,is_paid,source_type,created_by) values
 ('40000000-0000-0000-0000-000000000151','10000000-0000-0000-0000-000000000151','2026-08-21','2026-08-21 08:00Z','20000000-0000-0000-0000-000000000151','25000000-0000-0000-0000-000000000151','30000000-0000-0000-0000-000000000151','50000000-0000-0000-0000-000000000151','tcodexadministrador não facturado',60,100,100,100,100,'hourly','EUR','draft',true,false,null,false,'manual','00000000-0000-0000-0000-000000000151'),
 ('40000000-0000-0000-0000-000000000152','10000000-0000-0000-0000-000000000151','2026-08-21','2026-08-21 09:00Z','20000000-0000-0000-0000-000000000151','25000000-0000-0000-0000-000000000151','30000000-0000-0000-0000-000000000151','50000000-0000-0000-0000-000000000151','tcodexadministrador facturado pendente',60,200,200,200,200,'hourly','EUR','invoiced',true,true,'2026-08-21',false,'manual','00000000-0000-0000-0000-000000000151'),
 ('40000000-0000-0000-0000-000000000153','10000000-0000-0000-0000-000000000151','2026-08-21','2026-08-21 10:00Z','20000000-0000-0000-0000-000000000151','25000000-0000-0000-0000-000000000151','30000000-0000-0000-0000-000000000152','50000000-0000-0000-0000-000000000152','tcodexadministrador pago segunda sociedade',60,300,300,300,300,'hourly','EUR','paid',true,true,'2026-08-21',true,'manual','00000000-0000-0000-0000-000000000151'),
 ('40000000-0000-0000-0000-000000000154','10000000-0000-0000-0000-000000000151','2026-08-20','2026-08-20 08:00Z','20000000-0000-0000-0000-000000000152','25000000-0000-0000-0000-000000000152','30000000-0000-0000-0000-000000000152','50000000-0000-0000-0000-000000000151','tcodexadministrador incobrável não facturado',60,400,400,400,400,'hourly','EUR','uncollectible_uninvoiced',true,false,null,false,'manual','00000000-0000-0000-0000-000000000151'),
 ('40000000-0000-0000-0000-000000000155','10000000-0000-0000-0000-000000000151','2026-08-20','2026-08-20 09:00Z','20000000-0000-0000-0000-000000000152','25000000-0000-0000-0000-000000000152','30000000-0000-0000-0000-000000000151','50000000-0000-0000-0000-000000000152','tcodexadministrador incobrável facturado',60,500,500,500,500,'hourly','EUR','uncollectible_invoiced',true,true,'2026-08-20',false,'manual','00000000-0000-0000-0000-000000000151'),
 ('40000000-0000-0000-0000-000000000156','10000000-0000-0000-0000-000000000151','2026-08-19','2026-08-19 08:00Z','20000000-0000-0000-0000-000000000151','25000000-0000-0000-0000-000000000151','30000000-0000-0000-0000-000000000152',null,'tcodexadministrador sem sociedade',60,50,50,50,50,'hourly','EUR','draft',true,false,null,false,'manual','00000000-0000-0000-0000-000000000151');

do $qa$
declare overview jsonb; company jsonb; client jsonb; society_a jsonb; professional_b jsonb; result jsonb;
begin
 overview:=public.get_dashboard_overview();
 if (overview#>>'{metrics,worked}')::numeric<>1550 or (overview#>>'{metrics,invoiced}')::numeric<>1000 or (overview#>>'{metrics,paid}')::numeric<>300 or (overview#>>'{metrics,receivable}')::numeric<>200 then raise exception 'FAIL overview financial totals: %',overview->'metrics'; end if;
 if (overview#>>'{metrics,uninvoicedCount}')::int<>2 or (overview#>>'{metrics,unpaidCount}')::int<>1 or (overview#>>'{metrics,uncollectibleCount}')::int<>2 or (overview#>>'{metrics,uncollectibleValue}')::numeric<>900 or (overview#>>'{metrics,missingBilling}')::int<>1 then raise exception 'FAIL overview state counts: %',overview->'metrics'; end if;
 company:=public.get_client_category_dashboard('company');
 if (company#>>'{metrics,total}')::numeric<>650 or (company#>>'{metrics,pending}')::numeric<>200 or (company#>>'{metrics,billingEntities}')::int<>2 or (company#>>'{metrics,movements}')::int<>4 then raise exception 'FAIL company consolidation: %',company->'metrics'; end if;
 client:=public.get_entity_dashboard_rolling('client','20000000-0000-0000-0000-000000000151');
 if (client#>>'{metrics,total}')::numeric<>650 or (client#>>'{metrics,pending}')::numeric<>200 or (client#>>'{metrics,billingEntities}')::int<>2 then raise exception 'FAIL client multi-society consolidation: %',client->'metrics'; end if;
 society_a:=public.get_entity_dashboard_rolling('billing','50000000-0000-0000-0000-000000000151');
 if (society_a#>>'{metrics,total}')::numeric<>700 or (society_a#>>'{metrics,pending}')::numeric<>200 or (society_a#>>'{metrics,clients}')::int<>2 then raise exception 'FAIL society consolidation: %',society_a->'metrics'; end if;
 professional_b:=public.get_entity_dashboard_rolling('professional','30000000-0000-0000-0000-000000000152');
 if (professional_b#>>'{metrics,total}')::numeric<>750 or (professional_b#>>'{metrics,paid}')::numeric<>300 or (professional_b#>>'{metrics,uncollectibleCount}')::int<>1 then raise exception 'FAIL professional consolidation: %',professional_b->'metrics'; end if;
 result:=public.get_attention_work_entries('uninvoiced',null,null,null,null,null,false,null,null,false);if (result->>'total')::int<>2 then raise exception 'FAIL uninvoiced drilldown: %',result->>'total'; end if;
 result:=public.get_attention_work_entries('unpaid',null,null,null,null,null,false,null,null,false);if (result->>'total')::int<>1 then raise exception 'FAIL unpaid drilldown: %',result->>'total'; end if;
 result:=public.get_uncollectible_work_entries(null,null,null,null,null,false,null,null,false);if (result->>'total')::int<>2 then raise exception 'FAIL uncollectible drilldown: %',result->>'total'; end if;
 result:=public.search_work_entries(1,100,null,null,null,null,false,null,null,false,false,null,null,false,'work_date','desc');if (result->>'total')::int<>3 then raise exception 'FAIL raw uninvoiced search: %',result->>'total'; end if;
 result:=public.search_work_entries(1,100,null,null,null,null,null,true,null,false,false,null,null,false,'work_date','desc');if (result->>'total')::int<>1 then raise exception 'FAIL paid search: %',result->>'total'; end if;
 begin
  perform public.update_work_entry_inline_audited('40000000-0000-0000-0000-000000000151','is_paid','true','');
  raise exception 'FAIL payment without invoice accepted';
 exception when others then if sqlerrm='FAIL payment without invoice accepted' then raise; end if; end;
 begin
  perform public.update_work_entry_inline_audited('40000000-0000-0000-0000-000000000156','collection_status','uncollectible_invoiced','');
  raise exception 'FAIL invoiced uncollectible without invoice date accepted';
 exception when others then if sqlerrm='FAIL invoiced uncollectible without invoice date accepted' then raise; end if; end;
 perform public.update_work_entry_inline_audited('40000000-0000-0000-0000-000000000151','invoice_date','2026-08-21','');
 perform public.update_work_entry_inline_audited('40000000-0000-0000-0000-000000000151','is_paid','true','');
 if not exists(select 1 from public.work_entries where id='40000000-0000-0000-0000-000000000151' and status='paid' and is_invoiced and is_paid and invoice_date='2026-08-21') then raise exception 'FAIL valid invoice/payment chain'; end if;
 perform public.update_work_entry_inline_audited('40000000-0000-0000-0000-000000000151','invoice_date','','');
 if not exists(select 1 from public.work_entries where id='40000000-0000-0000-0000-000000000151' and status='approved' and not is_invoiced and not is_paid and invoice_date is null) then raise exception 'FAIL invoice removal dependent state reset'; end if;
 if (select count(*) from public.manual_overrides where work_entry_id='40000000-0000-0000-0000-000000000151')<3 then raise exception 'FAIL financial transition audit trail'; end if;
 raise notice 'PASS: 30 financial state, transition, drilldown and consolidation invariants';
end $qa$;

rollback;
