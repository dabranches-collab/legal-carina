begin;
create extension if not exists pgtap with schema extensions;
select plan(32);

insert into auth.users(id,email) values('00000000-0000-0000-0000-0000000000f1','fixed-fee-owner@example.test');
insert into public.law_firms(id,name) values('10000000-0000-0000-0000-0000000000f1','Escritório sintético preço fixo');
insert into public.firm_members(firm_id,user_id,role) values('10000000-0000-0000-0000-0000000000f1','00000000-0000-0000-0000-0000000000f1','owner');
insert into public.clients(id,firm_id,client_code,client_type,display_name) values('20000000-0000-0000-0000-0000000000f1','10000000-0000-0000-0000-0000000000f1','FIX-1','company','Cliente sintético preço fixo');
insert into public.client_profiles(id,firm_id,client_id,client_type,client_code) values('25000000-0000-0000-0000-0000000000f1','10000000-0000-0000-0000-0000000000f1','20000000-0000-0000-0000-0000000000f1','company','FIX-1');
insert into public.professionals(id,firm_id,display_name) values('30000000-0000-0000-0000-0000000000f1','10000000-0000-0000-0000-0000000000f1','Profissional sintético');
insert into public.billing_entities(id,firm_id,name,legal_name,default_vat_rate) values('50000000-0000-0000-0000-0000000000f1','10000000-0000-0000-0000-0000000000f1','Sociedade sintética','Sociedade sintética',23);

select has_table('public','fixed_fee_jobs','Os trabalhos a preço fixo têm tabela própria');
select has_column('public','fixed_fee_jobs','vat_rate','A taxa de IVA fica guardada no trabalho');

insert into public.fixed_fee_jobs(id,firm_id,client_id,billing_entity_id,title,agreed_amount,created_by)
values('60000000-0000-0000-0000-0000000000f1','10000000-0000-0000-0000-0000000000f1','20000000-0000-0000-0000-0000000000f1','50000000-0000-0000-0000-0000000000f1','Peça sintética',1200,'00000000-0000-0000-0000-0000000000f1');
select is((select status from public.fixed_fee_jobs where id='60000000-0000-0000-0000-0000000000f1'),'not_started','Começa por iniciar');
select is((select vat_rate from public.fixed_fee_jobs where id='60000000-0000-0000-0000-0000000000f1'),23.00::numeric,'Fixa a taxa da sociedade na criação');
select throws_ok($$update public.fixed_fee_jobs set status='completed' where id='60000000-0000-0000-0000-0000000000f1'$$,'P0001',null,'Não se termina antes do primeiro registo');

update public.billing_entities set default_vat_rate=25 where id='50000000-0000-0000-0000-0000000000f1';
update public.fixed_fee_jobs set title='Peça sintética revista' where id='60000000-0000-0000-0000-0000000000f1';
select is((select vat_rate from public.fixed_fee_jobs where id='60000000-0000-0000-0000-0000000000f1'),23.00::numeric,'Mudança futura da taxa predefinida não altera o trabalho');

insert into public.work_entries(id,firm_id,client_id,client_profile_id,professional_id,billing_entity_id,work_date,activity_description,duration_minutes,billing_scope,fixed_fee_job_id,source_type,created_by)
values('40000000-0000-0000-0000-0000000000f1','10000000-0000-0000-0000-0000000000f1','20000000-0000-0000-0000-0000000000f1','25000000-0000-0000-0000-0000000000f1','30000000-0000-0000-0000-0000000000f1','50000000-0000-0000-0000-0000000000f1',current_date,'Registo sintético',60,'fixed_fee','60000000-0000-0000-0000-0000000000f1','manual','00000000-0000-0000-0000-0000000000f1');
select is((select status from public.fixed_fee_jobs where id='60000000-0000-0000-0000-0000000000f1'),'open','O primeiro registo inicia automaticamente o trabalho');
select is((select effective_amount from public.work_entries where id='40000000-0000-0000-0000-0000000000f1'),null::numeric,'O registo associado não conserva preço individual');
update public.fixed_fee_jobs set status='completed' where id='60000000-0000-0000-0000-0000000000f1';
select is((select status from public.fixed_fee_jobs where id='60000000-0000-0000-0000-0000000000f1'),'completed','O operador pode terminar o trabalho iniciado');

