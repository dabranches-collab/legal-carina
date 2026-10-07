-- Avença + horas: o pacote renova no período do contrato (p. ex. 32 h/ano).
-- O excedente pertence ao próprio movimento e entra na facturação normal.
alter table public.client_retainers
 add column billing_mode text not null default 'retainer' check(billing_mode in('retainer','retainer_plus_hours')),
 add column excess_hourly_rate numeric(14,2) check(excess_hourly_rate is null or excess_hourly_rate>=0),
 add constraint retainer_extra_hours_terms check(billing_mode='retainer' or
  (included_hours is not null and excess_hourly_rate is not null));
alter table public.work_entries
 add column retainer_id uuid references public.client_retainers(id) on delete restrict,
 add column retainer_covered_minutes numeric(12,2),
 add column retainer_excess_minutes numeric(12,2);
create index work_entries_retainer_period_idx on public.work_entries(retainer_id,work_date,created_at,id);

create function private.validate_retainer_work_link()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if coalesce(current_setting('app.retainer_pricing',true),'')<>'on' and
  ((tg_op='INSERT' and(new.retainer_id is not null or new.retainer_covered_minutes is not null or new.retainer_excess_minutes is not null))
   or(tg_op='UPDATE' and(new.retainer_id,new.retainer_covered_minutes,new.retainer_excess_minutes)
     is distinct from(old.retainer_id,old.retainer_covered_minutes,old.retainer_excess_minutes)))then
  raise exception 'O consumo da avença é calculado automaticamente.' using errcode='42501';
 end if;
 -- Um trabalho a preço fixo deixa de consumir a bolsa de horas da avença.
 if tg_op='UPDATE' and new.billing_scope='fixed_fee' and old.retainer_id is not null
  and new.retainer_id=old.retainer_id then
  new.retainer_id:=null;new.retainer_covered_minutes:=null;new.retainer_excess_minutes:=null;
 end if;
 if tg_op='UPDATE' and old.retainer_id is not null and new.retainer_id=old.retainer_id
  and (new.client_id is distinct from old.client_id or new.billing_entity_id is distinct from old.billing_entity_id
   or not exists(select 1 from public.client_retainers r where r.id=new.retainer_id
    and new.work_date>=r.starts_on and(r.ends_on is null or new.work_date<=r.ends_on))) then
  new.retainer_id:=null;new.retainer_covered_minutes:=null;new.retainer_excess_minutes:=null;
  new.billing_scope:='standard';new.is_billable:=true;
 end if;
 if new.retainer_id is not null and not exists(select 1 from public.client_retainers r
  where r.id=new.retainer_id and r.firm_id=new.firm_id and r.client_id=new.client_id
   and r.billing_entity_id=new.billing_entity_id)then
  raise exception 'A avença não pertence ao cliente e à sociedade deste movimento.' using errcode='42501';
 end if;
 return new;
end;$$;
create trigger aa_validate_retainer_work_link before insert or update on public.work_entries
 for each row execute function private.validate_retainer_work_link();

