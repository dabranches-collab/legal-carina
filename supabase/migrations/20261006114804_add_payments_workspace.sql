-- Local proposal only. No backfill, invoice issue, remote writes or ACL broadening.
-- Settlement metadata changes in place; document number/revision/content stay intact.
create table public.pending_payment_receipts (
 id uuid primary key default gen_random_uuid(),
 firm_id uuid not null references public.law_firms(id),
 client_id uuid not null, billing_entity_id uuid,
 category text not null check(category in ('work','note','retainer')),
 balance_before numeric(14,2) not null, received_before numeric(14,2) not null,
 target_id uuid not null, amount numeric(14,2) not null check(amount>0),
 currency text not null, received_on date not null, reference text not null,
 created_by uuid not null references auth.users(id), created_at timestamptz not null default clock_timestamp(),
 request_id uuid not null unique, request_payload jsonb not null,
 foreign key(firm_id,client_id) references public.clients(firm_id,id),
 foreign key(firm_id,billing_entity_id) references public.billing_entities(firm_id,id)
);
create index pending_payment_receipts_target_idx on public.pending_payment_receipts(category,target_id,created_at);
alter table public.pending_payment_receipts enable row level security;
revoke all on public.pending_payment_receipts from public,anon,authenticated;
-- Access is via scoped RPCs only; existing audit visibility remains unchanged.
create trigger pending_payment_receipts_audit after insert on public.pending_payment_receipts
 for each row execute function private.audit_business_change();
create trigger retainer_charges_audit after update on public.retainer_charges
 for each row execute function private.audit_business_change();

create function private.current_payment_notes()
returns setof jsonb language sql stable security definer set search_path='' as $$
 with current_versions as (
 select distinct on(document_id) v.* from public.honorarium_document_versions v order by document_id,revision desc
 ), notes as (
 select to_jsonb(v) as n from current_versions v
 union all
 select to_jsonb(n)||jsonb_build_object('document_id',n.id,'revision',1,'firm_id',a.firm_id,
  'client_id',a.client_id,'billing_entity_id',a.billing_entity_id,'currency',a.currency,'voided',false,
  'credit_note_id',n.id,'fixed_fee_job_id',null)
 from public.provision_honorarium_notes n join public.client_credit_accounts a on a.id=n.account_id
 where not exists(select 1 from public.honorarium_document_versions v where v.document_id=n.id or v.credit_note_id=n.id)
 ) select n from notes where not coalesce((n->>'voided')::boolean,false)
 and ((n->>'credit_note_id') is null or exists(
  select 1 from public.client_credit_movements m where m.note_id=(n->>'credit_note_id')::uuid and m.kind='consumption'
  and not exists(select 1 from public.client_credit_movements r where r.reverses_id=m.id)));
$$;
revoke all on function private.current_payment_notes() from public,anon,authenticated;