insert into public.fixed_fee_jobs(id,firm_id,client_id,title,agreed_amount,created_by)
values('60000000-0000-0000-0000-0000000000f2','10000000-0000-0000-0000-0000000000f1','20000000-0000-0000-0000-0000000000f1','Por atribuir',100,'00000000-0000-0000-0000-0000000000f1');
select throws_ok($$update public.fixed_fee_jobs set is_invoiced=true,invoice_date=current_date where id='60000000-0000-0000-0000-0000000000f2'$$,'23514',null,'Facturação exige sociedade');
update public.fixed_fee_jobs set billing_entity_id='50000000-0000-0000-0000-0000000000f1' where id='60000000-0000-0000-0000-0000000000f2';
select is((select vat_rate from public.fixed_fee_jobs where id='60000000-0000-0000-0000-0000000000f2'),25.00::numeric,'Ao atribuir sociedade mais tarde, fixa a taxa actual');

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000f1',true);
select is((select total_with_vat from public.get_fixed_fee_credit_candidates('20000000-0000-0000-0000-0000000000f1','50000000-0000-0000-0000-0000000000f1') where job_id='60000000-0000-0000-0000-0000000000f2'),125.00::numeric,'Trabalho candidato mostra o preço com IVA');
do $$begin
 perform public.record_client_credit_payment_with_fixed_fees('20000000-0000-0000-0000-0000000000f1','50000000-0000-0000-0000-0000000000f1','EUR',123.00,current_date,'Provisão sintética','70000000-0000-0000-0000-0000000000f1','[]'::jsonb);
 perform public.apply_client_credit_to_fixed_fees((select id from public.client_credit_accounts where client_id='20000000-0000-0000-0000-0000000000f1'),'[{"job_id":"60000000-0000-0000-0000-0000000000f2","amount":61.50}]'::jsonb,'70000000-0000-0000-0000-0000000000f2');
end$$;
select is((select gross_applied from public.get_fixed_fee_provision_totals() where job_id='60000000-0000-0000-0000-0000000000f2'),61.50::numeric,'O abatimento aparece no trabalho');
select is((select (value->>'received')::numeric from jsonb_array_elements(public.get_client_credit_accounts('20000000-0000-0000-0000-0000000000f1'))),123.00::numeric,'Abatimento não cria uma segunda provisão recebida');
select is((select (value->>'consumed')::numeric from jsonb_array_elements(public.get_client_credit_accounts('20000000-0000-0000-0000-0000000000f1'))),61.50::numeric,'Abatimento conta como provisão utilizada');
select is((select (value->>'balance')::numeric from jsonb_array_elements(public.get_client_credit_accounts('20000000-0000-0000-0000-0000000000f1'))),61.50::numeric,'Saldo desconta o trabalho');
select has_column('public','honorarium_document_versions','fixed_fee_job_id','A nota identifica o trabalho a preço fixo');
do $$begin
 perform public.issue_fixed_fee_honorarium_note('60000000-0000-0000-0000-0000000000f2','{"language":"pt","fixed_fee_paid":false}'::jsonb,125.00,61.50,null,'70000000-0000-0000-0000-0000000000f5');
end$$;
select is((select total from public.honorarium_document_versions where fixed_fee_job_id='60000000-0000-0000-0000-0000000000f2'),125.00::numeric,'A nota inclui o preço fixo com IVA uma vez');
select is((select deducted from public.honorarium_document_versions where fixed_fee_job_id='60000000-0000-0000-0000-0000000000f2'),61.50::numeric,'A nota apresenta a provisão já aplicada');
select is((select remaining from public.honorarium_document_versions where fixed_fee_job_id='60000000-0000-0000-0000-0000000000f2'),63.50::numeric,'A nota apresenta o remanescente correcto');
select is((select items->0->>'kind' from public.honorarium_document_versions where fixed_fee_job_id='60000000-0000-0000-0000-0000000000f2'),'fixed_fee_job','O trabalho é um item próprio do documento');
do $$begin
 perform public.issue_fixed_fee_honorarium_note('60000000-0000-0000-0000-0000000000f2','{"language":"pt","fixed_fee_paid":false}'::jsonb,125.00,61.50,null,'70000000-0000-0000-0000-0000000000f5');
