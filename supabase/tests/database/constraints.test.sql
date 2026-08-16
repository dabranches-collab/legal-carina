begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

select has_table('public', 'work_entries', 'work_entries exists');
select col_type_is('public', 'work_entries', 'effective_amount', 'numeric', 'money uses numeric');
select col_type_is('public', 'work_entries', 'duration_minutes', 'integer', 'duration uses integer minutes');
select policies_are('public', 'work_entries', array['work_entries_select_scoped'], 'work entries expose only a scoped read policy; writes use controlled endpoints');

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000001', 'owner-a@example.test'),
  ('00000000-0000-0000-0000-000000000002', 'owner-b@example.test'),
  ('00000000-0000-0000-0000-000000000003', 'manager@example.test');

insert into public.law_firms (id, name) values
  ('10000000-0000-0000-0000-000000000001', 'Escritório Sintético A'),
  ('10000000-0000-0000-0000-000000000002', 'Escritório Sintético B');
insert into public.firm_members (firm_id, user_id, role) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'owner'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'owner');
select lives_ok(
  $$insert into public.firm_members (firm_id, user_id, role) values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'manager')$$,
  'manager is a valid application role'
);
insert into public.clients (id, firm_id, client_code, client_type, display_name) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'SYN-A', 'company', 'Cliente Sintético A'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'SYN-B', 'company', 'Cliente Sintético B');
insert into public.client_profiles(id,firm_id,client_id,client_type,client_code) values
  ('25000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','company','SYN-A'),
  ('25000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002','company','SYN-B');
insert into public.professionals (id, firm_id, display_name) values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Profissional Sintético A');

select throws_ok(
  $$insert into public.clients (firm_id, client_code, client_type, display_name) values ('10000000-0000-0000-0000-000000000001', 'BAD', 'other', 'Inválido')$$,
  '23514', null, 'client_type rejects unknown values'
);
select throws_ok(
  $$insert into public.client_contacts (firm_id, client_id, name) values ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'Contacto cruzado')$$,
  '23503', null, 'cross-firm foreign keys are rejected'
);
select throws_ok(
  $$insert into public.work_entries (firm_id, work_date, client_id, client_profile_id, professional_id, activity_description, duration_minutes) values ('10000000-0000-0000-0000-000000000001', current_date, '20000000-0000-0000-0000-000000000001', '25000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Teste', -1)$$,
  '23514', null, 'negative duration is rejected'
);
select throws_ok(
  $$insert into public.work_entries (firm_id, work_date, client_id, client_profile_id, professional_id, activity_description, duration_minutes, is_paid) values ('10000000-0000-0000-0000-000000000001', current_date, '20000000-0000-0000-0000-000000000001', '25000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Teste', 60, true)$$,
  '23514', null, 'paid work must also be invoiced'
);
select throws_ok(
  $$insert into public.invoices (firm_id, billing_entity_id, client_id, invoice_number, invoice_date, subtotal, total) values ('10000000-0000-0000-0000-000000000001', gen_random_uuid(), '20000000-0000-0000-0000-000000000001', 'INV-X', current_date, 100, 99)$$,
  '23503', null, 'invoice requires a valid billing entity'
);
select throws_ok(
  $$insert into public.imports (firm_id, original_filename, file_hash, file_size, total_rows, valid_rows) values ('10000000-0000-0000-0000-000000000001', 'synthetic.xlsx', repeat('a', 64), 100, 1, 2)$$,
  '23514', null, 'import counters cannot exceed total rows'
);

insert into public.work_entries (
  id, firm_id, work_date, client_id, client_profile_id, professional_id, activity_description,
  duration_minutes, calculated_hourly_rate, is_invoiced, invoice_date
) values (
  '40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', current_date,
  '20000000-0000-0000-0000-000000000001', '25000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001',
  'Trabalho sintético facturado', 60, 100, true, current_date
);
select is((select effective_amount from public.work_entries where id = '40000000-0000-0000-0000-000000000001'), 100.00::numeric, 'effective amount is derived on insert');
select throws_ok(
  $$delete from public.work_entries where id = '40000000-0000-0000-0000-000000000001'$$,
  'P0001', 'invoiced work entries cannot be deleted', 'invoiced work cannot be deleted'
);

select * from finish();
rollback;
