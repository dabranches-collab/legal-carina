-- A avença é um contrato do Cliente; a cobertura é decidida movimento a movimento.
create table if not exists public.client_retainers (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null,
  client_id uuid not null,
  billing_entity_id uuid not null,
  active boolean not null default true,
  monthly_amount numeric(14,2) not null check (monthly_amount>=0),
  currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  starts_on date not null,
  ends_on date,
  reference_hourly_rate numeric(14,2) check (reference_hourly_rate is null or reference_hourly_rate>=0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null default auth.uid(),
  foreign key (firm_id,client_id) references public.clients(firm_id,id) on delete cascade,
  foreign key (firm_id,billing_entity_id) references public.billing_entities(firm_id,id) on delete restrict,
  unique (firm_id,client_id),
  check (ends_on is null or ends_on>=starts_on)
);

create table if not exists public.retainer_charges (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null,
  retainer_id uuid not null,
  client_id uuid not null,
  billing_entity_id uuid not null,
  period_start date not null check (period_start=date_trunc('month',period_start)::date),
  amount numeric(14,2) not null check (amount>=0),
  currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'pending' check (status in ('pending','invoiced','paid','uncollectible')),
  invoice_reference text,
  invoice_date date,
  paid_on date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null default auth.uid(),
  foreign key (firm_id,client_id) references public.clients(firm_id,id) on delete cascade,
  foreign key (firm_id,billing_entity_id) references public.billing_entities(firm_id,id) on delete restrict,
  foreign key (retainer_id) references public.client_retainers(id) on delete cascade,
  unique (retainer_id,period_start),
  check ((status='pending' and invoice_date is null and paid_on is null) or
    (status in ('invoiced','uncollectible') and invoice_date is not null and paid_on is null) or
    (status='paid' and invoice_date is not null and paid_on is not null))
);

alter table public.work_entries add column if not exists billing_scope text not null default 'standard';
alter table public.work_entries drop constraint if exists work_entries_billing_scope_check;
alter table public.work_entries add constraint work_entries_billing_scope_check check (billing_scope in ('standard','retainer'));
create index if not exists work_entries_retainer_client_date_idx on public.work_entries(client_id,work_date) where billing_scope='retainer';
create index if not exists retainer_charges_client_period_idx on public.retainer_charges(client_id,period_start desc);

alter table public.client_retainers enable row level security;
alter table public.retainer_charges enable row level security;
create policy client_retainers_select_scoped on public.client_retainers for select to authenticated using (
  private.has_firm_role(firm_id,array['owner','admin','operator']) or private.has_scope_access(firm_id,null,client_id,null,'view')
);
create policy client_retainers_insert_scoped on public.client_retainers for insert to authenticated with check (
  private.has_firm_role(firm_id,array['owner','admin','operator']) or private.has_scope_access(firm_id,billing_entity_id,client_id,null,'edit')
);
create policy client_retainers_update_scoped on public.client_retainers for update to authenticated using (
  private.has_firm_role(firm_id,array['owner','admin','operator']) or private.has_scope_access(firm_id,billing_entity_id,client_id,null,'edit')
) with check (
  private.has_firm_role(firm_id,array['owner','admin','operator']) or private.has_scope_access(firm_id,billing_entity_id,client_id,null,'edit')
);
create policy retainer_charges_select_scoped on public.retainer_charges for select to authenticated using (
  private.has_firm_role(firm_id,array['owner','admin','operator']) or private.has_scope_access(firm_id,billing_entity_id,client_id,null,'view')
);
create policy retainer_charges_insert_scoped on public.retainer_charges for insert to authenticated with check (
  private.has_firm_role(firm_id,array['owner','admin','operator']) or private.has_scope_access(firm_id,billing_entity_id,client_id,null,'edit')
);
create policy retainer_charges_update_scoped on public.retainer_charges for update to authenticated using (
  private.has_firm_role(firm_id,array['owner','admin','operator']) or private.has_scope_access(firm_id,billing_entity_id,client_id,null,'edit')
) with check (
  private.has_firm_role(firm_id,array['owner','admin','operator']) or private.has_scope_access(firm_id,billing_entity_id,client_id,null,'edit')
);

grant select,insert,update on public.client_retainers,public.retainer_charges to authenticated;

create or replace function private.enforce_work_entry_billing_scope()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.billing_scope='retainer' then
    if not exists(select 1 from public.client_retainers r where r.firm_id=new.firm_id and r.client_id=new.client_id and r.active and r.starts_on<=new.work_date and(r.ends_on is null or r.ends_on>=new.work_date)) then
      raise exception 'client has no active retainer for work date';
    end if;
    new.specific_hourly_rate:=null;new.imported_hourly_rate:=null;new.calculated_hourly_rate:=null;new.effective_hourly_rate:=null;
    new.pricing_rule_id:=null;new.charge_type:='retainer';new.pre_discount_amount:=null;new.calculated_discount_amount:=null;
    new.effective_discount_amount:=null;new.discount_percentage:=null;new.discount_reason:=null;new.calculated_amount:=null;
    new.imported_amount:=null;new.manual_amount:=null;new.effective_amount:=null;new.is_billable:=false;
    new.is_invoiced:=false;new.invoice_date:=null;new.is_paid:=false;new.status:='draft';
  elsif tg_op='UPDATE' and old.billing_scope='retainer' and new.billing_scope='standard' then
    new.charge_type:='hourly';new.is_billable:=true;new.last_calculated_at:=null;
  end if;
  return new;
end;$$;
drop trigger if exists zz_enforce_work_entry_billing_scope on public.work_entries;
create trigger zz_enforce_work_entry_billing_scope before insert or update on public.work_entries for each row execute function private.enforce_work_entry_billing_scope();

create or replace function public.create_classified_work_entry(
  p_work_date date,p_client_profile_id uuid,p_matter_id uuid,p_professional_id uuid,
  p_billing_entity_id uuid,p_activity_description text,p_duration_minutes integer,
  p_observations text default null,p_hourly_rate numeric default null,p_billing_scope text default 'standard',p_expenses jsonb default '[]'::jsonb
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare new_id uuid;item jsonb;expense_id uuid;result_expenses jsonb:='[]'::jsonb;item_amount numeric;
begin
  if p_billing_scope not in('standard','retainer') then raise exception 'invalid billing scope';end if;
  if jsonb_typeof(coalesce(p_expenses,'[]'::jsonb))<>'array' or jsonb_array_length(coalesce(p_expenses,'[]'::jsonb))>100 then raise exception 'invalid expenses';end if;
  new_id:=public.create_work_entry(p_work_date,p_client_profile_id,p_matter_id,p_professional_id,p_billing_entity_id,p_activity_description,p_duration_minutes,p_observations,case when p_billing_scope='retainer' then null else p_hourly_rate end);
  if p_billing_scope='retainer' then update public.work_entries set billing_scope='retainer' where id=new_id;end if;
  for item in select value from jsonb_array_elements(coalesce(p_expenses,'[]'::jsonb)) loop
    if jsonb_typeof(item)<>'object' or btrim(coalesce(item->>'key',''))='' then raise exception 'invalid expense';end if;
    begin item_amount:=(item->>'amount')::numeric;exception when others then raise exception 'invalid expense';end;
    expense_id:=public.create_work_entry_expense(new_id,item_amount,item->>'observations');
    result_expenses:=result_expenses||jsonb_build_array(jsonb_build_object('key',item->>'key','id',expense_id));
  end loop;
  return jsonb_build_object('workEntryId',new_id,'expenses',result_expenses);
end;$$;
revoke all on function public.create_classified_work_entry(date,uuid,uuid,uuid,uuid,text,integer,text,numeric,text,jsonb) from public,anon;
grant execute on function public.create_classified_work_entry(date,uuid,uuid,uuid,uuid,text,integer,text,numeric,text,jsonb) to authenticated;

create or replace function public.set_work_entry_billing_scope(p_work_entry_id uuid,p_billing_scope text,p_reason text default null)
returns void language plpgsql security definer set search_path='' as $$
declare entry public.work_entries;
begin
  select * into entry from public.work_entries where id=p_work_entry_id for update;
  if entry.id is null or not private.has_scope_access(entry.firm_id,entry.billing_entity_id,entry.client_id,entry.matter_id,'edit') then raise exception 'not authorized' using errcode='42501';end if;
  if p_billing_scope not in('standard','retainer') then raise exception 'invalid billing scope';end if;
  update public.work_entries set billing_scope=p_billing_scope where id=entry.id;
  insert into public.manual_overrides(firm_id,work_entry_id,field_name,previous_value,calculated_value,override_value,reason,created_by)
  values(entry.firm_id,entry.id,'billing_scope',to_jsonb(entry.billing_scope),null,to_jsonb(p_billing_scope),nullif(btrim(coalesce(p_reason,'')),''),auth.uid());
end;$$;
revoke all on function public.set_work_entry_billing_scope(uuid,text,text) from public,anon;
grant execute on function public.set_work_entry_billing_scope(uuid,text,text) to authenticated;

create or replace function public.get_client_retainer_summary(p_client_id uuid)
returns jsonb language sql stable security invoker set search_path='' as $$
with r as(select * from public.client_retainers where client_id=p_client_id),
w as(select coalesce(sum(duration_minutes),0) minutes,count(*) movements,min(work_date) first_work,max(work_date) last_work from public.work_entries where client_id=p_client_id and billing_scope='retainer'),
c as(select coalesce(sum(amount),0) total,coalesce(sum(amount)filter(where status in('invoiced','paid','uncollectible')),0) invoiced,coalesce(sum(amount)filter(where status='paid'),0) paid,count(*) periods,count(*)filter(where status='pending') pending_periods,count(*)filter(where status='invoiced') unpaid_periods from public.retainer_charges where client_id=p_client_id)
select jsonb_build_object('retainer',to_jsonb(r),'minutes',w.minutes,'movements',w.movements,'firstWork',w.first_work,'lastWork',w.last_work,'chargesTotal',c.total,'invoiced',c.invoiced,'paid',c.paid,'periods',c.periods,'pendingPeriods',c.pending_periods,'unpaidPeriods',c.unpaid_periods,'effectiveHourlyRate',case when w.minutes=0 then null else round(c.invoiced*60/w.minutes,2)end) from r,w,c;
$$;
revoke all on function public.get_client_retainer_summary(uuid) from public,anon;
grant execute on function public.get_client_retainer_summary(uuid) to authenticated;

-- Movimentos cobertos pela avença nunca alimentam a Nota de Honorários normal.
create or replace function public.get_client_document_action_flags()
returns table(client_id uuid,has_uninvoiced boolean,has_unpaid boolean)
language sql stable security definer set search_path='' as $$
  with scope_access as materialized(
    select targets.firm_id,targets.billing_entity_id,targets.client_id,targets.matter_id,private.has_scope_access(targets.firm_id,targets.billing_entity_id,targets.client_id,targets.matter_id,'view') can_view
    from(select distinct w.firm_id,w.billing_entity_id,w.client_id,w.matter_id from public.work_entries w)targets)
  select w.client_id,bool_or(w.billing_scope='standard' and not w.is_invoiced and w.status<>'uncollectible_uninvoiced'),bool_or(w.billing_scope='standard' and w.is_invoiced and not w.is_paid and w.status<>'uncollectible_invoiced')
  from public.work_entries w join scope_access scope on scope.firm_id=w.firm_id and scope.billing_entity_id is not distinct from w.billing_entity_id and scope.client_id=w.client_id and scope.matter_id is not distinct from w.matter_id
  where scope.can_view group by w.client_id
  having bool_or(w.billing_scope='standard' and not w.is_invoiced and w.status<>'uncollectible_uninvoiced') or bool_or(w.billing_scope='standard' and w.is_invoiced and not w.is_paid and w.status<>'uncollectible_invoiced');
$$;

create or replace function public.get_attention_work_entries(p_kind text,p_search text default null,p_year integer default null,p_professional_id uuid default null,p_billing_entity_id uuid default null,p_archive text default null,p_missing_price boolean default false,p_client_type text default null,p_client_id uuid default null,p_missing_society boolean default false)
returns jsonb language plpgsql stable security definer set search_path='' set statement_timeout='30s' as $$
declare payload jsonb;filtered jsonb;
begin
 if p_kind not in('uninvoiced','unpaid','historical','retainer')then raise exception 'invalid attention filter';end if;
 payload:=public.search_work_entries(1,10000,p_search,p_year,p_professional_id,p_billing_entity_id,null,null,p_archive,false,p_missing_price,p_client_type,p_client_id,p_missing_society,'work_date','desc');
 select coalesce(jsonb_agg(item||jsonb_build_object('billing_scope',coalesce(w.billing_scope,'standard'))),'[]'::jsonb)into filtered
 from jsonb_array_elements(coalesce(payload->'items','[]'::jsonb))item join public.work_entries w on w.id=(item->>'id')::uuid where
  (p_kind='uninvoiced'and w.billing_scope='standard'and(item->>'is_invoiced')::boolean=false and item->>'status'<>'uncollectible_uninvoiced')or
  (p_kind='unpaid'and w.billing_scope='standard'and(item->>'is_invoiced')::boolean=true and(item->>'is_paid')::boolean=false and item->>'status'<>'uncollectible_invoiced')or
  (p_kind='historical'and(((item->>'is_invoiced')::boolean=true and nullif(item->>'invoice_date','')is null)or(item->>'has_historical_state_exception')::boolean=true))or
  (p_kind='retainer'and w.billing_scope='retainer');
 return jsonb_build_object('items',filtered,'total',jsonb_array_length(filtered),'page',1,'pageSize',10000,'professionals',coalesce(payload->'professionals','[]'::jsonb),'billingEntities',coalesce(payload->'billingEntities','[]'::jsonb));
end;$$;
revoke all on function public.get_attention_work_entries(text,text,integer,uuid,uuid,text,boolean,text,uuid,boolean)from public,anon;
grant execute on function public.get_attention_work_entries(text,text,integer,uuid,uuid,text,boolean,text,uuid,boolean)to authenticated;

notify pgrst,'reload schema';
