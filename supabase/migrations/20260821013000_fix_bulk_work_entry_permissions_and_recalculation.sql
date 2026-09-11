-- Mantém as alterações em massa alinhadas com a edição individual:
-- o Operador justifica, o Administrador não, e dimensões de preço recalculam tudo.
create or replace function public.bulk_update_work_entries(
  p_work_entry_ids uuid[],p_action text,p_value jsonb,p_reason text
) returns integer
language plpgsql security definer set search_path=''
as $$
declare
  actor_id uuid:=(select auth.uid());
  entry public.work_entries%rowtype;
  affected integer:=0;
  target_id uuid;
  numeric_value numeric;
  target_date date;
  operator_requires_reason boolean;
  why text;
  pricing record;
begin
  if actor_id is null then raise exception 'authentication required' using errcode='28000'; end if;
  if coalesce(cardinality(p_work_entry_ids),0)=0 or cardinality(p_work_entry_ids)>10000 then
    raise exception 'between 1 and 10000 entries are required';
  end if;
  if p_action not in('responsible','matter','society','hourly_rate','discount','invoiced','paid','archive') then
    raise exception 'unsupported bulk action';
  end if;
  if (select count(distinct id) from public.work_entries where id=any(p_work_entry_ids))<>cardinality(p_work_entry_ids) then
    raise exception 'one or more entries do not exist';
  end if;

  for entry in select * from public.work_entries where id=any(p_work_entry_ids) order by id for update loop
    if not private.has_scope_access(entry.firm_id,entry.billing_entity_id,entry.client_id,entry.matter_id,'edit') then
      raise exception 'not authorized for all selected entries' using errcode='42501';
    end if;
    select coalesce(bool_or(role='operator'),false) into operator_requires_reason
      from public.firm_members where firm_id=entry.firm_id and user_id=actor_id and active;
    if operator_requires_reason and btrim(coalesce(p_reason,''))='' then raise exception 'reason is required'; end if;
    why:=coalesce(nullif(btrim(p_reason),''),'Alteração em massa por administrador');
    if p_action in('society','hourly_rate','discount','invoiced','paid')
      and not private.can_view_billing_financials(entry.firm_id,entry.billing_entity_id) then
      raise exception 'financial access required for all selected entries' using errcode='42501';
    end if;

    case p_action
      when 'responsible' then
        target_id:=(p_value#>>'{}')::uuid;
        perform public.update_work_entry_inline_audited(entry.id,'professional_id',target_id::text,why);
      when 'matter' then
        target_id:=nullif(p_value#>>'{}','')::uuid;
        if target_id is not null and not exists(
          select 1 from public.matters m where m.id=target_id and m.firm_id=entry.firm_id and m.client_id=entry.client_id
        ) then raise exception 'process does not belong to every selected client'; end if;
        update public.work_entries set matter_id=target_id,updated_by=actor_id where id=entry.id;
        insert into public.manual_overrides(firm_id,work_entry_id,field_name,previous_value,override_value,reason,created_by)
          values(entry.firm_id,entry.id,'bulk_matter',to_jsonb(entry.matter_id),to_jsonb(target_id),why,actor_id);
      when 'archive' then
        perform public.update_work_entry_inline_audited(entry.id,'archive_status',p_value#>>'{}',why);
      when 'society' then
        target_id:=(p_value#>>'{}')::uuid;
        if not private.can_view_billing_financials(entry.firm_id,target_id) then
          raise exception 'not authorized for target society' using errcode='42501';
        end if;
        perform public.update_work_entry_inline_audited(entry.id,'billing_entity_id',target_id::text,why);
      when 'hourly_rate' then
        numeric_value:=(p_value#>>'{}')::numeric;
        if numeric_value<0 then raise exception 'invalid hourly rate'; end if;
        perform public.update_work_entry_inline_audited(entry.id,'effective_hourly_rate',numeric_value::text,why);
      when 'discount' then
        numeric_value:=(p_value#>>'{}')::numeric;
        if numeric_value<0 then raise exception 'invalid discount'; end if;
        insert into public.manual_overrides(
          firm_id,work_entry_id,field_name,previous_value,calculated_value,override_value,reason,created_by
        ) values(
          entry.firm_id,entry.id,'effective_discount_amount',to_jsonb(entry.effective_discount_amount),
          to_jsonb(entry.calculated_discount_amount),to_jsonb(numeric_value),why,actor_id
        );
        perform set_config('app.pricing_recalculation','on',true);
        update public.work_entries set
          effective_discount_amount=numeric_value,
          effective_amount=round(greatest(0,coalesce(effective_hourly_rate,0)*duration_minutes::numeric/60-numeric_value),2),
          has_manual_override=true,calculation_version=calculation_version+1,last_calculated_at=now(),updated_by=actor_id
        where id=entry.id;
      when 'invoiced' then
        target_date:=nullif(p_value->>'date','')::date;
        if target_date is null then raise exception 'invoice date is required'; end if;
        perform public.update_work_entry_inline_audited(entry.id,'invoice_date',target_date::text,why);
      when 'paid' then
        perform public.update_work_entry_inline_audited(entry.id,'is_paid','true',why);
    end case;

    if p_action in('responsible','matter','society') then
      select * into pricing from private.calculate_work_entry(entry.id);
      perform set_config('app.pricing_recalculation','on',true);
      update public.work_entries set
        pricing_rule_id=pricing.pricing_rule_id,charge_type=pricing.charge_type,
        calculated_hourly_rate=pricing.hourly_rate,effective_hourly_rate=pricing.hourly_rate,
        pre_discount_amount=pricing.pre_discount_amount,
        calculated_discount_amount=pricing.discount_amount,effective_discount_amount=pricing.discount_amount,
        calculated_amount=pricing.proposed_amount,effective_amount=pricing.proposed_amount,
        currency=coalesce(pricing.currency,currency),calculation_version=calculation_version+1,
        last_calculated_at=now(),updated_by=actor_id
      where id=entry.id;
    end if;
    affected:=affected+1;
  end loop;
  return affected;
end;
$$;

revoke all on function public.bulk_update_work_entries(uuid[],text,jsonb,text) from public,anon;
grant execute on function public.bulk_update_work_entries(uuid[],text,jsonb,text) to authenticated;
notify pgrst,'reload schema';
