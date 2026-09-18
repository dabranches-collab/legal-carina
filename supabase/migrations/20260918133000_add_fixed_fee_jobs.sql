-- Trabalhos de preço fechado: o valor pertence ao trabalho; os movimentos
-- associados apenas contribuem com tempo e nunca com honorários individuais.
create table public.fixed_fee_jobs (
 id uuid primary key default gen_random_uuid(),
 firm_id uuid not null references public.law_firms(id) on delete restrict,
 client_id uuid not null,
 billing_entity_id uuid,
 title text not null check (btrim(title) <> ''),
 description text,
 agreed_amount numeric(14,2) not null check (agreed_amount >= 0),
 currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
 vat_rate numeric(5,2) check (vat_rate between 0 and 100),
 status text not null default 'not_started' check (status in ('not_started','open','completed','cancelled')),
 is_invoiced boolean not null default false,
 invoice_date date,
 is_paid boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 created_by uuid references auth.users(id) on delete set null,
 foreign key (firm_id,client_id) references public.clients(firm_id,id) on delete restrict,
 foreign key (firm_id,billing_entity_id) references public.billing_entities(firm_id,id) on delete restrict,
 unique (firm_id,id),
 check (not is_paid or is_invoiced),
 check (not is_invoiced or billing_entity_id is not null),
 check (not is_invoiced or invoice_date is not null),
 check (is_invoiced or invoice_date is null)
);
create function private.set_fixed_fee_job_vat()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='UPDATE' and new.billing_entity_id is not distinct from old.billing_entity_id then
  new.vat_rate:=old.vat_rate;return new;
 end if;
 if new.billing_entity_id is null then new.vat_rate:=null;return new;end if;
 select b.default_vat_rate into new.vat_rate from public.billing_entities b
 where b.id=new.billing_entity_id and b.firm_id=new.firm_id;
 if new.vat_rate is null then raise exception 'invalid billing entity or VAT rate';end if;
 return new;
end;$$;
create trigger set_fixed_fee_job_vat before insert or update of billing_entity_id
on public.fixed_fee_jobs for each row execute function private.set_fixed_fee_job_vat();
create index fixed_fee_jobs_client_idx on public.fixed_fee_jobs(client_id,created_at desc);
create index fixed_fee_jobs_open_idx on public.fixed_fee_jobs(firm_id,client_id) where status <> 'cancelled' and not is_paid;
create trigger fixed_fee_jobs_audit after insert or update or delete on public.fixed_fee_jobs for each row execute function private.audit_business_change();
alter table public.fixed_fee_jobs enable row level security;
revoke all on public.fixed_fee_jobs from anon,authenticated;
grant select,insert,update on public.fixed_fee_jobs to authenticated;
create policy fixed_fee_jobs_select on public.fixed_fee_jobs for select to authenticated using (
 private.has_scope_access(firm_id,billing_entity_id,client_id,null,'view')
 and private.can_view_billing_financials(firm_id,billing_entity_id)
);
create policy fixed_fee_jobs_insert on public.fixed_fee_jobs for insert to authenticated with check (
 private.has_firm_role(firm_id,array['owner','admin','billing'])
 and private.has_scope_access(firm_id,billing_entity_id,client_id,null,'edit')
 and status='not_started'
 and created_by=(select auth.uid())
);
create policy fixed_fee_jobs_update on public.fixed_fee_jobs for update to authenticated using (
 private.has_firm_role(firm_id,array['owner','admin','billing'])
 and private.has_scope_access(firm_id,billing_entity_id,client_id,null,'edit')
) with check (
 private.has_firm_role(firm_id,array['owner','admin','billing'])
 and private.has_scope_access(firm_id,billing_entity_id,client_id,null,'edit')
);
create function private.guard_fixed_fee_job_update()
returns trigger language plpgsql set search_path='' as $$
begin
 if new.firm_id is distinct from old.firm_id or new.client_id is distinct from old.client_id then raise exception 'fixed fee job ownership cannot be changed';end if;
 if new.billing_entity_id is distinct from old.billing_entity_id and
  (old.billing_entity_id is not null or old.is_invoiced or old.is_paid or
   exists(select 1 from public.work_entries w where w.fixed_fee_job_id=old.id)) then
  raise exception 'billing entity cannot change after work or billing';
 end if;
 if new.billing_entity_id is not distinct from old.billing_entity_id and new.vat_rate is distinct from old.vat_rate then
  raise exception 'VAT rate is fixed for this job';
 end if;
 if (old.is_invoiced or old.is_paid) and new.agreed_amount is distinct from old.agreed_amount then raise exception 'invoiced fixed fee amount cannot be changed';end if;
 if new.agreed_amount is distinct from old.agreed_amount and exists(
  select 1 from public.fixed_fee_provision_applications a where a.job_id=old.id
   and not exists(select 1 from public.client_credit_movements r where r.reverses_id=a.consumption_id)
 ) then raise exception 'Estorne primeiro os abatimentos da provisão antes de mudar o preço.';end if;
 if new.status='not_started' and old.status<>'not_started' then raise exception 'started fixed fee job cannot return to not started';end if;
 if old.status='not_started' and new.status in ('open','completed') and not exists(select 1 from public.work_entries w where w.fixed_fee_job_id=old.id) then raise exception 'fixed fee job starts with its first work entry';end if;
 if new.status='cancelled' and exists(select 1 from public.work_entries w where w.fixed_fee_job_id=old.id) then raise exception 'remove linked work before cancelling fixed fee job';end if;
 new.updated_at:=now();
 return new;
