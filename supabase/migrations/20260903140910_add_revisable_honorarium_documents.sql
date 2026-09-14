-- Fee notes are revisable documents, independent of invoice/payment flags.
create sequence public.honorarium_document_number_seq;
create table public.honorarium_document_versions (
 id uuid primary key default gen_random_uuid(), document_id uuid not null,
 revision integer not null check(revision>0), number text not null,
 firm_id uuid not null, client_id uuid not null, billing_entity_id uuid not null,
 issued_at timestamptz not null default clock_timestamp(), created_by uuid not null references auth.users(id),
 subtotal numeric(14,2) not null, vat_rate numeric(5,2) not null check(vat_rate between 0 and 100),
 vat numeric(14,2) not null, total numeric(14,2) not null,
 deducted numeric(14,2) not null check(deducted>=0 and deducted<=total),
 remaining numeric(14,2) not null check(remaining>=0), balance_after numeric(14,2) not null,
 currency text not null, items jsonb not null check(jsonb_typeof(items)='array'),
 document_options jsonb not null default '{}' check(jsonb_typeof(document_options)='object'),
 credit_note_id uuid references public.provision_honorarium_notes(id),
 voided boolean not null default false, request_id uuid not null unique, request_payload jsonb not null,
 unique(document_id,revision),
 foreign key(firm_id,client_id) references public.clients(firm_id,id),
 foreign key(firm_id,billing_entity_id) references public.billing_entities(firm_id,id)
);
create index honorarium_versions_client_idx on public.honorarium_document_versions(client_id,issued_at desc);
create index honorarium_versions_credit_idx on public.honorarium_document_versions(credit_note_id);
alter table public.honorarium_document_versions enable row level security;
revoke all on public.honorarium_document_versions from public,anon,authenticated;
revoke all on sequence public.honorarium_document_number_seq from public,anon,authenticated;
grant select on public.honorarium_document_versions to authenticated;
create policy honorarium_versions_read on public.honorarium_document_versions for select to authenticated using (
 private.has_scope_access(firm_id,billing_entity_id,client_id,null,'view')
 and private.can_view_billing_financials(firm_id,billing_entity_id)
);

create function public.get_client_honorarium_documents(p_client_id uuid)
returns jsonb language sql stable security invoker set search_path='' as $function$
 with documents as (
 select to_jsonb(v)||jsonb_build_object('society_name',b.name,
   'is_current',v.revision=(select max(x.revision) from public.honorarium_document_versions x where x.document_id=v.document_id),
   'credit_note',to_jsonb(n),'credit_active',exists(select 1 from public.client_credit_movements m where m.note_id=n.id and m.kind='consumption' and not exists(select 1 from public.client_credit_movements r where r.reverses_id=m.id))) data
 from public.honorarium_document_versions v join public.billing_entities b on b.id=v.billing_entity_id
 left join public.provision_honorarium_notes n on n.id=v.credit_note_id where v.client_id=p_client_id
 union all
 select to_jsonb(n)||jsonb_build_object('document_id',n.id,'revision',1,'is_current',not exists(select 1 from public.honorarium_document_versions x where x.document_id=n.id),
   'firm_id',a.firm_id,'client_id',a.client_id,'billing_entity_id',a.billing_entity_id,'society_name',b.name,'currency',a.currency,
   'credit_note_id',n.id,'credit_note',to_jsonb(n),'voided',false,
   'credit_active',exists(select 1 from public.client_credit_movements m where m.note_id=n.id and m.kind='consumption' and not exists(select 1 from public.client_credit_movements r where r.reverses_id=m.id)))
 from public.provision_honorarium_notes n join public.client_credit_accounts a on a.id=n.account_id
 join public.billing_entities b on b.id=a.billing_entity_id where a.client_id=p_client_id
 and not exists(select 1 from public.honorarium_document_versions v where v.credit_note_id=n.id)
 ) select coalesce(jsonb_agg(data order by data->>'issued_at' desc),'[]'::jsonb) from documents;
$function$;

