-- Candidate 0.7.0. Apply only after explicit publication approval.
-- All mutations lock the account before calculating its available balance.
create table public.client_credit_accounts (
 id uuid primary key default gen_random_uuid(), firm_id uuid not null,
 client_id uuid not null, billing_entity_id uuid not null,
 currency text not null default 'EUR' check(currency ~ '^[A-Z]{3}$'),
 created_at timestamptz not null default now(),
 foreign key(firm_id,client_id) references public.clients(firm_id,id) on delete restrict,
 foreign key(firm_id,billing_entity_id) references public.billing_entities(firm_id,id) on delete restrict,
 unique(client_id,billing_entity_id,currency)
);
create sequence public.provision_note_number_seq;
create table public.provision_honorarium_notes (
 id uuid primary key default gen_random_uuid(),
 account_id uuid not null references public.client_credit_accounts(id) on delete restrict,
 number text not null unique default ('NH-P-'||lpad(nextval('public.provision_note_number_seq')::text,8,'0')),
 issued_at timestamptz not null default clock_timestamp(),
 subtotal numeric(14,2) not null, vat_rate numeric(5,2) not null check(vat_rate between 0 and 100),
 vat numeric(14,2) not null, total numeric(14,2) not null,
 deducted numeric(14,2) not null check(deducted>0 and deducted<=total),
 remaining numeric(14,2) not null check(remaining>=0), balance_after numeric(14,2) not null check(balance_after>=0),
 items jsonb not null, document_options jsonb not null default '{}'::jsonb,
 request_id uuid not null unique, created_by uuid not null default auth.uid() references auth.users(id)
);
create table public.provision_note_work (
 note_id uuid not null references public.provision_honorarium_notes(id) on delete restrict,
 work_entry_id uuid not null references public.work_entries(id) on delete restrict,
 primary key(note_id,work_entry_id)
);
create index provision_note_work_entry_idx on public.provision_note_work(work_entry_id);
create table public.client_credit_movements (
 id uuid primary key default gen_random_uuid(),
 account_id uuid not null references public.client_credit_accounts(id) on delete restrict,
 kind text not null check(kind in('payment','consumption','reversal')),
 amount numeric(14,2) not null check(amount<>0),
 movement_date date not null, recorded_at timestamptz not null default clock_timestamp(),
 reference text not null check(length(btrim(reference)) between 1 and 1000),
 note_id uuid references public.provision_honorarium_notes(id) on delete restrict,
 reverses_id uuid unique references public.client_credit_movements(id) on delete restrict,
 request_id uuid not null unique,
 created_by uuid not null default auth.uid() references auth.users(id),
 check((kind='payment' and amount>0 and note_id is null and reverses_id is null)
    or (kind='consumption' and amount<0 and note_id is not null and reverses_id is null)
    or (kind='reversal' and reverses_id is not null))
);
create index client_credit_movements_account_idx on public.client_credit_movements(account_id,recorded_at,id);
create index client_credit_movements_note_idx on public.client_credit_movements(note_id) where note_id is not null;
alter table public.client_credit_accounts enable row level security;
alter table public.client_credit_movements enable row level security;
alter table public.provision_honorarium_notes enable row level security;
alter table public.provision_note_work enable row level security;
revoke all on public.client_credit_accounts,public.client_credit_movements,public.provision_honorarium_notes,public.provision_note_work from public,anon,authenticated;
revoke all on sequence public.provision_note_number_seq from public,anon,authenticated;
grant select on public.client_credit_accounts,public.client_credit_movements,public.provision_honorarium_notes,public.provision_note_work to authenticated;
create policy client_credit_accounts_read on public.client_credit_accounts for select to authenticated using(
 private.has_scope_access(firm_id,billing_entity_id,client_id,null,'view')
 and private.can_view_billing_financials(firm_id,billing_entity_id));
create policy client_credit_movements_read on public.client_credit_movements for select to authenticated using(
 exists(select 1 from public.client_credit_accounts a where a.id=account_id));
create policy provision_notes_read on public.provision_honorarium_notes for select to authenticated using(
 exists(select 1 from public.client_credit_accounts a where a.id=account_id));