end;$$;

alter table public.work_entries add column fixed_fee_job_id uuid;
alter table public.work_entries add constraint work_entries_fixed_fee_job_fk foreign key (firm_id,fixed_fee_job_id) references public.fixed_fee_jobs(firm_id,id) on delete restrict;
create index work_entries_fixed_fee_job_idx on public.work_entries(fixed_fee_job_id) where fixed_fee_job_id is not null;
create trigger guard_fixed_fee_job_update before update on public.fixed_fee_jobs for each row execute function private.guard_fixed_fee_job_update();
alter table public.work_entries drop constraint work_entries_billing_scope_check;
alter table public.work_entries add constraint work_entries_billing_scope_check check (billing_scope in ('standard','retainer','fixed_fee'));
alter table public.work_entries add constraint work_entries_fixed_fee_scope_check check ((billing_scope='fixed_fee')=(fixed_fee_job_id is not null));

create or replace function private.enforce_work_entry_billing_scope()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.billing_scope='fixed_fee' then
  if not exists(select 1 from public.fixed_fee_jobs j where j.id=new.fixed_fee_job_id and j.firm_id=new.firm_id and j.client_id=new.client_id and j.status<>'cancelled' and (j.billing_entity_id is null or j.billing_entity_id is not distinct from new.billing_entity_id)) then raise exception 'invalid fixed fee job';end if;
  new.specific_hourly_rate:=null;new.imported_hourly_rate:=null;new.calculated_hourly_rate:=null;new.effective_hourly_rate:=null;
  new.pricing_rule_id:=null;new.charge_type:='fixed';new.pre_discount_amount:=null;new.calculated_discount_amount:=null;
  new.effective_discount_amount:=null;new.discount_percentage:=null;new.discount_reason:=null;new.calculated_amount:=null;
  new.imported_amount:=null;new.manual_amount:=null;new.effective_amount:=null;new.is_billable:=false;
  new.is_invoiced:=false;new.invoice_date:=null;new.is_paid:=false;new.status:='draft';new.has_historical_state_exception:=false;
 elsif new.billing_scope='retainer' then
  if not exists(select 1 from public.client_retainers r where r.firm_id=new.firm_id and r.client_id=new.client_id and r.active and r.starts_on<=new.work_date and(r.ends_on is null or r.ends_on>=new.work_date)) then raise exception 'client has no active retainer for work date';end if;
  new.specific_hourly_rate:=null;new.imported_hourly_rate:=null;new.calculated_hourly_rate:=null;new.effective_hourly_rate:=null;
  new.pricing_rule_id:=null;new.charge_type:='retainer';new.pre_discount_amount:=null;new.calculated_discount_amount:=null;
  new.effective_discount_amount:=null;new.discount_percentage:=null;new.discount_reason:=null;new.calculated_amount:=null;
  new.imported_amount:=null;new.manual_amount:=null;new.effective_amount:=null;new.is_billable:=false;
  new.is_invoiced:=false;new.invoice_date:=null;new.is_paid:=false;new.status:='draft';new.has_historical_state_exception:=false;
 elsif tg_op='UPDATE' and old.billing_scope in ('retainer','fixed_fee') and new.billing_scope='standard' then
  new.charge_type:='hourly';new.is_billable:=true;new.last_calculated_at:=null;
 end if;
 return new;