create function public.save_honorarium_document(
 p_client_id uuid,p_billing_entity_id uuid,p_work_entry_ids uuid[],p_vat_rate numeric,
 p_document_options jsonb,p_document_id uuid,p_expected_revision integer,p_apply_provision boolean,
 p_expected_total numeric,p_expected_deduction numeric,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $function$
declare
 client public.clients; society public.billing_entities; account public.client_credit_accounts;
 previous public.honorarium_document_versions; saved public.honorarium_document_versions;
 legacy public.provision_honorarium_notes; entry public.work_entries; movement public.client_credit_movements;
 payload jsonb; items jsonb:='[]'; new_ids uuid[]:='{}'; covered_ids uuid[]:='{}';
 subtotal numeric:=0; new_subtotal numeric:=0; tax numeric; total_value numeric;
 available numeric:=0; carried numeric:=0; new_deduction numeric:=0; deduction numeric:=0;
 new_credit jsonb; doc uuid:=coalesce(p_document_id,gen_random_uuid()); doc_number text; next_revision integer:=1; keep_application boolean:=false;
begin
 select * into client from public.clients where id=p_client_id for update;
 select * into society from public.billing_entities where id=p_billing_entity_id and firm_id=client.firm_id;
 if auth.uid() is null or client.id is null or society.id is null
 or not private.has_scope_access(client.firm_id,society.id,client.id,null,'edit')
 or not private.can_view_billing_financials(client.firm_id,society.id) then raise exception 'Sem permissão para guardar a nota.' using errcode='42501';end if;
 if p_request_id is null or coalesce(cardinality(p_work_entry_ids),0) not between 1 and 500
 or p_vat_rate is null or p_vat_rate<0 or p_vat_rate>100 or p_vat_rate<>round(p_vat_rate,2)
 or jsonb_typeof(p_document_options) is distinct from 'object' or octet_length(p_document_options::text)>60000
 then raise exception 'Confirme os registos e opções do documento.';end if;
 payload:=jsonb_build_object('client',p_client_id,'society',p_billing_entity_id,'ids',(select jsonb_agg(x order by x) from unnest(p_work_entry_ids)x),
 'vat',p_vat_rate,'options',p_document_options,'document',p_document_id,'revision',p_expected_revision,'apply',p_apply_provision,'total',p_expected_total,'deduction',p_expected_deduction);
 select * into saved from public.honorarium_document_versions where request_id=p_request_id;
 if found then
  if saved.client_id<>client.id or saved.request_payload is distinct from payload then raise exception 'Pedido já utilizado com outros dados.';end if;
  return to_jsonb(saved);
 end if;
 if p_document_id is not null then
  select * into previous from public.honorarium_document_versions where document_id=p_document_id and client_id=client.id order by revision desc limit 1;
  if previous.id is null then
   select n.* into legacy from public.provision_honorarium_notes n join public.client_credit_accounts a on a.id=n.account_id
   where n.id=p_document_id and a.client_id=client.id and a.billing_entity_id=society.id;
   if legacy.id is null then raise exception 'Nota indisponível.';end if;
   insert into public.honorarium_document_versions(id,document_id,revision,number,firm_id,client_id,billing_entity_id,issued_at,created_by,
    subtotal,vat_rate,vat,total,deducted,remaining,balance_after,currency,items,document_options,credit_note_id,request_id,request_payload)
   values(legacy.id,legacy.id,1,legacy.number,client.firm_id,client.id,society.id,legacy.issued_at,legacy.created_by,
    legacy.subtotal,legacy.vat_rate,legacy.vat,legacy.total,legacy.deducted,legacy.remaining,legacy.balance_after,society.default_currency,
    legacy.items,legacy.document_options,legacy.id,legacy.request_id,'{}') returning * into previous;
  end if;
  if previous.revision is distinct from p_expected_revision or previous.billing_entity_id<>society.id then raise exception 'A nota foi alterada. Reabra a última versão antes de guardar.';end if;
  next_revision:=previous.revision+1;doc_number:=previous.number;
 end if;
 if (select count(*) from public.work_entries where id=any(p_work_entry_ids) and client_id=client.id and billing_entity_id=society.id and currency=society.default_currency)<>cardinality(p_work_entry_ids)
 then raise exception 'Seleccione registos distintos deste cliente, sociedade e moeda.';end if;
 select * into account from public.client_credit_accounts where client_id=client.id and billing_entity_id=society.id and currency=society.default_currency for update;
 for entry in select * from public.work_entries where id=any(p_work_entry_ids) order by id for update loop
  if not private.has_scope_access(entry.firm_id,entry.billing_entity_id,entry.client_id,entry.matter_id,'edit')
  then raise exception 'Sem permissão para um registo.' using errcode='42501';end if;
  if entry.billing_scope<>'standard' or not entry.is_billable or entry.status in('cancelled','uncollectible_uninvoiced','uncollectible_invoiced')
   or entry.effective_amount is null or entry.effective_amount<0 then raise exception 'Confirme o montante e o estado de cada registo.';end if;
  subtotal:=subtotal+entry.effective_amount;
  items:=items||jsonb_build_array(jsonb_build_object('id',entry.id,'work_date',entry.work_date,'activity_description',entry.activity_description,'duration_minutes',entry.duration_minutes,'effective_amount',entry.effective_amount));
 end loop;
 tax:=round(subtotal*p_vat_rate/100,2);total_value:=subtotal+tax;
 if account.id is not null then
  -- Revising a document replaces its own application atomically; audit records remain immutable.
  select * into movement from public.client_credit_movements m where m.note_id=previous.credit_note_id and m.kind='consumption'
  and not exists(select 1 from public.client_credit_movements r where r.reverses_id=m.id);
  keep_application:=movement.id is not null and p_apply_provision and previous.total=total_value and previous.vat_rate=p_vat_rate
   and (select array_agg((value->>'id')::uuid order by value->>'id') from jsonb_array_elements(previous.items))=(select array_agg(id order by id) from unnest(p_work_entry_ids)id)
   and previous.deducted=least(total_value,(select coalesce(sum(round(n.deducted*(select coalesce(sum((item->>'effective_amount')::numeric),0) from jsonb_array_elements(n.items)item where (item->>'id')::uuid=any(p_work_entry_ids))/nullif(n.subtotal,0),2)),0) from public.provision_honorarium_notes n where n.account_id=account.id and exists(select 1 from public.client_credit_movements m where m.note_id=n.id and m.kind='consumption' and not exists(select 1 from public.client_credit_movements r where r.reverses_id=m.id))));
  if movement.id is not null and not keep_application then perform public.reverse_client_credit(movement.id,'Revisão da nota '||previous.number,gen_random_uuid());end if;
  select coalesce(sum(amount),0) into available from public.client_credit_movements where account_id=account.id;
  if keep_application then
   deduction:=previous.deducted;new_credit:=jsonb_build_object('id',previous.credit_note_id);
  elsif p_apply_provision then
   select coalesce(array_agg(distinct nw.work_entry_id),'{}') into covered_ids from public.provision_note_work nw
   join public.client_credit_movements m on m.note_id=nw.note_id and m.kind='consumption' and m.account_id=account.id
   where not exists(select 1 from public.client_credit_movements r where r.reverses_id=m.id);
   -- Reused applications are shown on a reissued document but never debited again.
   select coalesce(sum(round(n.deducted * (select coalesce(sum((item->>'effective_amount')::numeric),0) from jsonb_array_elements(n.items)item where (item->>'id')::uuid=any(p_work_entry_ids))/nullif(n.subtotal,0),2)),0)
   into carried from public.provision_honorarium_notes n where n.account_id=account.id
   and exists(select 1 from public.client_credit_movements m where m.note_id=n.id and m.kind='consumption' and not exists(select 1 from public.client_credit_movements r where r.reverses_id=m.id));
   select coalesce(array_agg(w.id),'{}'),coalesce(sum(w.effective_amount),0) into new_ids,new_subtotal from public.work_entries w
   where w.id=any(p_work_entry_ids) and not(w.id=any(covered_ids)) and not w.is_invoiced and not w.is_paid;
   new_deduction:=least(available,new_subtotal+round(new_subtotal*p_vat_rate/100,2));
   deduction:=least(total_value,carried+new_deduction);
  end if;
 end if;
 if total_value is distinct from p_expected_total or deduction is distinct from p_expected_deduction
 then raise exception 'Os valores ou o saldo mudaram. Actualize e confirme novamente.';end if;
 if new_deduction>0 then
  new_credit:=public.issue_provision_honorarium_note(account.id,new_ids,p_vat_rate,new_subtotal+round(new_subtotal*p_vat_rate/100,2),new_deduction,p_document_options,gen_random_uuid());
 end if;
 doc_number:=coalesce(doc_number,'NH-'||lpad(nextval('public.honorarium_document_number_seq')::text,8,'0'));
 select coalesce(jsonb_agg(value order by value->>'work_date',value->>'id'),'[]') into items from jsonb_array_elements(items);
 insert into public.honorarium_document_versions(document_id,revision,number,firm_id,client_id,billing_entity_id,created_by,
 subtotal,vat_rate,vat,total,deducted,remaining,balance_after,currency,items,document_options,credit_note_id,request_id,request_payload)
 values(doc,next_revision,doc_number,client.firm_id,client.id,society.id,auth.uid(),subtotal,p_vat_rate,tax,total_value,deduction,total_value-deduction,
 available-new_deduction,society.default_currency,items,p_document_options,(new_credit->>'id')::uuid,p_request_id,payload) returning * into saved;
 return to_jsonb(saved);
end;
$function$;

create function public.void_honorarium_document(p_document_id uuid,p_expected_revision integer,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $function$
declare previous jsonb; movement public.client_credit_movements; existing public.honorarium_document_versions; result public.honorarium_document_versions; target_client_id uuid;
begin
 select v.client_id into target_client_id from public.honorarium_document_versions v where v.document_id=p_document_id limit 1;
 if target_client_id is null then select a.client_id into target_client_id from public.provision_honorarium_notes n join public.client_credit_accounts a on a.id=n.account_id where n.id=p_document_id;end if;
 perform 1 from public.clients c where c.id=target_client_id for update;
 select value into previous from jsonb_array_elements(public.get_client_honorarium_documents(target_client_id)) where (value->>'document_id')::uuid=p_document_id and (value->>'is_current')::boolean;
 if auth.uid() is null or previous is null or not private.has_scope_access((previous->>'firm_id')::uuid,(previous->>'billing_entity_id')::uuid,target_client_id,null,'edit')
 or not private.can_view_billing_financials((previous->>'firm_id')::uuid,(previous->>'billing_entity_id')::uuid) then raise exception 'Sem permissão para anular esta nota.' using errcode='42501';end if;
 select * into existing from public.honorarium_document_versions where request_id=p_request_id;
 if found then if existing.document_id<>p_document_id or not existing.voided then raise exception 'Pedido já utilizado.';end if;return to_jsonb(existing);end if;
 if (previous->>'revision')::integer is distinct from p_expected_revision then raise exception 'Reabra a última versão da nota.';end if;
 if coalesce((previous->>'voided')::boolean,false) then return previous;end if;
 select * into movement from public.client_credit_movements m where m.note_id=(previous->>'credit_note_id')::uuid and m.kind='consumption' and not exists(select 1 from public.client_credit_movements r where r.reverses_id=m.id);
 if movement.id is not null then perform public.reverse_client_credit(movement.id,'Anulação da nota '||(previous->>'number'),gen_random_uuid());end if;
 insert into public.honorarium_document_versions(document_id,revision,number,firm_id,client_id,billing_entity_id,created_by,subtotal,vat_rate,vat,total,deducted,remaining,balance_after,currency,items,document_options,voided,request_id,request_payload)
 values(p_document_id,p_expected_revision+1,previous->>'number',(previous->>'firm_id')::uuid,target_client_id,(previous->>'billing_entity_id')::uuid,auth.uid(),
 (previous->>'subtotal')::numeric,(previous->>'vat_rate')::numeric,(previous->>'vat')::numeric,(previous->>'total')::numeric,0,(previous->>'total')::numeric,
 coalesce((select sum(m.amount) from public.client_credit_movements m join public.client_credit_accounts a on a.id=m.account_id where a.client_id=target_client_id and a.billing_entity_id=(previous->>'billing_entity_id')::uuid and a.currency=previous->>'currency'),0),previous->>'currency',previous->'items',previous->'document_options',true,p_request_id,jsonb_build_object('void',p_document_id)) returning * into result;
 return to_jsonb(result);
end;
$function$;

-- Fee-note snapshots preserve their issued contents; service corrections remain possible.
create or replace function private.protect_credited_work() returns trigger language plpgsql security definer set search_path='' as $function$
begin
 if (new.client_id,new.billing_entity_id,new.currency) is distinct from (old.client_id,old.billing_entity_id,old.currency)
 and exists(select 1 from public.provision_note_work nw join public.client_credit_movements m on m.note_id=nw.note_id and m.kind='consumption' where nw.work_entry_id=old.id and not exists(select 1 from public.client_credit_movements r where r.reverses_id=m.id)) then
  raise exception 'Estorne a aplicação de provisão antes de mudar o cliente, sociedade ou moeda.';
 end if;return new;
end;$function$;
revoke all on function public.get_client_honorarium_documents(uuid),public.save_honorarium_document(uuid,uuid,uuid[],numeric,jsonb,uuid,integer,boolean,numeric,numeric,uuid),public.void_honorarium_document(uuid,integer,uuid) from public,anon;
grant execute on function public.get_client_honorarium_documents(uuid),public.save_honorarium_document(uuid,uuid,uuid[],numeric,jsonb,uuid,integer,boolean,numeric,numeric,uuid),public.void_honorarium_document(uuid,integer,uuid) to authenticated;
