-- Preserva integralmente o tratamento financeiro de um registo enquanto este
-- pertence a um trabalho a preço fixo e repõe-o quando a associação termina.
create or replace function public.assign_work_entry_fixed_fee(
 p_work_entry_id uuid,
 p_fixed_fee_job_id uuid,
 p_reason text default null
)
returns void
language plpgsql
security definer
set search_path=''
as $$
declare
 entry public.work_entries;
 job public.fixed_fee_jobs;
 snapshot_id uuid;
 snapshot jsonb;
 legacy_rate numeric;
 legacy_amount numeric;
begin
 if auth.uid() is null then
  raise exception 'authentication required' using errcode='28000';
 end if;

 select * into entry from public.work_entries where id=p_work_entry_id for update;
 if entry.id is null
  or not private.has_scope_access(entry.firm_id,entry.billing_entity_id,entry.client_id,entry.matter_id,'edit')
  or not private.has_firm_role(entry.firm_id,array['owner','admin','billing']) then
  raise exception 'not authorized' using errcode='42501';
 end if;
 if entry.is_invoiced or entry.is_paid or exists(select 1 from public.invoice_lines where work_entry_id=entry.id) then
  raise exception 'already invoiced work cannot be reassigned';
 end if;

 if p_fixed_fee_job_id is not null then
  select * into job from public.fixed_fee_jobs where id=p_fixed_fee_job_id;
  if job.id is null or job.firm_id<>entry.firm_id or job.client_id<>entry.client_id or job.status='cancelled'
   or (job.billing_entity_id is not null and job.billing_entity_id is distinct from entry.billing_entity_id)
   or not private.has_scope_access(job.firm_id,job.billing_entity_id,job.client_id,null,'edit')
   or not private.can_view_billing_financials(job.firm_id,job.billing_entity_id) then
   raise exception 'invalid fixed fee job or access' using errcode='42501';
  end if;

  if entry.billing_scope='fixed_fee' and entry.fixed_fee_job_id is not distinct from job.id then
   return;
  end if;

  -- Ao mudar directamente entre trabalhos, o retrato original mantém-se.
  if entry.billing_scope<>'fixed_fee' then
   insert into public.manual_overrides(
    firm_id,work_entry_id,field_name,previous_value,calculated_value,override_value,reason,created_by
   ) values (
    entry.firm_id,entry.id,'fixed_fee_billing_snapshot',
    jsonb_build_object(
     'specific_hourly_rate',entry.specific_hourly_rate,
     'imported_hourly_rate',entry.imported_hourly_rate,
     'calculated_hourly_rate',entry.calculated_hourly_rate,
     'effective_hourly_rate',entry.effective_hourly_rate,
     'pricing_rule_id',entry.pricing_rule_id,
     'charge_type',entry.charge_type,
     'pre_discount_amount',entry.pre_discount_amount,
     'calculated_discount_amount',entry.calculated_discount_amount,
     'effective_discount_amount',entry.effective_discount_amount,
     'discount_percentage',entry.discount_percentage,
     'discount_reason',entry.discount_reason,
     'calculated_amount',entry.calculated_amount,
     'imported_amount',entry.imported_amount,
     'manual_amount',entry.manual_amount,
     'effective_amount',entry.effective_amount,
     'is_billable',entry.is_billable,
     'is_invoiced',entry.is_invoiced,
     'invoice_date',entry.invoice_date,
     'is_paid',entry.is_paid,
     'status',entry.status,
     'has_historical_state_exception',entry.has_historical_state_exception,
     'calculation_version',entry.calculation_version,
     'last_calculated_at',entry.last_calculated_at
    ),null,to_jsonb(job.id),
    'Estado financeiro preservado antes do preço fixo',auth.uid()
   );
  end if;

  update public.work_entries
  set fixed_fee_job_id=job.id,billing_scope='fixed_fee'
  where id=entry.id;

  insert into public.manual_overrides(
   firm_id,work_entry_id,field_name,previous_value,calculated_value,override_value,reason,created_by
  ) values (
   entry.firm_id,entry.id,'fixed_fee_job_id',to_jsonb(entry.fixed_fee_job_id),null,to_jsonb(job.id),
   coalesce(nullif(btrim(p_reason),''),'Associação a trabalho de preço fixo'),auth.uid()
  );
  return;
 end if;

 if entry.billing_scope<>'fixed_fee' then return; end if;

 select mo.id,mo.previous_value into snapshot_id,snapshot
 from public.manual_overrides mo
 where mo.work_entry_id=entry.id
  and mo.field_name='fixed_fee_billing_snapshot'
  and mo.reverted_at is null
 order by mo.created_at desc,mo.id desc
 limit 1;

 update public.work_entries
 set fixed_fee_job_id=null,billing_scope='standard'
 where id=entry.id;

 -- O histórico anterior à existência do retrato completo permite recuperar
 -- registos que já tinham sido associados pela primeira versão do módulo.
 select (mo.previous_value #>> '{}')::numeric into legacy_rate
 from public.manual_overrides mo
 where mo.work_entry_id=entry.id and mo.field_name='effective_hourly_rate'
  and mo.previous_value is not null and mo.previous_value<>'null'::jsonb
 order by mo.created_at desc,mo.id desc limit 1;
 select (mo.previous_value #>> '{}')::numeric into legacy_amount
 from public.manual_overrides mo
 where mo.work_entry_id=entry.id and mo.field_name='effective_amount'
  and mo.previous_value is not null and mo.previous_value<>'null'::jsonb
 order by mo.created_at desc,mo.id desc limit 1;

 if snapshot_id is not null then
  if nullif(snapshot->>'effective_hourly_rate','')::numeric is distinct from entry.effective_hourly_rate then
   insert into public.manual_overrides(firm_id,work_entry_id,field_name,previous_value,calculated_value,override_value,reason,created_by)
   values(entry.firm_id,entry.id,'effective_hourly_rate',to_jsonb(entry.effective_hourly_rate),null,coalesce(to_jsonb(nullif(snapshot->>'effective_hourly_rate','')::numeric),'null'::jsonb),'Reposição automática após preço fixo',auth.uid());
  end if;
  if nullif(snapshot->>'effective_discount_amount','')::numeric is distinct from entry.effective_discount_amount then
   insert into public.manual_overrides(firm_id,work_entry_id,field_name,previous_value,calculated_value,override_value,reason,created_by)
   values(entry.firm_id,entry.id,'effective_discount_amount',to_jsonb(entry.effective_discount_amount),null,coalesce(to_jsonb(nullif(snapshot->>'effective_discount_amount','')::numeric),'null'::jsonb),'Reposição automática após preço fixo',auth.uid());
  end if;
  if nullif(snapshot->>'effective_amount','')::numeric is distinct from entry.effective_amount then
   insert into public.manual_overrides(firm_id,work_entry_id,field_name,previous_value,calculated_value,override_value,reason,created_by)
   values(entry.firm_id,entry.id,'effective_amount',to_jsonb(entry.effective_amount),null,coalesce(to_jsonb(nullif(snapshot->>'effective_amount','')::numeric),'null'::jsonb),'Reposição automática após preço fixo',auth.uid());
  end if;
  update public.work_entries set
   specific_hourly_rate=nullif(snapshot->>'specific_hourly_rate','')::numeric,
   imported_hourly_rate=nullif(snapshot->>'imported_hourly_rate','')::numeric,
   calculated_hourly_rate=nullif(snapshot->>'calculated_hourly_rate','')::numeric,
   effective_hourly_rate=nullif(snapshot->>'effective_hourly_rate','')::numeric,
   pricing_rule_id=nullif(snapshot->>'pricing_rule_id','')::uuid,
   charge_type=nullif(snapshot->>'charge_type',''),
   pre_discount_amount=nullif(snapshot->>'pre_discount_amount','')::numeric,
   calculated_discount_amount=nullif(snapshot->>'calculated_discount_amount','')::numeric,
   effective_discount_amount=nullif(snapshot->>'effective_discount_amount','')::numeric,
   discount_percentage=nullif(snapshot->>'discount_percentage','')::numeric,
   discount_reason=nullif(snapshot->>'discount_reason',''),
   calculated_amount=nullif(snapshot->>'calculated_amount','')::numeric,
   imported_amount=nullif(snapshot->>'imported_amount','')::numeric,
   manual_amount=nullif(snapshot->>'manual_amount','')::numeric,
   effective_amount=nullif(snapshot->>'effective_amount','')::numeric,
   is_billable=coalesce((snapshot->>'is_billable')::boolean,true),
   is_invoiced=coalesce((snapshot->>'is_invoiced')::boolean,false),
   invoice_date=nullif(snapshot->>'invoice_date','')::date,
   is_paid=coalesce((snapshot->>'is_paid')::boolean,false),
   status=coalesce(nullif(snapshot->>'status',''),'draft'),
   has_historical_state_exception=coalesce((snapshot->>'has_historical_state_exception')::boolean,false),
   calculation_version=coalesce((snapshot->>'calculation_version')::integer,calculation_version),
   last_calculated_at=nullif(snapshot->>'last_calculated_at','')::timestamptz
  where id=entry.id;
  if (snapshot->>'effective_hourly_rate') is null and legacy_rate is not null
   or (snapshot->>'effective_amount') is null and legacy_amount is not null then
   if legacy_rate is distinct from entry.effective_hourly_rate then
    insert into public.manual_overrides(firm_id,work_entry_id,field_name,previous_value,calculated_value,override_value,reason,created_by)
    values(entry.firm_id,entry.id,'effective_hourly_rate',to_jsonb(entry.effective_hourly_rate),null,to_jsonb(legacy_rate),'Reposição automática após preço fixo',auth.uid());
   end if;
   if legacy_amount is distinct from entry.effective_amount then
    insert into public.manual_overrides(firm_id,work_entry_id,field_name,previous_value,calculated_value,override_value,reason,created_by)
    values(entry.firm_id,entry.id,'effective_amount',to_jsonb(entry.effective_amount),null,to_jsonb(legacy_amount),'Reposição automática após preço fixo',auth.uid());
   end if;
   update public.work_entries set
    imported_hourly_rate=coalesce(legacy_rate,imported_hourly_rate),
    effective_hourly_rate=coalesce(legacy_rate,effective_hourly_rate),
    imported_amount=coalesce(legacy_amount,imported_amount),
    effective_amount=coalesce(legacy_amount,effective_amount),
    charge_type=coalesce(charge_type,'hourly')
   where id=entry.id;
  end if;
 else
  -- Compatibilidade com associações efectuadas antes desta correcção.
  if legacy_rate is not null or legacy_amount is not null then
   if legacy_rate is distinct from entry.effective_hourly_rate then
    insert into public.manual_overrides(firm_id,work_entry_id,field_name,previous_value,calculated_value,override_value,reason,created_by)
    values(entry.firm_id,entry.id,'effective_hourly_rate',to_jsonb(entry.effective_hourly_rate),null,to_jsonb(legacy_rate),'Reposição automática após preço fixo',auth.uid());
   end if;
   if legacy_amount is distinct from entry.effective_amount then
    insert into public.manual_overrides(firm_id,work_entry_id,field_name,previous_value,calculated_value,override_value,reason,created_by)
    values(entry.firm_id,entry.id,'effective_amount',to_jsonb(entry.effective_amount),null,to_jsonb(legacy_amount),'Reposição automática após preço fixo',auth.uid());
   end if;
   update public.work_entries set
    imported_hourly_rate=coalesce(legacy_rate,imported_hourly_rate),
    effective_hourly_rate=coalesce(legacy_rate,effective_hourly_rate),
    imported_amount=coalesce(legacy_amount,imported_amount),
    effective_amount=coalesce(legacy_amount,effective_amount),
   charge_type=coalesce(charge_type,'hourly')
   where id=entry.id;
  else
   update public.manual_overrides set reverted_by=auth.uid(),reverted_at=now()
   where work_entry_id=entry.id and reverted_at is null and field_name in ('fixed_fee_billing_snapshot','fixed_fee_job_id');
   perform private.recalculate_work_entries(array[entry.id],false,true);
  end if;
 end if;

 -- As marcas técnicas do período a preço fixo deixam de ser overrides activos.
 update public.manual_overrides set reverted_by=auth.uid(),reverted_at=now()
 where work_entry_id=entry.id and reverted_at is null and (
  field_name in ('fixed_fee_billing_snapshot','fixed_fee_job_id')
  or (field_name in ('effective_hourly_rate','effective_amount')
      and reason='Valor anterior substituído pelo preço fixo do trabalho')
  or reason='Reposição automática após preço fixo'
 );
end;
$$;

revoke all on function public.assign_work_entry_fixed_fee(uuid,uuid,text) from public,anon;
grant execute on function public.assign_work_entry_fixed_fee(uuid,uuid,text) to authenticated;