create function private.payment_items()
returns setof jsonb language sql stable security definer set search_path='' as $$
 with notes as materialized (select n from private.current_payment_notes() n),
 associated as materialized (select distinct i->>'id' as id from notes cross join lateral jsonb_array_elements(n->'items') i),
 note_rows as (
 select n,c.display_name,b.name,
  case when j.id is null then (n->>'total')::numeric else j.agreed_amount+round(j.agreed_amount*j.vat_rate/100,2) end total,
  case when j.id is null then (n->>'deducted')::numeric else coalesce(a.amount,0) end deducted,
  case when j.id is null then coalesce((n->'document_options'->'direct_payment'->>'amount')::numeric,0)
       when j.is_paid then j.agreed_amount+round(j.agreed_amount*j.vat_rate/100,2)-coalesce(a.amount,0) else 0 end received,
  (j.id is null or (j.is_invoiced and j.invoice_date is not null and private.has_firm_role(j.firm_id,array['owner','admin','billing'])
   and (n->>'total')::numeric=j.agreed_amount+round(j.agreed_amount*j.vat_rate/100,2)
   and (n->>'deducted')::numeric=coalesce(a.amount,0))) fixed_payable,
  to_jsonb(j) job,
  exists(select 1 from notes other where other.n->>'document_id'<>n->>'document_id'
   and exists(select 1 from jsonb_array_elements(other.n->'items') x join jsonb_array_elements(n->'items') y on x->>'id'=y->>'id')) duplicate
 from notes join public.clients c on c.id=(n->>'client_id')::uuid
 join public.billing_entities b on b.id=(n->>'billing_entity_id')::uuid
 left join public.fixed_fee_jobs j on j.id=(n->>'fixed_fee_job_id')::uuid
 left join lateral (select sum(p.gross_amount) amount from public.fixed_fee_provision_applications p where p.job_id=j.id
  and not exists(select 1 from public.client_credit_movements r where r.reverses_id=p.consumption_id)) a on true
 where auth.uid() is not null and private.has_scope_access(c.firm_id,b.id,c.id,null,'view')
 and private.can_view_billing_financials(c.firm_id,b.id) and (j.id is null or j.status<>'cancelled')
 )
 select jsonb_build_object('id',w.id,'category',case when w.is_invoiced then 'work' else 'unbilled' end,
  'client_id',w.client_id,'client_name',c.display_name,'society_name',coalesce(b.name,'Por atribuir'),
  'title',w.activity_description,'date',w.work_date,'currency',w.currency,'total',w.effective_amount,
  'received',0,'deducted',0,'remaining',w.effective_amount,'token',md5(to_jsonb(w)::text),
  'note_associated',exists(select 1 from associated a where a.id=w.id::text),
  'can_edit',private.has_scope_access(w.firm_id,w.billing_entity_id,w.client_id,w.matter_id,'edit'),
  'can_pay',w.is_invoiced and w.invoice_date is not null and w.effective_amount>0
    and private.has_scope_access(w.firm_id,w.billing_entity_id,w.client_id,w.matter_id,'edit'),
  'status',case when w.is_invoiced then 'Facturado' else 'Por facturar' end)
 from public.work_entries w join public.clients c on c.id=w.client_id left join public.billing_entities b on b.id=w.billing_entity_id
 where auth.uid() is not null and w.billing_scope='standard' and w.is_billable and not w.is_paid
 and w.status not in('cancelled','non_billable','uncollectible_invoiced','uncollectible_uninvoiced')
 and private.has_scope_access(w.firm_id,w.billing_entity_id,w.client_id,w.matter_id,'view')
 and private.can_view_billing_financials(w.firm_id,w.billing_entity_id)
 and (not w.is_invoiced or not exists(select 1 from associated a where a.id=w.id::text))
 union all
 select jsonb_build_object('id',n->>'document_id','category','note','client_id',n->>'client_id',
  'client_name',display_name,'society_name',name,'title',n->>'number','date',n->>'issued_at',
  'currency',n->>'currency','total',total,'received',received,'deducted',deducted,
  'remaining',greatest(0,total-deducted-received),'revision',(n->>'revision')::integer,
  'fixed_fee_job_id',n->>'fixed_fee_job_id','token',md5(n::text||coalesce(job::text,'')||deducted::text||received::text),
  'can_edit',private.has_scope_access((n->>'firm_id')::uuid,(n->>'billing_entity_id')::uuid,(n->>'client_id')::uuid,null,'edit'),
  'can_pay',not duplicate and fixed_payable and private.has_scope_access((n->>'firm_id')::uuid,(n->>'billing_entity_id')::uuid,(n->>'client_id')::uuid,null,'edit'),
  'status',case when duplicate then 'Associação duplicada — rever notas' when not fixed_payable then 'Facturação / permissão do trabalho por confirmar' else 'Por receber' end)
 from note_rows where total-deducted-received>0
 union all
 select jsonb_build_object('id',r.id,'category','retainer','client_id',r.client_id,'client_name',c.display_name,
  'society_name',b.name,'title','Avença · '||to_char(r.period_start,'MM/YYYY'),'date',r.period_start,
  'currency',r.currency,'total',r.amount,'received',0,'deducted',0,'remaining',r.amount,'token',md5(to_jsonb(r)::text),
  'can_edit',private.has_firm_role(r.firm_id,array['owner','admin','operator']) or private.has_scope_access(r.firm_id,r.billing_entity_id,r.client_id,null,'edit'),
  'can_pay',r.status='invoiced' and r.invoice_date is not null and r.amount>0 and
   (private.has_firm_role(r.firm_id,array['owner','admin','operator']) or private.has_scope_access(r.firm_id,r.billing_entity_id,r.client_id,null,'edit')),
  'status',case when r.status='pending' then 'Por facturar' else 'Facturada' end)
 from public.retainer_charges r join public.clients c on c.id=r.client_id join public.billing_entities b on b.id=r.billing_entity_id
 where auth.uid() is not null and r.status in('pending','invoiced')
 and (private.has_firm_role(r.firm_id,array['owner','admin','operator']) or private.has_scope_access(r.firm_id,r.billing_entity_id,r.client_id,null,'view'))
 and private.can_view_billing_financials(r.firm_id,r.billing_entity_id);
