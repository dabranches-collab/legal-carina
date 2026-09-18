-- A nota de um trabalho a preço fixo guarda o preço uma vez. A provisão já
-- aplicada aparece no documento, mas não é consumida novamente pelo livro.
alter table public.honorarium_document_versions
 add column fixed_fee_job_id uuid references public.fixed_fee_jobs(id) on delete restrict;
create index honorarium_versions_fixed_fee_job_idx
 on public.honorarium_document_versions(fixed_fee_job_id,issued_at desc)
 where fixed_fee_job_id is not null;

create function private.carry_fixed_fee_job_on_document_revision()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.fixed_fee_job_id is null then
  select v.fixed_fee_job_id into new.fixed_fee_job_id
  from public.honorarium_document_versions v
  where v.document_id=new.document_id and v.fixed_fee_job_id is not null
  order by v.revision desc limit 1;
 end if;
 return new;
end;$$;
create trigger carry_fixed_fee_job_on_document_revision
before insert on public.honorarium_document_versions
for each row execute function private.carry_fixed_fee_job_on_document_revision();

create function public.issue_fixed_fee_honorarium_note(
 p_job_id uuid,p_document_options jsonb,p_expected_total numeric,
 p_expected_applied numeric,p_expected_revision integer,p_request_id uuid
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 job public.fixed_fee_jobs; society public.billing_entities;
 previous public.honorarium_document_versions; saved public.honorarium_document_versions;
 gross numeric; tax numeric; applied numeric; external_paid numeric; received numeric; balance numeric; minutes bigint;
 payload jsonb; document_id uuid; document_number text; revision_number integer;
begin
 select * into job from public.fixed_fee_jobs where id=p_job_id for update;
 if auth.uid() is null or job.id is null or job.status='cancelled'
  or job.billing_entity_id is null or job.vat_rate is null
  or not private.has_scope_access(job.firm_id,job.billing_entity_id,job.client_id,null,'edit')
  or not private.can_view_billing_financials(job.firm_id,job.billing_entity_id) then
  raise exception 'Sem permissão para emitir a nota deste trabalho.' using errcode='42501';
 end if;
 select * into society from public.billing_entities where id=job.billing_entity_id and firm_id=job.firm_id;
 if society.id is null or society.default_currency<>job.currency then
  raise exception 'A sociedade e a moeda do trabalho não coincidem.';
 end if;
 if p_request_id is null or jsonb_typeof(p_document_options) is distinct from 'object'
  or octet_length(p_document_options::text)>60000 then
  raise exception 'Confirme as opções da nota.';
 end if;
 tax:=round(job.agreed_amount*job.vat_rate/100,2);
 gross:=job.agreed_amount+tax;
 select coalesce(sum(a.gross_amount),0) into applied
 from public.fixed_fee_provision_applications a
 where a.job_id=job.id and not exists(
  select 1 from public.client_credit_movements r where r.reverses_id=a.consumption_id);
 if p_expected_total is distinct from gross or p_expected_applied is distinct from applied then
  raise exception 'O preço ou a provisão mudaram. Actualize a ficha antes de emitir a nota.';
 end if;
 if (p_document_options->>'fixed_fee_paid')::boolean is distinct from job.is_paid then
  raise exception 'O estado de pagamento mudou. Actualize a ficha antes de emitir a nota.';
 end if;
 external_paid:=case when job.is_paid then gross-applied else 0 end;
 received:=applied+external_paid;
 p_document_options:=p_document_options||jsonb_build_object('fixed_fee_payment',
  jsonb_build_object('provision',applied,'external',external_paid));
 payload:=jsonb_build_object('job',job.id,'total',gross,'applied',applied,
  'paid',job.is_paid,'revision',p_expected_revision,'options',p_document_options);
 select * into saved from public.honorarium_document_versions where request_id=p_request_id;
 if found then
  if saved.fixed_fee_job_id is distinct from job.id or saved.request_payload is distinct from payload then
   raise exception 'Pedido já utilizado com outros dados.';
  end if;
  return to_jsonb(saved)||jsonb_build_object('society_name',society.name);
 end if;
 select * into previous from public.honorarium_document_versions
 where fixed_fee_job_id=job.id order by issued_at desc,id desc limit 1;
 if previous.id is null then
  if p_expected_revision is not null then raise exception 'A nota foi alterada. Reabra o trabalho.';end if;
  document_id:=gen_random_uuid();
  document_number:='NH-'||lpad(nextval('public.honorarium_document_number_seq')::text,8,'0');
  revision_number:=1;
 elsif previous.revision is distinct from p_expected_revision then
  raise exception 'A nota foi alterada. Reabra a última versão.';
 elsif previous.voided then
  document_id:=gen_random_uuid();
  document_number:='NH-'||lpad(nextval('public.honorarium_document_number_seq')::text,8,'0');
  revision_number:=1;
 else
  document_id:=previous.document_id;
  document_number:=previous.number;
  revision_number:=previous.revision+1;
 end if;
 select coalesce(sum(duration_minutes),0) into minutes
 from public.work_entries where fixed_fee_job_id=job.id;
 select coalesce(sum(m.amount),0) into balance
 from public.client_credit_accounts a
 join public.client_credit_movements m on m.account_id=a.id
 where a.client_id=job.client_id and a.billing_entity_id=job.billing_entity_id
  and a.currency=job.currency;
 insert into public.honorarium_document_versions(
  document_id,revision,number,firm_id,client_id,billing_entity_id,created_by,
  subtotal,vat_rate,vat,total,deducted,remaining,balance_after,currency,
  items,document_options,request_id,request_payload,fixed_fee_job_id
 ) values (
  document_id,revision_number,document_number,job.firm_id,job.client_id,job.billing_entity_id,auth.uid(),
  job.agreed_amount,job.vat_rate,tax,gross,received,gross-received,balance,job.currency,
  jsonb_build_array(jsonb_build_object('id',job.id,'kind','fixed_fee_job',
   'work_date',coalesce(job.invoice_date,current_date),'activity_description',job.title,
   'duration_minutes',minutes,'effective_amount',job.agreed_amount)),
  p_document_options,p_request_id,payload,job.id
 ) returning * into saved;
 return to_jsonb(saved)||jsonb_build_object('society_name',society.name);
end;$$;
revoke all on function public.issue_fixed_fee_honorarium_note(uuid,jsonb,numeric,numeric,integer,uuid) from public,anon;
grant execute on function public.issue_fixed_fee_honorarium_note(uuid,jsonb,numeric,numeric,integer,uuid) to authenticated;
notify pgrst,'reload schema';