create policy provision_note_work_read on public.provision_note_work for select to authenticated using(
 exists(select 1 from public.provision_honorarium_notes n where n.id=note_id));

create function public.get_client_credit_accounts(p_client_id uuid default null)
returns jsonb language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(r) order by r.client_name,r.society_name,r.currency),'[]'::jsonb) from (
 select a.*,c.display_name client_name,b.name society_name,
 coalesce(sum(m.amount) filter(where m.note_id is null),0) received,
 -coalesce(sum(m.amount) filter(where m.note_id is not null),0) consumed,
 coalesce(sum(m.amount),0) balance,
 (select coalesce(jsonb_agg(nw.work_entry_id),'[]'::jsonb) from public.provision_note_work nw
 join public.provision_honorarium_notes n on n.id=nw.note_id
 where n.account_id=a.id and not exists(select 1 from public.client_credit_movements r where r.note_id=n.id and r.kind='reversal')) noted_work_ids
 from public.client_credit_accounts a join public.clients c on c.id=a.client_id
 join public.billing_entities b on b.id=a.billing_entity_id
 left join public.client_credit_movements m on m.account_id=a.id
 where p_client_id is null or a.client_id=p_client_id
 group by a.id,c.display_name,b.name) r;
$$;

create function public.get_client_credit_detail(p_account_id uuid)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare account jsonb; movements jsonb;
begin
 select value into account from jsonb_array_elements(public.get_client_credit_accounts()) where value->>'id'=p_account_id::text;
 if account is null then raise exception 'Conta indisponível ou sem permissão.' using errcode='42501';end if;
 select coalesce(jsonb_agg(to_jsonb(r) order by r.recorded_at,r.id),'[]'::jsonb) into movements from(
 select m.*,to_jsonb(n) note,exists(select 1 from public.client_credit_movements reversal where reversal.reverses_id=m.id) reversed
 from public.client_credit_movements m left join public.provision_honorarium_notes n on n.id=m.note_id where m.account_id=p_account_id) r;
 return jsonb_build_object('account',account,'movements',movements);
end;$$;