end;$$;

-- Também cobre associações feitas pelo editor ou por uma inserção de registo.
create function private.start_fixed_fee_job_on_first_entry()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.fixed_fee_job_id is null then return new;end if;
 if tg_op='UPDATE' then
  if new.fixed_fee_job_id is not distinct from old.fixed_fee_job_id then return new;end if;
 end if;
 update public.fixed_fee_jobs set status='open' where id=new.fixed_fee_job_id and status='not_started';
 return new;
end;$$;
create trigger start_fixed_fee_job_on_first_entry after insert or update of fixed_fee_job_id on public.work_entries
for each row execute function private.start_fixed_fee_job_on_first_entry();

create function public.assign_work_entry_fixed_fee(p_work_entry_id uuid,p_fixed_fee_job_id uuid,p_reason text default null)
returns void language plpgsql security definer set search_path='' as $$
declare entry public.work_entries;job public.fixed_fee_jobs;
begin
 if auth.uid() is null then raise exception 'authentication required' using errcode='28000';end if;
 select * into entry from public.work_entries where id=p_work_entry_id for update;
 if entry.id is null or not private.has_scope_access(entry.firm_id,entry.billing_entity_id,entry.client_id,entry.matter_id,'edit')
  or not private.has_firm_role(entry.firm_id,array['owner','admin','billing']) then raise exception 'not authorized' using errcode='42501';end if;
 if entry.is_invoiced or entry.is_paid or exists(select 1 from public.invoice_lines where work_entry_id=entry.id) then raise exception 'already invoiced work cannot be reassigned';end if;
 if p_fixed_fee_job_id is not null then
  select * into job from public.fixed_fee_jobs where id=p_fixed_fee_job_id;
  if job.id is null or job.firm_id<>entry.firm_id or job.client_id<>entry.client_id or job.status='cancelled'
   or (job.billing_entity_id is not null and job.billing_entity_id is distinct from entry.billing_entity_id)
   or not private.has_scope_access(job.firm_id,job.billing_entity_id,job.client_id,null,'edit')
   or not private.can_view_billing_financials(job.firm_id,job.billing_entity_id) then raise exception 'invalid fixed fee job or access' using errcode='42501';end if;
  if entry.effective_hourly_rate is not null then
   insert into public.manual_overrides(firm_id,work_entry_id,field_name,previous_value,calculated_value,override_value,reason,created_by)
   values(entry.firm_id,entry.id,'effective_hourly_rate',to_jsonb(entry.effective_hourly_rate),null,'null'::jsonb,'Valor anterior substituído pelo preço fixo do trabalho',auth.uid());
  end if;
  if entry.effective_amount is not null then
   insert into public.manual_overrides(firm_id,work_entry_id,field_name,previous_value,calculated_value,override_value,reason,created_by)
   values(entry.firm_id,entry.id,'effective_amount',to_jsonb(entry.effective_amount),null,'null'::jsonb,'Valor anterior substituído pelo preço fixo do trabalho',auth.uid());
  end if;
  update public.work_entries set fixed_fee_job_id=job.id,billing_scope='fixed_fee' where id=entry.id;
 else
  if entry.billing_scope<>'fixed_fee' then return;end if;
  update public.work_entries set fixed_fee_job_id=null,billing_scope='standard' where id=entry.id;
  -- Reposição da facturação normal: aplicar as regras de preço vigentes.
  -- Se não existir regra, o montante continua vazio para revisão humana.
  perform private.recalculate_work_entries(array[entry.id],false,true);
 end if;
 insert into public.manual_overrides(firm_id,work_entry_id,field_name,previous_value,calculated_value,override_value,reason,created_by)
 values(entry.firm_id,entry.id,'fixed_fee_job_id',to_jsonb(entry.fixed_fee_job_id),null,coalesce(to_jsonb(p_fixed_fee_job_id),'null'::jsonb),coalesce(nullif(btrim(p_reason),''),'Associação a trabalho de preço fixo'),auth.uid());