create function private.reprice_retainer_work(p_retainer_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare terms public.client_retainers; entry public.work_entries; period_start date; current_period date;
 used numeric:=0; covered numeric; excess numeric; amount numeric; target_scope text;
 previous_pricing text; previous_retainer text;
begin
 select * into terms from public.client_retainers where id=p_retainer_id;
 if terms.id is null then return;end if;
 if not pg_try_advisory_xact_lock(hashtextextended(p_retainer_id::text,0)) then
  raise exception 'O consumo da avença está a ser actualizado. Tente novamente.' using errcode='40001';
 end if;
 -- Evita esperar por outra linha mantendo um movimento bloqueado.
 -- Uma escrita concorrente faz rollback e pode ser repetida em segurança.
 begin
  perform 1 from public.work_entries w where w.firm_id=terms.firm_id and w.client_id=terms.client_id
   and w.billing_entity_id=terms.billing_entity_id and (w.retainer_id=terms.id or
    (w.billing_scope='retainer' and w.work_date>=terms.starts_on and (terms.ends_on is null or w.work_date<=terms.ends_on)))
   order by w.id for update nowait;
 exception when lock_not_available then
  raise exception 'O consumo da avença está a ser actualizado. Tente novamente.' using errcode='40001';
 end;
 previous_pricing:=current_setting('app.pricing_recalculation',true);
 previous_retainer:=current_setting('app.retainer_pricing',true);
 perform set_config('app.pricing_recalculation','on',true);
 perform set_config('app.retainer_pricing','on',true);
 if terms.billing_mode='retainer' then
  update public.work_entries w set retainer_id=null,retainer_covered_minutes=null,retainer_excess_minutes=null,
   billing_scope='retainer',charge_type='retainer',is_billable=false,effective_hourly_rate=null,
   calculated_hourly_rate=null,effective_amount=null,calculated_amount=null,pre_discount_amount=null,
   effective_discount_amount=null,calculated_discount_amount=null,discount_percentage=null,discount_reason=null
   where w.retainer_id=terms.id and not w.is_invoiced and not w.is_paid and not exists(
    select 1 from private.current_payment_notes()n cross join lateral jsonb_array_elements(n->'items')i where i->>'id'=w.id::text);
  perform set_config('app.retainer_pricing',coalesce(previous_retainer,''),true);
  perform set_config('app.pricing_recalculation',coalesce(previous_pricing,''),true);
  return;
 end if;
 for entry in select w.* from public.work_entries w where w.firm_id=terms.firm_id
  and w.client_id=terms.client_id and w.billing_entity_id=terms.billing_entity_id
  and(w.retainer_id=terms.id or(w.billing_scope='retainer' and w.work_date>=terms.starts_on
   and(terms.ends_on is null or w.work_date<=terms.ends_on)))
  order by w.work_date,w.created_at,w.id
 loop
  period_start:=(terms.starts_on+make_interval(months=>(
   greatest(0,(extract(year from age(entry.work_date,terms.starts_on))*12+
    extract(month from age(entry.work_date,terms.starts_on)))::integer)/terms.hours_interval_months)
    *terms.hours_interval_months))::date;
  if current_period is distinct from period_start then used:=0;current_period:=period_start;end if;
  if entry.status='cancelled' then covered:=0;excess:=0;
  else
   covered:=least(entry.duration_minutes,greatest(0,terms.included_hours*60-used));
   excess:=entry.duration_minutes-covered;used:=used+entry.duration_minutes;
  end if;
  -- Preserva os documentos e facturas já emitidos.
  if entry.is_invoiced or entry.is_paid or exists(
    select 1 from private.current_payment_notes()n
    cross join lateral jsonb_array_elements(n->'items')i where i->>'id'=entry.id::text
  ) then continue;end if;
  target_scope:=case when excess>0 then 'standard' else 'retainer' end;
  amount:=case when excess>0 then round(excess*terms.excess_hourly_rate/60,2)else null end;
  if (entry.retainer_id,entry.retainer_covered_minutes,entry.retainer_excess_minutes,
      entry.billing_scope,entry.effective_amount,entry.effective_hourly_rate)
    is distinct from (terms.id,covered,excess,target_scope,amount,
      case when excess>0 then terms.excess_hourly_rate else null end) then
   update public.work_entries set retainer_id=terms.id,retainer_covered_minutes=covered,
    retainer_excess_minutes=excess,billing_scope=target_scope,
    charge_type=case when excess>0 then 'hourly' else 'retainer' end,is_billable=excess>0,
    effective_hourly_rate=case when excess>0 then terms.excess_hourly_rate else null end,
    calculated_hourly_rate=case when excess>0 then terms.excess_hourly_rate else null end,
    specific_hourly_rate=null,imported_hourly_rate=null,pricing_rule_id=null,
    effective_amount=amount,calculated_amount=amount,pre_discount_amount=amount,
    imported_amount=null,manual_amount=null,effective_discount_amount=null,
    calculated_discount_amount=null,discount_percentage=null,discount_reason=null,
    currency=terms.currency,has_manual_override=false,last_calculated_at=now()
   where id=entry.id;
  end if;
 end loop;
 perform set_config('app.retainer_pricing',coalesce(previous_retainer,''),true);
 perform set_config('app.pricing_recalculation',coalesce(previous_pricing,''),true);
end;$$;

-- Os movimentos mantêm a duração real; cobra-se apenas retainer_excess_minutes.
create function private.refresh_retainer_work()
returns trigger language plpgsql security definer set search_path='' as $$
declare target_id uuid; prior_id uuid;
begin
 if coalesce(current_setting('app.retainer_pricing',true),'')='on' then return null;end if;
 if tg_table_name='client_retainers' then
  perform private.reprice_retainer_work(new.id);return null;
 end if;
 if tg_op<>'DELETE' then
  target_id:=new.retainer_id;
  if target_id is null and new.billing_scope='retainer' then
   select id into target_id from public.client_retainers r where r.firm_id=new.firm_id
    and r.client_id=new.client_id and r.billing_entity_id=new.billing_entity_id
    and r.active and r.billing_mode='retainer_plus_hours' and r.starts_on<=new.work_date
    and(r.ends_on is null or r.ends_on>=new.work_date);
  end if;
 end if;
 if tg_op<>'INSERT' then prior_id:=old.retainer_id;end if;
 if prior_id is not null and prior_id is distinct from target_id then
  perform private.reprice_retainer_work(prior_id);
 end if;
 if target_id is not null then perform private.reprice_retainer_work(target_id);end if;
 return null;
end;$$;
create trigger refresh_retainer_work after insert or delete or update of
 duration_minutes,work_date,client_id,billing_entity_id,billing_scope,status,
 effective_amount,effective_hourly_rate,effective_discount_amount,charge_type on public.work_entries
 for each row execute function private.refresh_retainer_work();
create trigger refresh_retainer_terms after update of
 billing_mode,excess_hourly_rate,included_hours,hours_interval_months,currency,starts_on,ends_on on public.client_retainers
 for each row execute function private.refresh_retainer_work();

revoke all on function private.reprice_retainer_work(uuid) from public,anon,authenticated;
CREATE OR REPLACE FUNCTION private.enforce_work_entry_billing_scope()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if coalesce(current_setting('app.retainer_pricing',true),'')='on' then return new;end if;
 if new.billing_scope='fixed_fee' then
  if not exists(select 1 from public.fixed_fee_jobs j where j.id=new.fixed_fee_job_id and j.firm_id=new.firm_id and j.client_id=new.client_id and j.status<>'cancelled' and (j.billing_entity_id is null or j.billing_entity_id is not distinct from new.billing_entity_id)) then raise exception 'invalid fixed fee job';end if;
  new.specific_hourly_rate:=null;new.imported_hourly_rate:=null;new.calculated_hourly_rate:=null;new.effective_hourly_rate:=null;
  new.pricing_rule_id:=null;new.charge_type:='fixed';new.pre_discount_amount:=null;new.calculated_discount_amount:=null;
  new.effective_discount_amount:=null;new.discount_percentage:=null;new.discount_reason:=null;new.calculated_amount:=null;
  new.imported_amount:=null;new.manual_amount:=null;new.effective_amount:=null;new.is_billable:=false;
  new.is_invoiced:=false;new.invoice_date:=null;new.is_paid:=false;new.status:=case when new.status='cancelled' then 'cancelled' else 'draft' end;new.has_historical_state_exception:=false;
 elsif new.billing_scope='retainer' then
  if not exists(select 1 from public.client_retainers r where r.firm_id=new.firm_id and r.client_id=new.client_id and r.active and r.starts_on<=new.work_date and(r.ends_on is null or r.ends_on>=new.work_date)) then raise exception 'client has no active retainer for work date';end if;
  new.specific_hourly_rate:=null;new.imported_hourly_rate:=null;new.calculated_hourly_rate:=null;new.effective_hourly_rate:=null;
  new.pricing_rule_id:=null;new.charge_type:='retainer';new.pre_discount_amount:=null;new.calculated_discount_amount:=null;
  new.effective_discount_amount:=null;new.discount_percentage:=null;new.discount_reason:=null;new.calculated_amount:=null;
  new.imported_amount:=null;new.manual_amount:=null;new.effective_amount:=null;new.is_billable:=false;
  new.is_invoiced:=false;new.invoice_date:=null;new.is_paid:=false;new.status:=case when new.status='cancelled' then 'cancelled' else 'draft' end;new.has_historical_state_exception:=false;
 elsif tg_op='UPDATE' and old.billing_scope in ('retainer','fixed_fee') and new.billing_scope='standard' then
  new.charge_type:='hourly';new.is_billable:=true;new.last_calculated_at:=null;
 end if;
 return new;
end;$function$;
revoke all on function private.refresh_retainer_work() from public,anon,authenticated;
revoke all on function private.validate_retainer_work_link() from public,anon,authenticated;

-- Os mapas contam também a duração completa dos movimentos com excedente.
do $$
declare signature regprocedure; definition text;
begin
 foreach signature in array array['public.get_client_retainer_summary(uuid)'::regprocedure,
  'public.get_retainer_management()'::regprocedure]loop
  definition:=pg_get_functiondef(signature);
  definition:=replace(definition,'w.billing_scope=''retainer''','(w.billing_scope=''retainer'' or w.retainer_id is not null)');
  definition:=replace(definition,'and billing_scope=''retainer''','and (billing_scope=''retainer'' or retainer_id is not null)');
  execute definition;
 end loop;
end;$$;
notify pgrst,'reload schema';