create function public.record_client_credit_payment(p_client_id uuid,p_billing_entity_id uuid,p_currency text,p_amount numeric,p_date date,p_reference text,p_request_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare client public.clients; account_id uuid; existing public.client_credit_movements; result uuid;
begin
 select * into client from public.clients where id=p_client_id;
 if auth.uid() is null or client.id is null or not private.has_scope_access(client.firm_id,p_billing_entity_id,client.id,null,'edit')
 or not private.can_view_billing_financials(client.firm_id,p_billing_entity_id) then raise exception 'Sem permissão para registar pagamentos.' using errcode='42501';end if;
 if p_amount is null or p_amount<=0 or p_amount<>round(p_amount,2) or p_amount::text in('NaN','Infinity','-Infinity') or p_date is null or p_date>current_date or p_request_id is null then raise exception 'Indique um montante positivo com duas casas decimais e uma data válida.';end if;
 insert into public.client_credit_accounts(firm_id,client_id,billing_entity_id,currency) values(client.firm_id,client.id,p_billing_entity_id,p_currency)
 on conflict(client_id,billing_entity_id,currency) do nothing;
 select id into account_id from public.client_credit_accounts where client_id=client.id and billing_entity_id=p_billing_entity_id and currency=p_currency for update;
 select * into existing from public.client_credit_movements where request_id=p_request_id;
 if found then
   if existing.account_id<>account_id or existing.kind<>'payment' or existing.amount<>p_amount or existing.movement_date<>p_date or existing.reference<>btrim(p_reference) then raise exception 'Pedido já utilizado com dados diferentes.';end if;
   return existing.id;
 end if;
 insert into public.client_credit_movements(account_id,kind,amount,movement_date,reference,request_id)
 values(account_id,'payment',p_amount,p_date,btrim(p_reference),p_request_id) returning id into result;
 return result;
end;$$;

create function public.issue_provision_honorarium_note(p_account_id uuid,p_work_entry_ids uuid[],p_vat_rate numeric,p_expected_total numeric,p_expected_deduction numeric,p_document_options jsonb,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare account public.client_credit_accounts; entry public.work_entries; available numeric; subtotal numeric:=0; tax numeric; total numeric; deduction numeric; note public.provision_honorarium_notes; items jsonb:='[]'::jsonb;
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
 if jsonb_typeof(p_document_options)<>'object' or octet_length(p_document_options::text)>20000 then raise exception 'Opções do documento inválidas.';end if;
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
 values(account.id,subtotal,p_vat_rate,tax,total,deduction,total-deduction,available-deduction,items,
 coalesce(p_document_options,'{}'::jsonb)||jsonb_build_object('client_name',(select display_name from public.clients where id=account.client_id),'society_name',(select name from public.billing_entities where id=account.billing_entity_id)),p_request_id) returning * into note;
 insert into public.provision_note_work(note_id,work_entry_id) select note.id,id from unnest(p_work_entry_ids) id;
 insert into public.client_credit_movements(account_id,kind,amount,movement_date,reference,note_id,request_id)
 values(account.id,'consumption',-deduction,current_date,note.number,note.id,p_request_id);
 return to_jsonb(note);
end;$$;

create function public.reverse_client_credit(p_movement_id uuid,p_reason text,p_request_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare movement public.client_credit_movements; account public.client_credit_accounts; available numeric; result uuid;
begin
 select * into movement from public.client_credit_movements where id=p_movement_id;
 select * into account from public.client_credit_accounts where id=movement.account_id for update;
 if auth.uid() is null or account.id is null or not private.has_scope_access(account.firm_id,account.billing_entity_id,account.client_id,null,'edit')
 or not private.can_view_billing_financials(account.firm_id,account.billing_entity_id) then raise exception 'Sem permissão para estornar.' using errcode='42501';end if;
 if movement.kind='reversal' or length(btrim(coalesce(p_reason,'')))<3 or p_request_id is null then raise exception 'Indique o motivo do estorno.';end if;
 select id into result from public.client_credit_movements where reverses_id=movement.id;
 if found then return result;end if;
 select coalesce(sum(amount),0) into available from public.client_credit_movements where account_id=account.id;
 if available-movement.amount<0 then raise exception 'Estorne primeiro os consumos deste crédito; o saldo não pode ficar negativo.';end if;
 insert into public.client_credit_movements(account_id,kind,amount,movement_date,reference,note_id,reverses_id,request_id)
 values(account.id,'reversal',-movement.amount,current_date,btrim(p_reason),movement.note_id,movement.id,p_request_id) returning id into result;
 return result;
end;$$;

-- Preserve the original service evidence until the associated consumption is reversed.
create function private.protect_credited_work() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if (new.client_id,new.billing_entity_id,new.currency,new.effective_amount,new.work_date,new.activity_description,new.duration_minutes,new.billing_scope,new.is_billable)
 is distinct from (old.client_id,old.billing_entity_id,old.currency,old.effective_amount,old.work_date,old.activity_description,old.duration_minutes,old.billing_scope,old.is_billable)
 and exists(select 1 from public.provision_note_work nw join public.client_credit_movements m on m.note_id=nw.note_id and m.kind='consumption' where nw.work_entry_id=old.id and not exists(select 1 from public.client_credit_movements r where r.reverses_id=m.id)) then
   raise exception 'Este registo consta de uma Nota de Honorários com provisão descontada. Estorne a nota antes de alterar os dados do serviço.';
 end if;
 return new;
end;$$;
create trigger zzz_protect_credited_work before update on public.work_entries for each row execute function private.protect_credited_work();
revoke all on function private.protect_credited_work() from public,anon,authenticated;
revoke all on function public.get_client_credit_accounts(uuid),public.get_client_credit_detail(uuid),public.record_client_credit_payment(uuid,uuid,text,numeric,date,text,uuid),public.issue_provision_honorarium_note(uuid,uuid[],numeric,numeric,numeric,jsonb,uuid),public.reverse_client_credit(uuid,text,uuid) from public,anon;
grant execute on function public.get_client_credit_accounts(uuid),public.get_client_credit_detail(uuid),public.record_client_credit_payment(uuid,uuid,text,numeric,date,text,uuid),public.issue_provision_honorarium_note(uuid,uuid[],numeric,numeric,numeric,jsonb,uuid),public.reverse_client_credit(uuid,text,uuid) to authenticated;