end;$$;
revoke all on function public.assign_work_entry_fixed_fee(uuid,uuid,text) from public,anon;
grant execute on function public.assign_work_entry_fixed_fee(uuid,uuid,text) to authenticated;

-- Provisões são dinheiro com IVA; a aplicação consome saldo da mesma conta.
alter table public.client_credit_movements drop constraint client_credit_movements_check;
alter table public.client_credit_movements add constraint client_credit_movements_check check (
 (kind='payment' and amount>0 and note_id is null and reverses_id is null)
 or (kind='consumption' and amount<0 and reverses_id is null)
 or (kind='reversal' and reverses_id is not null)
);
create table public.fixed_fee_provision_applications (
 id uuid primary key default gen_random_uuid(),
 job_id uuid not null references public.fixed_fee_jobs(id) on delete restrict,
 payment_id uuid references public.client_credit_movements(id) on delete restrict,
 consumption_id uuid not null unique references public.client_credit_movements(id) on delete restrict,
 batch_request_id uuid not null,
 gross_amount numeric(14,2) not null check(gross_amount>0),
 created_at timestamptz not null default now(),
 created_by uuid not null default auth.uid() references auth.users(id),
 unique(batch_request_id,job_id)
);
create index fixed_fee_provision_applications_job_idx on public.fixed_fee_provision_applications(job_id);
create index fixed_fee_provision_applications_payment_idx on public.fixed_fee_provision_applications(payment_id) where payment_id is not null;
alter table public.fixed_fee_provision_applications enable row level security;
revoke all on public.fixed_fee_provision_applications from public,anon,authenticated;
grant select on public.fixed_fee_provision_applications to authenticated;
create policy fixed_fee_provision_applications_read on public.fixed_fee_provision_applications
for select to authenticated using (
 exists(select 1 from public.fixed_fee_jobs j where j.id=job_id)
 and exists(select 1 from public.client_credit_movements m where m.id=consumption_id)
);

-- As aplicações a trabalhos não têm nota. Classificar os movimentos pela
-- natureza original evita contá-las como novas provisões recebidas.
create or replace function public.get_client_credit_accounts(p_client_id uuid default null)
returns jsonb language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(r) order by r.client_name,r.society_name,r.currency),'[]'::jsonb) from (
 select a.*,c.display_name client_name,b.name society_name,
 coalesce(sum(m.amount) filter(where coalesce(original.kind,m.kind)='payment'),0) received,
 -coalesce(sum(m.amount) filter(where coalesce(original.kind,m.kind)='consumption'),0) consumed,
 coalesce(sum(m.amount),0) balance,
 (select coalesce(jsonb_agg(nw.work_entry_id),'[]'::jsonb) from public.provision_note_work nw
 join public.provision_honorarium_notes n on n.id=nw.note_id
 where n.account_id=a.id and not exists(select 1 from public.client_credit_movements r where r.note_id=n.id and r.kind='reversal')) noted_work_ids
 from public.client_credit_accounts a join public.clients c on c.id=a.client_id
 join public.billing_entities b on b.id=a.billing_entity_id
 left join public.client_credit_movements m on m.account_id=a.id
 left join public.client_credit_movements original on original.id=m.reverses_id
 where p_client_id is null or a.client_id=p_client_id
 group by a.id,c.display_name,b.name) r;
$$;

create function private.guard_fixed_fee_credit_reversal()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.kind='reversal' and exists(
  select 1 from public.fixed_fee_provision_applications a
  where a.payment_id=new.reverses_id
   and not exists(select 1 from public.client_credit_movements r where r.reverses_id=a.consumption_id)
 ) then raise exception 'Estorne primeiro os abatimentos deste pagamento a trabalhos a preço fixo.';end if;
 return new;
end;$$;
create trigger guard_fixed_fee_credit_reversal before insert on public.client_credit_movements
for each row execute function private.guard_fixed_fee_credit_reversal();

create function private.apply_fixed_fee_credit(p_account_id uuid,p_allocations jsonb,p_request_id uuid,p_payment_id uuid default null)
returns void language plpgsql security definer set search_path='' as $$
declare account public.client_credit_accounts;job public.fixed_fee_jobs;allocation record;movement_id uuid;
 available numeric;already_applied numeric;gross_total numeric;requested jsonb;previous jsonb;
