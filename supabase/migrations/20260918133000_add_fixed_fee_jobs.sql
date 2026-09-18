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
notify pgrst,'reload schema';