$$;
revoke all on function private.payment_items() from public,anon,authenticated;

create function public.get_payment_queue()
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(i order by i->>'date',i->>'id'),'[]') from private.payment_items() i;
$$;
create function public.get_payment_detail(p_category text,p_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare item jsonb; result jsonb;
begin
 select i into item from private.payment_items() i where i->>'category'=p_category and i->>'id'=p_id::text;
 if item is null then raise exception 'Pendência alterada ou sem permissão. Actualize a lista.';end if;
 select jsonb_build_object('item',item,'receipts',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'amount',r.amount,'received_on',r.received_on,'reference',r.reference) order by r.created_at)
  from public.pending_payment_receipts r where r.category=p_category and r.target_id=p_id),'[]'::jsonb),
  'items',case when p_category='note' then coalesce((select n->'items' from private.current_payment_notes() n where n->>'document_id'=p_id::text),'[]'::jsonb) else '[]'::jsonb end,
  'charge',case when p_category='retainer' then (select to_jsonb(r) from public.retainer_charges r where r.id=p_id) else null end) into result;
 return result;
end;$$;

create function public.invoice_pending_retainer(p_id uuid,p_expected_token text,p_invoice_date date,p_invoice_reference text,p_due_on date,p_notes text)
returns void language plpgsql security definer set search_path='' as $$
declare charge public.retainer_charges; item jsonb;
begin
 select * into charge from public.retainer_charges where id=p_id for update;
 select i into item from private.payment_items() i where i->>'id'=p_id::text and i->>'category'='retainer';
 if auth.uid() is null or item is null or not (item->>'can_edit')::boolean then raise exception 'Sem permissão para facturar a prestação.' using errcode='42501';end if;
 if charge.status<>'pending' or item->>'token' is distinct from p_expected_token then raise exception 'A prestação mudou. Reabra o detalhe.' using errcode='40001';end if;
 if p_invoice_date is null or length(coalesce(p_invoice_reference,''))>200 or length(coalesce(p_notes,''))>10000 then raise exception 'Confirme a data e os dados da factura.';end if;
 update public.retainer_charges set status='invoiced',invoice_date=p_invoice_date,invoice_reference=nullif(btrim(p_invoice_reference),''),due_on=p_due_on,notes=nullif(btrim(p_notes),''),updated_at=clock_timestamp() where id=p_id;
end;$$;
revoke all on function public.invoice_pending_retainer(uuid,text,date,text,date,text) from public,anon;
grant execute on function public.invoice_pending_retainer(uuid,text,date,text,date,text) to authenticated;

create function public.record_pending_payment(p_category text,p_id uuid,p_amount numeric,p_received_on date,p_reference text,p_expected_token text,p_request_id uuid)
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
 if p_category='work' then select client_id into target_client from public.work_entries where id=p_id;
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
 if p_category='work' then select * into work from public.work_entries where id=p_id for update;
 elsif p_category='retainer' then select * into charge from public.retainer_charges where id=p_id for update;end if;
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