begin
 if auth.uid() is null or p_request_id is null or jsonb_typeof(p_allocations)<>'array'
  or jsonb_array_length(p_allocations)<1 or jsonb_array_length(p_allocations)>50 then
  raise exception 'Indique entre 1 e 50 abatimentos válidos.';
 end if;
 select * into account from public.client_credit_accounts where id=p_account_id for update;
 if account.id is null or not private.has_scope_access(account.firm_id,account.billing_entity_id,account.client_id,null,'edit')
  or not private.can_view_billing_financials(account.firm_id,account.billing_entity_id) then
  raise exception 'Sem permissão para aplicar a provisão.' using errcode='42501';
 end if;
 select coalesce(jsonb_agg(jsonb_build_object('job_id',x.job_id,'amount',x.amount) order by x.job_id),'[]'::jsonb)
 into requested from jsonb_to_recordset(p_allocations) as x(job_id uuid,amount numeric);
 if (select count(*) from jsonb_to_recordset(p_allocations) as x(job_id uuid,amount numeric))
  <> (select count(distinct x.job_id) from jsonb_to_recordset(p_allocations) as x(job_id uuid,amount numeric)) then
  raise exception 'Cada trabalho só pode aparecer uma vez no mesmo abatimento.';
 end if;
 select coalesce(jsonb_agg(jsonb_build_object('job_id',a.job_id,'amount',a.gross_amount) order by a.job_id),'[]'::jsonb)
 into previous from public.fixed_fee_provision_applications a where a.batch_request_id=p_request_id;
 if previous<>'[]'::jsonb then
  if previous is distinct from requested or exists(
   select 1 from public.fixed_fee_provision_applications a where a.batch_request_id=p_request_id
    and (a.payment_id is distinct from p_payment_id or exists(
     select 1 from public.client_credit_movements r where r.reverses_id=a.consumption_id))
  ) then raise exception 'Pedido já utilizado com abatimentos diferentes.';end if;
  return;
 end if;
 select coalesce(sum(m.amount),0) into available from public.client_credit_movements m where m.account_id=account.id;
 if available<(select coalesce(sum(x.amount),0) from jsonb_to_recordset(p_allocations) as x(job_id uuid,amount numeric)) then
  raise exception 'O saldo disponível da provisão não chega para os abatimentos seleccionados.';
 end if;
 for allocation in select x.job_id,x.amount from jsonb_to_recordset(p_allocations) as x(job_id uuid,amount numeric) order by x.job_id loop
  if allocation.job_id is null or allocation.amount is null or allocation.amount<=0
   or allocation.amount<>round(allocation.amount,2) then raise exception 'Indique montantes positivos com até duas casas decimais.';end if;
  select * into job from public.fixed_fee_jobs where id=allocation.job_id for update;
  if job.id is null or job.firm_id<>account.firm_id or job.client_id<>account.client_id
   or job.billing_entity_id is distinct from account.billing_entity_id or job.currency<>account.currency
   or job.vat_rate is null or job.status='cancelled' or job.is_paid
   or not private.has_scope_access(job.firm_id,job.billing_entity_id,job.client_id,null,'edit') then
   raise exception 'Trabalho inválido ou sem acesso para abatimento.' using errcode='42501';
  end if;
  gross_total:=job.agreed_amount+round(job.agreed_amount*job.vat_rate/100,2);
  select coalesce(sum(a.gross_amount),0) into already_applied
  from public.fixed_fee_provision_applications a
  where a.job_id=job.id and not exists(select 1 from public.client_credit_movements r where r.reverses_id=a.consumption_id);
  if allocation.amount>gross_total-already_applied then raise exception 'O abatimento excede o valor por liquidar deste trabalho.';end if;
  insert into public.client_credit_movements(account_id,kind,amount,movement_date,reference,request_id)
  values(account.id,'consumption',-allocation.amount,current_date,'Abatimento ao trabalho '||job.title,gen_random_uuid()) returning id into movement_id;
  insert into public.fixed_fee_provision_applications(job_id,payment_id,consumption_id,batch_request_id,gross_amount)
  values(job.id,p_payment_id,movement_id,p_request_id,allocation.amount);
 end loop;
end;$$;