end$$;
select is((select count(*) from public.honorarium_document_versions where fixed_fee_job_id='60000000-0000-0000-0000-0000000000f2'),1::bigint,'Repetir o mesmo pedido não emite segunda nota');
do $$begin
 perform public.issue_fixed_fee_honorarium_note('60000000-0000-0000-0000-0000000000f2','{"language":"pt","fixed_fee_paid":false}'::jsonb,125.00,61.50,1,'70000000-0000-0000-0000-0000000000f6');
end$$;
select is((select count(*) from public.honorarium_document_versions where fixed_fee_job_id='60000000-0000-0000-0000-0000000000f2'),2::bigint,'A reemissão cria uma revisão da mesma nota');
do $$begin
 perform public.void_honorarium_document((select document_id from public.honorarium_document_versions where fixed_fee_job_id='60000000-0000-0000-0000-0000000000f2' order by revision desc limit 1),2,'70000000-0000-0000-0000-0000000000f7');
end$$;
select ok((select voided and fixed_fee_job_id='60000000-0000-0000-0000-0000000000f2' from public.honorarium_document_versions where fixed_fee_job_id='60000000-0000-0000-0000-0000000000f2' order by revision desc limit 1),'A anulação conserva a ligação ao trabalho');
select is((select (value->>'balance')::numeric from jsonb_array_elements(public.get_client_credit_accounts('20000000-0000-0000-0000-0000000000f1'))),61.50::numeric,'Anular a nota não consome nem estorna de novo a provisão do trabalho');
update public.fixed_fee_jobs set is_invoiced=true,invoice_date=current_date,is_paid=true where id='60000000-0000-0000-0000-0000000000f2';
do $$begin
 perform public.issue_fixed_fee_honorarium_note('60000000-0000-0000-0000-0000000000f2','{"language":"pt","fixed_fee_paid":true}'::jsonb,125.00,61.50,3,'70000000-0000-0000-0000-0000000000f8');
end$$;
select is((select remaining from public.honorarium_document_versions where request_id='70000000-0000-0000-0000-0000000000f8'),0::numeric,'Trabalho já pago não aparece com valor por pagar');
select is((select deducted from public.honorarium_document_versions where request_id='70000000-0000-0000-0000-0000000000f8'),125.00::numeric,'Nota paga mostra todo o valor já recebido');
select is((select (document_options->'fixed_fee_payment'->>'provision')::numeric from public.honorarium_document_versions where request_id='70000000-0000-0000-0000-0000000000f8'),61.50::numeric,'Nota paga distingue provisão já aplicada');
select is((select (document_options->'fixed_fee_payment'->>'external')::numeric from public.honorarium_document_versions where request_id='70000000-0000-0000-0000-0000000000f8'),63.50::numeric,'Nota paga distingue o restante recebido');
do $$begin
 perform public.reverse_client_credit((select consumption_id from public.fixed_fee_provision_applications where job_id='60000000-0000-0000-0000-0000000000f2'),'Estorno sintético','70000000-0000-0000-0000-0000000000f3');
end$$;
select is(coalesce((select gross_applied from public.get_fixed_fee_provision_totals() where job_id='60000000-0000-0000-0000-0000000000f2'),0),0::numeric,'Estorno devolve o trabalho ao valor por receber');
select is((select (value->>'balance')::numeric from jsonb_array_elements(public.get_client_credit_accounts('20000000-0000-0000-0000-0000000000f1'))),123.00::numeric,'Estorno devolve o saldo à provisão');
do $$begin
 perform public.reverse_client_credit((select id from public.client_credit_movements where request_id='70000000-0000-0000-0000-0000000000f1'),'Estorno do pagamento sintético','70000000-0000-0000-0000-0000000000f4');
end$$;
select is((select (value->>'balance')::numeric from jsonb_array_elements(public.get_client_credit_accounts('20000000-0000-0000-0000-0000000000f1'))),0::numeric,'Pagamento estornado fecha a conta');

select * from finish();
rollback;