-- Revisions opened before a receipt cannot overwrite that receipt. Paid note
-- associations cannot be silently removed, cancelled or moved to another client.
create function private.guard_paid_document_revision()
returns trigger language plpgsql security definer set search_path='' as $$
declare previous jsonb; previous_paid numeric; incoming_paid numeric;
begin
 perform 1 from public.clients where id=new.client_id for update;
 select n into previous from jsonb_array_elements(public.get_client_honorarium_documents(new.client_id)) n
  where n->>'document_id'=new.document_id::text and (n->>'is_current')::boolean;
 -- Importing a legacy v1 into the version table is a faithful copy, not a revision.
 if previous is not null and (previous->>'id')::uuid<>new.id then
  previous_paid:=coalesce((previous->'document_options'->'direct_payment'->>'amount')::numeric,(previous->'document_options'->'fixed_fee_payment'->>'external')::numeric,0);
  incoming_paid:=coalesce((new.document_options->'direct_payment'->>'amount')::numeric,(new.document_options->'fixed_fee_payment'->>'external')::numeric,0);
  if coalesce((previous->'document_options'->>'payment_revision')::integer,0)<>coalesce((new.document_options->>'payment_revision')::integer,0) then raise exception 'Existem novos recebimentos. Reabra a nota antes de a rever.' using errcode='40001';end if;
  if previous_paid>0 and (new.voided or incoming_paid<previous_paid
    or (new.total<(previous->>'total')::numeric and new.total<new.deducted+incoming_paid)
    or new.client_id::text<>previous->>'client_id' or new.billing_entity_id::text<>previous->>'billing_entity_id'
    or new.currency<>previous->>'currency'
    or (select jsonb_agg(i->>'id' order by i->>'id') from jsonb_array_elements(new.items)i)
       is distinct from (select jsonb_agg(i->>'id' order by i->>'id') from jsonb_array_elements(previous->'items')i))
   then raise exception 'Esta nota tem recebimentos. Regularize-os antes de anular, reduzir pagamentos ou retirar registos.';end if;
 end if;
 if not new.voided and new.fixed_fee_job_id is null and previous is null and exists(
  select 1 from public.work_entries w join jsonb_array_elements(new.items)i on i->>'id'=w.id::text where w.is_paid)
 then raise exception 'Um registo já está pago. Não pode ser cobrado numa nova nota.';end if;
 if not new.voided and new.fixed_fee_job_id is null and exists(
  select 1 from private.current_payment_notes() n where n->>'document_id'<>new.document_id::text
  -- The provision issuer creates its legacy snapshot in this transaction before the version.
  -- It is the same note, not an independent document; existing versioned documents still conflict.
  and not (new.credit_note_id is not null and n->>'document_id'=new.credit_note_id::text and n->>'id'=new.credit_note_id::text)
  and exists(select 1 from jsonb_array_elements(n->'items')a join jsonb_array_elements(new.items)b on a->>'id'=b->>'id'))
 then raise exception 'Um registo já pertence a outra nota vigente. Reveja essa nota.';end if;
 return new;
end;$$;
create trigger zz_guard_paid_document_revision before insert on public.honorarium_document_versions for each row execute function private.guard_paid_document_revision();

create function private.guard_noted_work_payment()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.pending_payment_receipts r where r.category='work' and r.target_id=old.id)
 and (tg_op='DELETE' or not new.is_paid or (new.client_id,new.billing_entity_id,new.currency,new.effective_amount,new.billing_scope,new.is_billable)
  is distinct from (old.client_id,old.billing_entity_id,old.currency,old.effective_amount,old.billing_scope,old.is_billable))
 then raise exception 'Este registo tem um recebimento auditado. Regularize-o antes de alterar a cobrança.';end if;
 if tg_op='UPDATE' and (new.client_id,new.billing_entity_id,new.currency,new.effective_amount,new.billing_scope,new.is_paid,new.is_billable)
  is not distinct from (old.client_id,old.billing_entity_id,old.currency,old.effective_amount,old.billing_scope,old.is_paid,old.is_billable)
  and new.status not in('cancelled','uncollectible_invoiced','uncollectible_uninvoiced','non_billable') then return new;end if;
 perform 1 from public.clients where id=old.client_id for update;
 if exists(select 1 from private.current_payment_notes() n cross join lateral jsonb_array_elements(n->'items') i
   where i->>'id'=old.id::text and n->>'fixed_fee_job_id' is null) then
  raise exception 'Registo associado a uma nota vigente. Trate o pagamento na nota; anule-a antes de alterar a associação ou o valor.';
 end if;
 if tg_op='DELETE' then return old;end if;
 return new;
