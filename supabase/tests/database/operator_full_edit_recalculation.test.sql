begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

insert into auth.users(id,email) values
  ('00000000-0000-0000-0000-000000000121','operator-recalculation@example.test');
insert into public.law_firms(id,name) values
  ('10000000-0000-0000-0000-000000000121','Escritório sintético do Operador');
insert into public.firm_members(firm_id,user_id,role) values
  ('10000000-0000-0000-0000-000000000121','00000000-0000-0000-0000-000000000121','operator');
insert into public.clients(id,firm_id,client_code,client_type,display_name) values
  ('20000000-0000-0000-0000-000000000121','10000000-0000-0000-0000-000000000121','QA-OP-1','company','Cliente sintético do Operador');
insert into public.client_profiles(id,firm_id,client_id,client_type,client_code) values
  ('25000000-0000-0000-0000-000000000121','10000000-0000-0000-0000-000000000121','20000000-0000-0000-0000-000000000121','company','QA-OP-1');
insert into public.professionals(id,firm_id,display_name) values
  ('30000000-0000-0000-0000-000000000121','10000000-0000-0000-0000-000000000121','Responsável sintético');
insert into public.billing_entities(id,firm_id,name,legal_name) values
  ('50000000-0000-0000-0000-000000000121','10000000-0000-0000-0000-000000000121','Sociedade A','Sociedade A'),
  ('50000000-0000-0000-0000-000000000122','10000000-0000-0000-0000-000000000121','Sociedade B','Sociedade B');
insert into public.billing_entity_financial_permissions(firm_id,user_id,billing_entity_id,can_view_financials,created_by) values
  ('10000000-0000-0000-0000-000000000121','00000000-0000-0000-0000-000000000121','50000000-0000-0000-0000-000000000121',true,'00000000-0000-0000-0000-000000000121'),
  ('10000000-0000-0000-0000-000000000121','00000000-0000-0000-0000-000000000121','50000000-0000-0000-0000-000000000122',true,'00000000-0000-0000-0000-000000000121');
insert into public.rate_rules(id,firm_id,name,billing_entity_id,hourly_rate,currency,valid_from,priority,charge_type) values
  ('80000000-0000-0000-0000-000000000121','10000000-0000-0000-0000-000000000121','Regra A','50000000-0000-0000-0000-000000000121',100,'EUR','2026-01-01',1000,'hourly'),
  ('80000000-0000-0000-0000-000000000122','10000000-0000-0000-0000-000000000121','Regra B','50000000-0000-0000-0000-000000000122',200,'EUR','2026-01-01',1000,'hourly');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000121',true);
select set_config('request.jwt.claim.role','authenticated',true);
insert into public.work_entries(
  id,firm_id,work_date,client_id,client_profile_id,professional_id,billing_entity_id,
  activity_description,duration_minutes,effective_hourly_rate,effective_amount,
  calculated_hourly_rate,calculated_amount,charge_type,currency,status,is_billable,
  source_type,created_by
) values(
  '40000000-0000-0000-0000-000000000121','10000000-0000-0000-0000-000000000121','2026-08-21',
  '20000000-0000-0000-0000-000000000121','25000000-0000-0000-0000-000000000121',
  '30000000-0000-0000-0000-000000000121','50000000-0000-0000-0000-000000000121',
  'tcodexoperador — movimento sintético',30,100,50,100,50,'hourly','EUR','draft',true,'manual',
  '00000000-0000-0000-0000-000000000121'
);

select ok(
  (select p.prosecdef from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.proname='update_work_entry_full'
     and pg_get_function_identity_arguments(p.oid)='p_work_entry_id uuid, p_values jsonb, p_reason text'),
  'a edição completa é independente da política RLS de leitura'
);
select ok(
  not private.has_scope_permission(
    '10000000-0000-0000-0000-000000000121','50000000-0000-0000-0000-000000000121',
    '20000000-0000-0000-0000-000000000121',null,'view'
  ) and private.has_scope_access(
    '10000000-0000-0000-0000-000000000121','50000000-0000-0000-0000-000000000121',
    '20000000-0000-0000-0000-000000000121',null,'edit'
  ),
  'o cenário cobre uma linha visível no universo operacional mas não na política histórica'
);