create function public.record_client_credit_payment_with_fixed_fees(
 p_client_id uuid,p_billing_entity_id uuid,p_currency text,p_amount numeric,p_date date,p_reference text,p_request_id uuid,p_allocations jsonb
) returns uuid language plpgsql security definer set search_path='' as $$
declare existing public.client_credit_movements;payment_id uuid;account_id uuid;allocated numeric;
begin
 if p_allocations is null or jsonb_typeof(p_allocations)<>'array' then raise exception 'Lista de abatimentos inválida.';end if;
 select * into existing from public.client_credit_movements where request_id=p_request_id;
 if existing.id is not null and p_allocations='[]'::jsonb and exists(
  select 1 from public.fixed_fee_provision_applications a where a.payment_id=existing.id
 ) then raise exception 'Este pagamento já foi registado com abatimentos.';end if;
 if existing.id is not null and p_allocations<>'[]'::jsonb and not exists(
  select 1 from public.fixed_fee_provision_applications a where a.payment_id=existing.id
 ) then raise exception 'Este pagamento já foi registado sem abatimentos. Use um novo pedido para alterar a escolha.';end if;
 select coalesce(sum(x.amount),0) into allocated from jsonb_to_recordset(p_allocations) as x(job_id uuid,amount numeric);
 if allocated>p_amount then raise exception 'Os abatimentos não podem exceder a provisão recebida agora.';end if;
 payment_id:=public.record_client_credit_payment(p_client_id,p_billing_entity_id,p_currency,p_amount,p_date,p_reference,p_request_id);
 if p_allocations='[]'::jsonb then return payment_id;end if;
 select m.account_id into account_id from public.client_credit_movements m where m.id=payment_id;
 perform private.apply_fixed_fee_credit(account_id,p_allocations,p_request_id,payment_id);
 return payment_id;
end;$$;

create function public.apply_client_credit_to_fixed_fees(p_account_id uuid,p_allocations jsonb,p_request_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 perform private.apply_fixed_fee_credit(p_account_id,p_allocations,p_request_id,null);
end;$$;
revoke all on function public.record_client_credit_payment_with_fixed_fees(uuid,uuid,text,numeric,date,text,uuid,jsonb),
 public.apply_client_credit_to_fixed_fees(uuid,jsonb,uuid) from public,anon;
grant execute on function public.record_client_credit_payment_with_fixed_fees(uuid,uuid,text,numeric,date,text,uuid,jsonb),
 public.apply_client_credit_to_fixed_fees(uuid,jsonb,uuid) to authenticated;
revoke all on function private.apply_fixed_fee_credit(uuid,jsonb,uuid,uuid) from public,anon,authenticated;

create function public.get_fixed_fee_provision_totals()
returns table(job_id uuid,gross_applied numeric)
language sql stable security invoker set search_path='' as $$
 select a.job_id,coalesce(sum(a.gross_amount),0) gross_applied
 from public.fixed_fee_provision_applications a
 where not exists(select 1 from public.client_credit_movements r where r.reverses_id=a.consumption_id)
 group by a.job_id;
$$;
create function public.get_fixed_fee_credit_candidates(p_client_id uuid,p_billing_entity_id uuid)
returns table(job_id uuid,title text,honoraria numeric,vat_rate numeric,total_with_vat numeric,already_applied numeric,remaining numeric)
language sql stable security invoker set search_path='' as $$
 select j.id,j.title,j.agreed_amount,j.vat_rate,
  j.agreed_amount+round(j.agreed_amount*j.vat_rate/100,2) total_with_vat,
  coalesce(p.gross_applied,0) already_applied,
  j.agreed_amount+round(j.agreed_amount*j.vat_rate/100,2)-coalesce(p.gross_applied,0) remaining
 from public.fixed_fee_jobs j
 left join public.get_fixed_fee_provision_totals() p on p.job_id=j.id
 where j.client_id=p_client_id and j.billing_entity_id=p_billing_entity_id
  and j.vat_rate is not null and j.currency='EUR' and j.status<>'cancelled' and not j.is_paid
  and j.agreed_amount+round(j.agreed_amount*j.vat_rate/100,2)>coalesce(p.gross_applied,0)
 order by j.created_at,j.id;
$$;
revoke all on function public.get_fixed_fee_provision_totals(),public.get_fixed_fee_credit_candidates(uuid,uuid) from public,anon;
grant execute on function public.get_fixed_fee_provision_totals(),public.get_fixed_fee_credit_candidates(uuid,uuid) to authenticated;
notify pgrst,'reload schema';