end;$$;
create trigger zzzz_guard_noted_work_payment before update or delete on public.work_entries for each row execute function private.guard_noted_work_payment();

create function private.guard_received_charge()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.pending_payment_receipts r where r.category='retainer' and r.target_id=old.id)
 and (tg_op='DELETE' or (new.status,new.amount,new.currency,new.client_id,new.billing_entity_id,new.paid_on,new.invoice_date)
  is distinct from (old.status,old.amount,old.currency,old.client_id,old.billing_entity_id,old.paid_on,old.invoice_date)) then
  raise exception 'Esta prestação tem um recebimento auditado. Regularize-o antes de alterar a cobrança.';
 end if;
 if tg_op='DELETE' then return old;end if;return new;
end;$$;
create trigger guard_received_charge before update or delete on public.retainer_charges for each row execute function private.guard_received_charge();
revoke all on function private.guard_received_charge() from public,anon,authenticated;

create function private.guard_received_fixed_job()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if (not new.is_paid or new.status='cancelled') and exists(
  select 1 from public.pending_payment_receipts r join public.honorarium_document_versions v on v.document_id=r.target_id
  where r.category='note' and v.fixed_fee_job_id=old.id) then
  raise exception 'Este trabalho tem um recebimento auditado na nota. Regularize-o antes de alterar a cobrança.';
 end if;
 return new;
end;$$;
create trigger guard_received_fixed_job before update on public.fixed_fee_jobs for each row execute function private.guard_received_fixed_job();
revoke all on function private.guard_received_fixed_job() from public,anon,authenticated;

create function private.guard_received_note_credit_reversal()
returns trigger language plpgsql security definer set search_path='' as $$
declare target_note uuid;
begin
 if new.reverses_id is null then return new;end if;
 if exists(select 1 from public.fixed_fee_provision_applications a
  join public.honorarium_document_versions v on v.fixed_fee_job_id=a.job_id
  join public.pending_payment_receipts r on r.category='note' and r.target_id=v.document_id
  where a.consumption_id=new.reverses_id) then
  raise exception 'O trabalho tem recebimentos. Regularize-os antes de estornar a provisão.';
 end if;
 select note_id into target_note from public.client_credit_movements where id=new.reverses_id;
 if target_note is null then return new;end if;
 if exists(select 1 from public.honorarium_document_versions v where v.credit_note_id=target_note
  and v.revision=(select max(x.revision) from public.honorarium_document_versions x where x.document_id=v.document_id)
  and coalesce((v.document_options->'direct_payment'->>'amount')::numeric,0)>0)
 or exists(select 1 from public.provision_honorarium_notes n where n.id=target_note
  and coalesce((n.document_options->'direct_payment'->>'amount')::numeric,0)>0) then
  raise exception 'A provisão pertence a uma nota com recebimentos. Regularize a nota antes do estorno.';
 end if;
 return new;
end;$$;
create trigger guard_received_note_credit_reversal before insert on public.client_credit_movements
 for each row execute function private.guard_received_note_credit_reversal();
revoke all on function private.guard_received_note_credit_reversal() from public,anon,authenticated;
revoke all on function private.guard_paid_document_revision(),private.guard_noted_work_payment() from public,anon,authenticated;
revoke all on function public.get_payment_queue(),public.get_payment_detail(text,uuid),public.record_pending_payment(text,uuid,numeric,date,text,text,uuid) from public,anon;
grant execute on function public.get_payment_queue(),public.get_payment_detail(text,uuid),public.record_pending_payment(text,uuid,numeric,date,text,text,uuid) to authenticated;