set local role authenticated;
select throws_ok(
  $$select public.update_work_entry_full(
    '40000000-0000-0000-0000-000000000121',
    '{"work_date":"2026-08-21","client_profile_id":"25000000-0000-0000-0000-000000000121","matter_id":null,"professional_id":"30000000-0000-0000-0000-000000000121","billing_entity_id":"50000000-0000-0000-0000-000000000121","activity_description":"tcodexoperador — movimento sintético","observations":"tcodexoperador","duration_minutes":60,"effective_hourly_rate":100,"effective_amount":50,"currency":"EUR","status":"draft","is_billable":true,"is_invoiced":false,"invoice_date":null,"is_paid":false,"archive_status":null,"charge_type":"hourly","effective_discount_amount":null,"discount_percentage":null,"discount_reason":null}'::jsonb,
    null
  )$$,
  'P0001','override reason required','o Operador tem de justificar a edição completa'
);
select lives_ok(
  $$select public.update_work_entry_full(
    '40000000-0000-0000-0000-000000000121',
    '{"work_date":"2026-08-21","client_profile_id":"25000000-0000-0000-0000-000000000121","matter_id":null,"professional_id":"30000000-0000-0000-0000-000000000121","billing_entity_id":"50000000-0000-0000-0000-000000000121","activity_description":"tcodexoperador — movimento sintético","observations":"tcodexoperador","duration_minutes":60,"effective_hourly_rate":100,"effective_amount":50,"currency":"EUR","status":"draft","is_billable":true,"is_invoiced":false,"invoice_date":null,"is_paid":false,"archive_status":null,"charge_type":"hourly","effective_discount_amount":null,"discount_percentage":null,"discount_reason":null}'::jsonb,
    'tcodexoperador: corrigir duração'
  )$$,
  'o motivo permite editar uma linha fora da política histórica'
);
reset role;

select is((select duration_minutes from public.work_entries where id='40000000-0000-0000-0000-000000000121'),60,'a duração é actualizada');
select is((select effective_hourly_rate from public.work_entries where id='40000000-0000-0000-0000-000000000121'),100.00::numeric,'o valor/hora é preservado');
select is((select effective_amount from public.work_entries where id='40000000-0000-0000-0000-000000000121'),100.00::numeric,'a duração recalcula o total');

set local role authenticated;
select lives_ok(
  $$select public.update_work_entry_full(
    '40000000-0000-0000-0000-000000000121',
    '{"work_date":"2026-08-21","client_profile_id":"25000000-0000-0000-0000-000000000121","matter_id":null,"professional_id":"30000000-0000-0000-0000-000000000121","billing_entity_id":"50000000-0000-0000-0000-000000000122","activity_description":"tcodexoperador — movimento sintético","observations":"tcodexoperador","duration_minutes":60,"effective_hourly_rate":100,"effective_amount":100,"currency":"EUR","status":"draft","is_billable":true,"is_invoiced":false,"invoice_date":null,"is_paid":false,"archive_status":null,"charge_type":"hourly","effective_discount_amount":null,"discount_percentage":null,"discount_reason":null}'::jsonb,
    'tcodexoperador: mudar Sociedade'
  )$$,
  'o Operador pode mudar a Sociedade depois de justificar'
);
reset role;

select is((select billing_entity_id from public.work_entries where id='40000000-0000-0000-0000-000000000121'),'50000000-0000-0000-0000-000000000122'::uuid,'a Sociedade é actualizada');
select is((select effective_hourly_rate from public.work_entries where id='40000000-0000-0000-0000-000000000121'),200.00::numeric,'a nova Sociedade reaplica a sua regra');
select is((select effective_amount from public.work_entries where id='40000000-0000-0000-0000-000000000121'),200.00::numeric,'a mudança de Sociedade recalcula o total');

select * from finish();
rollback;
