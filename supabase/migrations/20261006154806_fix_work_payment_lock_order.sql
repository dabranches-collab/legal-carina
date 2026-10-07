-- Correct the released work-payment/client lock inversion.
-- Only replaces the existing RPC body; no data, signature, grants, RLS,
-- note/provision/retainer logic or receipt reversal workflow changes.
create or replace function public.record_pending_payment(p_category text,p_id uuid,p_amount numeric,p_received_on date,p_reference text,p_expected_token text,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 item jsonb; note jsonb; payload jsonb; receipt public.pending_payment_receipts;
 client public.clients; work public.work_entries; charge public.retainer_charges; job public.fixed_fee_jobs;
 target_client uuid; target_firm uuid; target_society uuid; new_options jsonb; paid numeric; checkpoint integer;
begin
 if auth.uid() is null then raise exception 'Autenticação necessária.' using errcode='42501';end if;
 if p_category not in('work','note','retainer') or p_category is null or p_request_id is null or p_id is null
 or p_amount is null or p_amount<=0 or p_amount>1000000000 or p_amount<>round(p_amount,2)
 or p_received_on is null or length(btrim(coalesce(p_reference,''))) not between 1 and 1000
 or p_expected_token is null then raise exception 'Confirme os dados do recebimento.';end if;
 payload:=jsonb_build_object('category',p_category,'id',p_id,'amount',p_amount,'date',p_received_on,'reference',btrim(p_reference),'token',p_expected_token);
 -- Fixed fee issuers lock the job first; use the same lock order here.
 if p_category='note' then
  select n into note from private.current_payment_notes() n where n->>'document_id'=p_id::text;
  if note->>'fixed_fee_job_id' is not null then select * into job from public.fixed_fee_jobs where id=(note->>'fixed_fee_job_id')::uuid for update;end if;
 end if;
 if p_category='work' then
  -- Financial edits already lock work before the client guard. Match that order
  -- and derive the client from the locked current row, including reassignment.
  select * into work from public.work_entries where id=p_id for update;
  target_client:=work.client_id;
 elsif p_category='retainer' then select client_id into target_client from public.retainer_charges where id=p_id;
 else target_client:=(note->>'client_id')::uuid;end if;
 -- A completed retry may target a now-settled item; authorise using its receipt dimensions.
 select * into receipt from public.pending_payment_receipts where request_id=p_request_id;
 if found then target_client:=receipt.client_id;end if;
 select * into client from public.clients where id=target_client for update;
 if client.id is null then raise exception 'Pendência indisponível.';end if;
 select * into receipt from public.pending_payment_receipts where request_id=p_request_id;
 if found then
  if receipt.created_by<>auth.uid() or receipt.request_payload is distinct from payload
   or not ((receipt.category='retainer' and private.has_firm_role(receipt.firm_id,array['owner','admin','operator']))
    or private.has_scope_access(receipt.firm_id,receipt.billing_entity_id,receipt.client_id,
       case when receipt.category='work' then (select matter_id from public.work_entries where id=receipt.target_id) else null end,'view'))
   or not private.can_view_billing_financials(receipt.firm_id,receipt.billing_entity_id)
   then raise exception 'Pedido já utilizado ou sem permissão.' using errcode='42501';end if;
  return jsonb_build_object('id',receipt.id,'amount',receipt.amount,'replayed',true);
 end if;
 -- Serialise settlement with credit reversals/applications using their account lock.
 -- Re-read the queue/token only after this lock: a reversal may have committed while waiting.
 if p_category='note' then
  perform 1 from public.client_credit_accounts a where a.client_id=client.id
   and a.billing_entity_id=(note->>'billing_entity_id')::uuid and a.currency=note->>'currency'
   order by a.id for update;
 end if;
 if p_category='retainer' then select * into charge from public.retainer_charges where id=p_id for update;end if;
 select i into item from private.payment_items() i where i->>'category'=p_category and i->>'id'=p_id::text;
 if item is null or not coalesce((item->>'can_pay')::boolean,false) then raise exception 'Sem permissão ou pagamento indisponível. Confirme a facturação e a nota.' using errcode='42501';end if;
 if item->>'token' is distinct from p_expected_token then raise exception 'Os dados ou o saldo mudaram. Feche e reabra o detalhe antes de confirmar.' using errcode='40001';end if;
 if p_amount>(item->>'remaining')::numeric or ((p_category<>'note' or job.id is not null) and p_amount<>(item->>'remaining')::numeric) then raise exception 'Confirme o saldo a liquidar.';end if;
 target_firm:=client.firm_id;
 if p_category='work' then
  target_society:=work.billing_entity_id;
  perform public.update_work_entry_inline_audited(work.id,'is_paid','true',btrim(p_reference));
 elsif p_category='retainer' then
  target_society:=charge.billing_entity_id;
  update public.retainer_charges set status='paid',paid_on=p_received_on,updated_at=clock_timestamp() where id=charge.id;
 else
  select n into note from private.current_payment_notes() n where n->>'document_id'=p_id::text;
  target_society:=(note->>'billing_entity_id')::uuid;
  paid:=(item->>'received')::numeric+p_amount;
  checkpoint:=coalesce((note->'document_options'->>'payment_revision')::integer,0)+1;
  new_options:=coalesce(note->'document_options','{}')||jsonb_build_object('payment_revision',checkpoint);
  if job.id is not null then
   -- Same role and scope as fixed_fee_jobs_update; never manufacture invoice evidence.
   if not private.has_firm_role(job.firm_id,array['owner','admin','billing']) or not job.is_invoiced or job.invoice_date is null then raise exception 'Confirme a facturação do trabalho.';end if;
   update public.fixed_fee_jobs set is_paid=true,updated_at=clock_timestamp() where id=job.id;
   new_options:=new_options||jsonb_build_object('fixed_fee_paid',true,'fixed_fee_payment',jsonb_build_object('provision',(item->>'deducted')::numeric,'external',paid));
  else
   new_options:=new_options||jsonb_build_object('direct_payment',coalesce(new_options->'direct_payment','{}')||jsonb_build_object('amount',paid));
  end if;
  update public.honorarium_document_versions set document_options=new_options,remaining=(item->>'remaining')::numeric-p_amount where id=(note->>'id')::uuid;
  if not found then update public.provision_honorarium_notes set document_options=new_options,remaining=(item->>'remaining')::numeric-p_amount where id=(note->>'id')::uuid;end if;
 end if;
 insert into public.pending_payment_receipts(firm_id,client_id,billing_entity_id,category,target_id,amount,currency,received_on,reference,created_by,request_id,request_payload,balance_before,received_before)
 values(target_firm,client.id,target_society,p_category,p_id,p_amount,item->>'currency',p_received_on,btrim(p_reference),auth.uid(),p_request_id,payload,(item->>'remaining')::numeric,(item->>'received')::numeric) returning * into receipt;
 return jsonb_build_object('id',receipt.id,'amount',receipt.amount,'remaining',(item->>'remaining')::numeric-p_amount,'replayed',false);
end;$$;
