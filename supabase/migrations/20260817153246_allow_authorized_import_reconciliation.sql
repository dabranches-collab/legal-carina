-- Source reconciliation is neither a pricing recalculation nor a manual override.
-- Permit source-owned fields to change inside the authenticated import transaction.

create or replace function private.prepare_work_entry()
returns trigger
language plpgsql
set search_path=''
as $$
declare
  is_recalculation boolean:=coalesce(current_setting('app.pricing_recalculation',true),'')='on';
  is_import_reconciliation boolean:=coalesce(current_setting('app.import_reconciliation',true),'')='on';
begin
 if tg_op='INSERT' then
  if(new.imported_hourly_rate is not null or new.calculated_hourly_rate is not null or new.effective_hourly_rate is not null or new.calculated_amount is not null or new.effective_amount is not null or new.imported_amount is not null or new.manual_amount is not null or new.is_invoiced or new.is_paid)
    and not(private.has_scope_access(new.firm_id,new.billing_entity_id,new.client_id,new.matter_id,'edit') and private.can_view_billing_financials(new.firm_id,new.billing_entity_id))then
    raise exception 'financial values require edit and financial permission for the Society' using errcode='42501';
  end if;
  new.imported_duration_minutes:=coalesce(new.imported_duration_minutes,case when new.source_type in('xlsx','csv')then new.duration_minutes end);
  new.effective_hourly_rate:=coalesce(new.effective_hourly_rate,new.specific_hourly_rate,new.calculated_hourly_rate,new.imported_hourly_rate);
  new.calculated_amount:=coalesce(new.calculated_amount,round((new.duration_minutes::numeric/60)*new.calculated_hourly_rate,2));
  new.effective_amount:=coalesce(new.effective_amount,new.imported_amount,new.calculated_amount,round((new.duration_minutes::numeric/60)*new.effective_hourly_rate,2));
  return new;
 end if;
 if(new.billing_entity_id is distinct from old.billing_entity_id or new.imported_hourly_rate is distinct from old.imported_hourly_rate or new.calculated_hourly_rate is distinct from old.calculated_hourly_rate or new.effective_hourly_rate is distinct from old.effective_hourly_rate or new.calculated_amount is distinct from old.calculated_amount or new.effective_amount is distinct from old.effective_amount or new.effective_discount_amount is distinct from old.effective_discount_amount or new.currency is distinct from old.currency or new.is_invoiced is distinct from old.is_invoiced or new.invoice_date is distinct from old.invoice_date or new.is_paid is distinct from old.is_paid)
 and not(private.has_scope_access(old.firm_id,old.billing_entity_id,old.client_id,old.matter_id,'edit') and private.can_view_billing_financials(old.firm_id,old.billing_entity_id) and(new.billing_entity_id is not distinct from old.billing_entity_id or private.can_view_billing_financials(old.firm_id,new.billing_entity_id)))then
  raise exception 'financial fields require edit and financial permission for the Society' using errcode='42501';
 end if;
 if is_recalculation and old.has_manual_override then raise exception 'recalculation cannot replace a manual override';end if;
 if new.duration_minutes is distinct from old.duration_minutes and not is_recalculation and not is_import_reconciliation and not private.has_current_override(old.id,'duration_minutes',to_jsonb(new.duration_minutes))then raise exception 'duration_minutes requires a matching manual override';end if;
 if new.effective_hourly_rate is distinct from old.effective_hourly_rate and not is_recalculation and not is_import_reconciliation and not private.has_current_override(old.id,'effective_hourly_rate',to_jsonb(new.effective_hourly_rate))then raise exception 'effective_hourly_rate requires a matching manual override';end if;
 if new.effective_discount_amount is distinct from old.effective_discount_amount and not is_recalculation and not is_import_reconciliation and not private.has_current_override(old.id,'effective_discount_amount',to_jsonb(new.effective_discount_amount))then raise exception 'effective_discount_amount requires a matching manual override';end if;
 if new.effective_amount is distinct from old.effective_amount and not is_recalculation and not is_import_reconciliation and not private.has_current_override(old.id,'effective_amount',to_jsonb(new.effective_amount))then raise exception 'effective_amount requires a matching manual override';end if;
 if new.billing_entity_id is distinct from old.billing_entity_id and not is_import_reconciliation and not private.has_current_override(old.id,'billing_entity_id',to_jsonb(new.billing_entity_id))then raise exception 'billing_entity_id requires a matching manual override';end if;
 if new.is_invoiced is distinct from old.is_invoiced and not is_import_reconciliation and not private.has_current_override(old.id,'is_invoiced',to_jsonb(new.is_invoiced))then raise exception 'is_invoiced requires a matching manual override';end if;
 if new.is_paid is distinct from old.is_paid and not is_import_reconciliation and not private.has_current_override(old.id,'is_paid',to_jsonb(new.is_paid))then raise exception 'is_paid requires a matching manual override';end if;
 return new;
end;$$;

create or replace function public.commit_validated_import(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
set statement_timeout = '300s'
as $$
declare filtered_payload jsonb;
begin
  filtered_payload := jsonb_set(
    p_payload,
    '{clientDirectory}',
    coalesce((select jsonb_agg(item) from jsonb_array_elements(coalesce(p_payload->'clientDirectory','[]'::jsonb)) item where item->>'clientType' in ('individual','company')),'[]'::jsonb),
    true
  );
  perform set_config('app.import_reconciliation','on',true);
  return public.commit_validated_import_unfiltered(filtered_payload);
end;
$$;

revoke all on function public.commit_validated_import(jsonb) from public, anon;
grant execute on function public.commit_validated_import(jsonb) to authenticated;
