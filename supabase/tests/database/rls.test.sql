begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000011', 'admin-a@example.test'),
  ('00000000-0000-0000-0000-000000000012', 'professional-a@example.test'),
  ('00000000-0000-0000-0000-000000000013', 'billing-a@example.test'),
  ('00000000-0000-0000-0000-000000000014', 'viewer-b@example.test');
insert into public.law_firms (id, name) values
  ('10000000-0000-0000-0000-000000000011', 'Escritório RLS A'),
  ('10000000-0000-0000-0000-000000000012', 'Escritório RLS B');
insert into public.firm_members (firm_id, user_id, role) values
  ('10000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000011', 'admin'),
  ('10000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000012', 'professional'),
  ('10000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000013', 'billing'),
  ('10000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000014', 'viewer');
insert into public.clients (id, firm_id, client_code, client_type, display_name) values
  ('20000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000011', 'RLS-A', 'company', 'Cliente RLS A'),
  ('20000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000012', 'RLS-B', 'company', 'Cliente RLS B');
insert into public.client_profiles(id,firm_id,client_id,client_type,client_code) values
  ('25000000-0000-0000-0000-000000000011','10000000-0000-0000-0000-000000000011','20000000-0000-0000-0000-000000000011','company','RLS-A'),
  ('25000000-0000-0000-0000-000000000012','10000000-0000-0000-0000-000000000012','20000000-0000-0000-0000-000000000012','company','RLS-B');
insert into public.access_grants(firm_id,principal_type,user_id,resource_type,permission,created_by) values
  ('10000000-0000-0000-0000-000000000011','user','00000000-0000-0000-0000-000000000012','firm','edit','00000000-0000-0000-0000-000000000011'),
  ('10000000-0000-0000-0000-000000000011','user','00000000-0000-0000-0000-000000000013','firm','billing','00000000-0000-0000-0000-000000000011'),
  ('10000000-0000-0000-0000-000000000012','user','00000000-0000-0000-0000-000000000014','firm','view','00000000-0000-0000-0000-000000000014');
insert into public.professionals (id, firm_id, user_id, display_name) values
  ('30000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000012', 'Profissional RLS A');
insert into public.billing_entities(id,firm_id,name)values
  ('50000000-0000-0000-0000-000000000011','10000000-0000-0000-0000-000000000011','Sociedade RLS A');
insert into public.billing_entity_financial_permissions(firm_id,user_id,billing_entity_id,can_view_financials,created_by)values
  ('10000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000013','50000000-0000-0000-0000-000000000011',true,'00000000-0000-0000-0000-000000000011');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000011', true);
select results_eq('select client_code from public.clients order by client_code', array['RLS-A'::text], 'admin sees only its firm');
select lives_ok(
  $$insert into public.clients (firm_id, client_code, client_type, display_name) values ('10000000-0000-0000-0000-000000000011', 'RLS-A2', 'individual', 'Cliente criado por admin')$$,
  'admin can create a client in its firm'
);
select throws_ok(
  $$insert into public.clients (firm_id, client_code, client_type, display_name) values ('10000000-0000-0000-0000-000000000012', 'ESCAPE', 'individual', 'Tentativa cruzada')$$,
  '42501', null, 'admin cannot insert into another firm'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000012', true);
select lives_ok(
  $$select set_config('test.entry_id',public.create_work_entry(current_date,'25000000-0000-0000-0000-000000000011',null,'30000000-0000-0000-0000-000000000011','50000000-0000-0000-0000-000000000011','Trabalho RLS sintético',60,null)::text,true)$$,
  'professional can create a work entry through the controlled endpoint'
);
select throws_ok(
  $$update public.work_entries set is_invoiced = true, invoice_date = current_date$$,
  '42501', null, 'professional cannot update movements directly'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000013', true);
select lives_ok(
  $$select public.apply_work_entry_override(((public.search_work_entries(1,10,null,null,null,'50000000-0000-0000-0000-000000000011',null,null,null,false,'work_date','desc')->'items'->0->>'id')::uuid),'effective_amount','125'::jsonb,'Ajuste sintético autorizado')$$,
  'billing can apply a recorded override through the controlled endpoint'
);
select lives_ok(
  $$select public.bulk_update_work_entries(array[((public.search_work_entries(1,10,null,null,null,'50000000-0000-0000-0000-000000000011',null,null,null,false,'work_date','desc')->'items'->0->>'id')::uuid)],'archive','"digital"'::jsonb,'Arquivo sintético autorizado')$$,
  'billing can apply an authorised atomic bulk update'
);
set local role postgres;
select is((select effective_amount from public.work_entries where activity_description='Trabalho RLS sintético'), 125.00::numeric, 'override value was applied');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000014', true);
select results_eq('select client_code from public.clients order by client_code', array['RLS-B'::text], 'viewer sees only its firm');
select throws_ok(
  $$select public.bulk_update_work_entries(array[current_setting('test.entry_id')::uuid],'archive','"findos"'::jsonb,'Tentativa cruzada')$$,
  '42501',null,'viewer cannot update a movement outside its scope by UUID'
);

select * from finish();
rollback;
