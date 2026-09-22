-- Revisions must apply new advance receipts even when work and VAT are unchanged.
create or replace function public.save_honorarium_document(
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
 available numeric:=0; carried numeric:=0; new_deduction numeric:=0; deduction numeric:=0; direct_paid numeric:=0;
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
 direct_paid:=coalesce((p_document_options->'direct_payment'->>'amount')::numeric,0);
 if direct_paid<0 or direct_paid>1000000000 or direct_paid<>round(direct_paid,2) then
  raise exception 'Confirme o pagamento directo da nota.';end if;
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
  -- An added receipt must be applied on revision, including when the work is unchanged.
  select coalesce(sum(amount),0) into available from public.client_credit_movements where account_id=account.id;
  keep_application:=movement.id is not null and p_apply_provision and available=0 and previous.total=total_value and previous.vat_rate=p_vat_rate
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
 values(doc,next_revision,doc_number,client.firm_id,client.id,society.id,auth.uid(),subtotal,p_vat_rate,tax,total_value,deduction,greatest(0,total_value-deduction-direct_paid),
 available-new_deduction,society.default_currency,items,p_document_options,(new_credit->>'id')::uuid,p_request_id,payload) returning * into saved;
 return to_jsonb(saved);
end;
$function$;


-- Align the nested credit issue function with the 60000-byte validation in save_honorarium_document.
create or replace function public.issue_provision_honorarium_note(p_account_id uuid,p_work_entry_ids uuid[],p_vat_rate numeric,p_expected_total numeric,p_expected_deduction numeric,p_document_options jsonb,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare account public.client_credit_accounts; entry public.work_entries; available numeric; subtotal numeric:=0; tax numeric; total numeric; deduction numeric; direct_paid numeric:=0; note public.provision_honorarium_notes; items jsonb:='[]'::jsonb;
begin
 select * into account from public.client_credit_accounts where id=p_account_id for update;
 if auth.uid() is null or account.id is null or not private.has_scope_access(account.firm_id,account.billing_entity_id,account.client_id,null,'edit')
 or not private.can_view_billing_financials(account.firm_id,account.billing_entity_id) then raise exception 'Sem permissão para descontar provisões.' using errcode='42501';end if;
 if p_request_id is null or coalesce(cardinality(p_work_entry_ids),0)=0 or cardinality(p_work_entry_ids)>500 then raise exception 'Seleccione entre 1 e 500 registos.';end if;
 select * into note from public.provision_honorarium_notes where request_id=p_request_id;
 if found then
   if note.account_id<>account.id or note.vat_rate is distinct from p_vat_rate or note.total is distinct from p_expected_total
   or note.deducted is distinct from p_expected_deduction
   or (select array_agg((value->>'id')::uuid order by value->>'id') from jsonb_array_elements(note.items)) is distinct from (select array_agg(id order by id) from unnest(p_work_entry_ids) id)
   then raise exception 'Pedido já utilizado com dados diferentes. Consulte a nota emitida nas Provisões.';end if;
   if exists(select 1 from public.client_credit_movements where note_id=note.id and kind='reversal') then raise exception 'Esta nota foi estornada. Consulte a cópia histórica nas Provisões.';end if;
   return to_jsonb(note);
 end if;
 if p_vat_rate is null or p_vat_rate<0 or p_vat_rate>100 or p_vat_rate<>round(p_vat_rate,2) or p_expected_total is null or p_expected_deduction is null then raise exception 'Confirme os totais e a taxa de IVA.';end if;
 if jsonb_typeof(p_document_options)<>'object' or octet_length(p_document_options::text)>60000 then raise exception 'Opções do documento inválidas.';end if;
 direct_paid:=coalesce((p_document_options->'direct_payment'->>'amount')::numeric,0);
 if direct_paid<0 or direct_paid>1000000000 or direct_paid<>round(direct_paid,2) then raise exception 'Confirme o pagamento directo da nota.';end if;
 if (select count(*) from public.work_entries where id=any(p_work_entry_ids) and client_id=account.client_id and billing_entity_id=account.billing_entity_id and currency=account.currency)<>cardinality(p_work_entry_ids) then raise exception 'Seleccione registos distintos do mesmo cliente, sociedade e moeda.';end if;
 for entry in select * from public.work_entries where id=any(p_work_entry_ids) order by id for update loop
   if not private.has_scope_access(entry.firm_id,entry.billing_entity_id,entry.client_id,entry.matter_id,'edit') then raise exception 'Sem permissão para o registo.' using errcode='42501';end if;
   if entry.billing_scope<>'standard' or not entry.is_billable or entry.is_paid or entry.is_invoiced or entry.status in('cancelled','uncollectible_uninvoiced','uncollectible_invoiced') or entry.effective_amount is null or entry.effective_amount<0 then raise exception 'Um registo deixou de ser elegível para Nota de Honorários. Actualize a lista.';end if;
   if exists(select 1 from public.provision_note_work nw join public.client_credit_movements m on m.note_id=nw.note_id and m.kind='consumption'
      where nw.work_entry_id=entry.id and not exists(select 1 from public.client_credit_movements r where r.reverses_id=m.id)) then raise exception 'Um registo já consta de uma nota com provisão descontada. Consulte a nota existente ou estorne-a antes de reemitir.';end if;
   subtotal:=subtotal+entry.effective_amount;
   items:=items||jsonb_build_array(jsonb_build_object('id',entry.id,'work_date',entry.work_date,'activity_description',entry.activity_description,'duration_minutes',entry.duration_minutes,'effective_amount',entry.effective_amount));
 end loop;
 select coalesce(jsonb_agg(value order by value->>'work_date',value->>'id'),'[]'::jsonb) into items from jsonb_array_elements(items);
 select coalesce(sum(m.amount),0) into available from public.client_credit_movements m where m.account_id=account.id;
 tax:=round(subtotal*p_vat_rate/100,2);total:=subtotal+tax;deduction:=least(available,total);
 if deduction<=0 then raise exception 'Não existe saldo de provisão disponível para esta nota.';end if;
 if total<>p_expected_total or deduction<>p_expected_deduction then raise exception 'O saldo ou o valor dos registos mudou. Actualize e confirme os novos totais antes de emitir.';end if;
 insert into public.provision_honorarium_notes(account_id,subtotal,vat_rate,vat,total,deducted,remaining,balance_after,items,document_options,request_id)
 values(account.id,subtotal,p_vat_rate,tax,total,deduction,greatest(0,total-deduction-direct_paid),available-deduction,items,
 coalesce(p_document_options,'{}'::jsonb)||jsonb_build_object('client_name',(select display_name from public.clients where id=account.client_id),'society_name',(select name from public.billing_entities where id=account.billing_entity_id)),p_request_id) returning * into note;
 insert into public.provision_note_work(note_id,work_entry_id) select note.id,id from unnest(p_work_entry_ids) id;
 insert into public.client_credit_movements(account_id,kind,amount,movement_date,reference,note_id,request_id)
 values(account.id,'consumption',-deduction,current_date,note.number,note.id,p_request_id);
 return to_jsonb(note);
end;$$;
