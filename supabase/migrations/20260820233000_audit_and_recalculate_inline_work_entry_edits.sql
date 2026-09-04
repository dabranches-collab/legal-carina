-- Centraliza todas as edições em linha, exige motivo ao Operador e recalcula
-- os valores dependentes da duração, valor/hora e dimensões do preçário.
create or replace function public.update_work_entry_inline_audited(
  p_work_entry_id uuid,
  p_field text,
  p_value text,
  p_reason text
) returns void
language plpgsql
security definer
set search_path=''
as $$
declare
  entry public.work_entries%rowtype;
  previous_data jsonb;
  operator_requires_reason boolean;
  why text;
  pricing record;
  base_amount numeric;
  discount_amount numeric;
  final_amount numeric;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode='28000'; end if;
  select * into entry from public.work_entries where id=p_work_entry_id for update;
  if entry.id is null then raise exception 'work entry not found'; end if;
  if not private.has_scope_access(entry.firm_id,entry.billing_entity_id,entry.client_id,entry.matter_id,'edit') then
    raise exception 'not authorized' using errcode='42501';
  end if;
  select coalesce(bool_or(role='operator'),false) into operator_requires_reason
  from public.firm_members where firm_id=entry.firm_id and user_id=auth.uid() and active;
  if operator_requires_reason and btrim(coalesce(p_reason,''))='' then raise exception 'override reason required'; end if;
  why:=coalesce(nullif(btrim(p_reason),''),'Edição em linha por administrador');
  previous_data:=to_jsonb(entry);

  case p_field
    when 'invoice_number' then
      perform public.update_work_entry_invoice_number(p_work_entry_id,p_value);
    when 'invoice_date' then
      perform public.update_work_entry_invoice_date(p_work_entry_id,nullif(p_value,'')::date);
    when 'collection_status' then
      perform public.update_work_entry_collection_status(p_work_entry_id,p_value);
    else
      perform public.update_work_entry_inline(p_work_entry_id,p_field,p_value);
  end case;

  insert into public.manual_overrides(
    firm_id,work_entry_id,field_name,previous_value,calculated_value,override_value,reason,created_by
  ) values (
    entry.firm_id,entry.id,'inline_'||p_field,previous_data,null,to_jsonb(p_value),why,auth.uid()
  );

  perform set_config('app.pricing_recalculation','on',true);
  if p_field in('work_date','client_profile_id','professional_id','billing_entity_id') then
    select * into pricing from private.calculate_work_entry(p_work_entry_id);
    update public.work_entries set
      pricing_rule_id=pricing.pricing_rule_id,
      charge_type=pricing.charge_type,
      calculated_hourly_rate=pricing.hourly_rate,
      effective_hourly_rate=pricing.hourly_rate,
      pre_discount_amount=pricing.pre_discount_amount,
      calculated_discount_amount=pricing.discount_amount,
      effective_discount_amount=pricing.discount_amount,
      calculated_amount=pricing.proposed_amount,
      effective_amount=pricing.proposed_amount,
      currency=coalesce(pricing.currency,currency),
      calculation_version=calculation_version+1,
      last_calculated_at=now(),updated_by=auth.uid()
    where id=p_work_entry_id;
  elsif p_field in('duration_minutes','effective_hourly_rate') then
    select * into entry from public.work_entries where id=p_work_entry_id;
    base_amount:=case
      when entry.charge_type in('free','non_billable') then 0
      when entry.charge_type in('fixed','retainer','hour_package','per_act','manual_negotiated') then coalesce(entry.pre_discount_amount,entry.effective_amount+coalesce(entry.effective_discount_amount,0))
      when entry.effective_hourly_rate is null then null
      else round(entry.effective_hourly_rate*entry.duration_minutes::numeric/60,2)
    end;
    discount_amount:=case when entry.discount_percentage is not null
      then round(coalesce(base_amount,0)*entry.discount_percentage/100,2)
      else coalesce(entry.effective_discount_amount,0) end;
    final_amount:=case when base_amount is null then null else round(greatest(0,base_amount-discount_amount),2) end;
    update public.work_entries set
      charge_type=case when p_field='effective_hourly_rate' and effective_hourly_rate is not null then 'hourly' else charge_type end,
      pre_discount_amount=base_amount,
      calculated_discount_amount=discount_amount,
      effective_discount_amount=discount_amount,
      calculated_amount=final_amount,
      effective_amount=final_amount,
      calculation_version=calculation_version+1,
      last_calculated_at=now(),updated_by=auth.uid()
    where id=p_work_entry_id;
  end if;
end;
$$;

revoke all on function public.update_work_entry_inline_audited(uuid,text,text,text) from public,anon;
grant execute on function public.update_work_entry_inline_audited(uuid,text,text,text) to authenticated;

-- Impede que um cliente autenticado contorne a auditoria chamando os RPC antigos.
revoke execute on function public.update_work_entry_inline(uuid,text,text) from authenticated;
revoke execute on function public.update_work_entry_invoice_number(uuid,text) from authenticated;
revoke execute on function public.update_work_entry_invoice_date(uuid,date) from authenticated;
revoke execute on function public.update_work_entry_collection_status(uuid,text) from authenticated;

notify pgrst,'reload schema';
