-- A ficha autorizada grava sem exigir lançamentos em manual_overrides.
-- Conserva as permissões e os guardas de notas/recebimentos existentes.
CREATE OR REPLACE FUNCTION private.has_current_override(target_work_entry_id uuid, target_field_name text, target_value jsonb)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (
    select 1 from public.manual_overrides mo
    where mo.work_entry_id = target_work_entry_id
      and mo.field_name = target_field_name
      and mo.override_value = coalesce(target_value,'null'::jsonb)
      and mo.reverted_at is null
      and mo.created_at >= transaction_timestamp()
  );
$function$;
CREATE OR REPLACE FUNCTION private.prepare_work_entry()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare is_recalculation boolean:=coalesce(current_setting('app.pricing_recalculation',true),'')='on';is_import_reconciliation boolean:=coalesce(current_setting('app.import_reconciliation',true),'')='on';society_only_operator_change boolean:=false;
 is_correction boolean:=coalesce(current_setting('app.work_entry_correction',true),'')='on';
begin
 if tg_op='INSERT' then
  if(new.imported_hourly_rate is not null or new.calculated_hourly_rate is not null or new.effective_hourly_rate is not null or new.calculated_amount is not null or new.effective_amount is not null or new.imported_amount is not null or new.manual_amount is not null or new.is_invoiced or new.is_paid)and not(private.has_scope_access(new.firm_id,new.billing_entity_id,new.client_id,new.matter_id,'edit')and private.can_view_billing_financials(new.firm_id,new.billing_entity_id))then raise exception 'financial values require edit and financial permission for the Society' using errcode='42501';end if;
  new.imported_duration_minutes:=coalesce(new.imported_duration_minutes,case when new.source_type in('xlsx','csv')then new.duration_minutes end);new.effective_hourly_rate:=coalesce(new.effective_hourly_rate,new.specific_hourly_rate,new.calculated_hourly_rate,new.imported_hourly_rate);new.calculated_amount:=coalesce(new.calculated_amount,round((new.duration_minutes::numeric/60)*new.calculated_hourly_rate,2));new.effective_amount:=coalesce(new.effective_amount,new.imported_amount,new.calculated_amount,round((new.duration_minutes::numeric/60)*new.effective_hourly_rate,2));return new;
 end if;
 society_only_operator_change:=new.billing_entity_id is distinct from old.billing_entity_id and private.has_firm_role(old.firm_id,array['operator']) and private.has_scope_access(old.firm_id,old.billing_entity_id,old.client_id,old.matter_id,'edit') and private.has_current_override(old.id,'billing_entity_id',to_jsonb(new.billing_entity_id)) and new.imported_hourly_rate is not distinct from old.imported_hourly_rate and new.calculated_hourly_rate is not distinct from old.calculated_hourly_rate and new.effective_hourly_rate is not distinct from old.effective_hourly_rate and new.calculated_amount is not distinct from old.calculated_amount and new.effective_amount is not distinct from old.effective_amount and new.effective_discount_amount is not distinct from old.effective_discount_amount and new.currency is not distinct from old.currency and new.is_invoiced is not distinct from old.is_invoiced and new.invoice_date is not distinct from old.invoice_date and new.is_paid is not distinct from old.is_paid;
 if(new.billing_entity_id is distinct from old.billing_entity_id or new.imported_hourly_rate is distinct from old.imported_hourly_rate or new.calculated_hourly_rate is distinct from old.calculated_hourly_rate or new.effective_hourly_rate is distinct from old.effective_hourly_rate or new.calculated_amount is distinct from old.calculated_amount or new.effective_amount is distinct from old.effective_amount or new.effective_discount_amount is distinct from old.effective_discount_amount or new.currency is distinct from old.currency or new.is_invoiced is distinct from old.is_invoiced or new.invoice_date is distinct from old.invoice_date or new.is_paid is distinct from old.is_paid)and not is_recalculation and not society_only_operator_change and not(private.has_scope_access(old.firm_id,old.billing_entity_id,old.client_id,old.matter_id,'edit')and private.can_view_billing_financials(old.firm_id,old.billing_entity_id)and(new.billing_entity_id is not distinct from old.billing_entity_id or private.can_view_billing_financials(old.firm_id,new.billing_entity_id)))then raise exception 'financial fields require edit and financial permission for the Society' using errcode='42501';end if;
 if new.duration_minutes is distinct from old.duration_minutes and not is_recalculation and not is_import_reconciliation and not is_correction and not private.has_current_override(old.id,'duration_minutes',to_jsonb(new.duration_minutes))then raise exception 'duration_minutes requires a matching manual override';end if;
 if new.effective_hourly_rate is distinct from old.effective_hourly_rate and not is_recalculation and not is_import_reconciliation and not is_correction and not private.has_current_override(old.id,'effective_hourly_rate',to_jsonb(new.effective_hourly_rate))then raise exception 'effective_hourly_rate requires a matching manual override';end if;
 if new.effective_discount_amount is distinct from old.effective_discount_amount and not is_recalculation and not is_import_reconciliation and not is_correction and not private.has_current_override(old.id,'effective_discount_amount',to_jsonb(new.effective_discount_amount))then raise exception 'effective_discount_amount requires a matching manual override';end if;
 if new.effective_amount is distinct from old.effective_amount and not is_recalculation and not is_import_reconciliation and not is_correction and not private.has_current_override(old.id,'effective_amount',to_jsonb(new.effective_amount))then raise exception 'effective_amount requires a matching manual override';end if;
 if new.billing_entity_id is distinct from old.billing_entity_id and not is_import_reconciliation and not is_correction and not private.has_current_override(old.id,'billing_entity_id',to_jsonb(new.billing_entity_id))then raise exception 'billing_entity_id requires a matching manual override';end if;
 if new.is_invoiced is distinct from old.is_invoiced and not is_import_reconciliation and not is_correction and not private.has_current_override(old.id,'is_invoiced',to_jsonb(new.is_invoiced))then raise exception 'is_invoiced requires a matching manual override';end if;
 if new.is_paid is distinct from old.is_paid and not is_import_reconciliation and not is_correction and not private.has_current_override(old.id,'is_paid',to_jsonb(new.is_paid))then raise exception 'is_paid requires a matching manual override';end if;return new;
end;$function$;

CREATE OR REPLACE FUNCTION private.update_work_entry_full(p_work_entry_id uuid, p_values jsonb, p_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare e public.work_entries%rowtype;target_client uuid;new_invoiced boolean;new_paid boolean;new_invoice_date date;why text;operator_requires_reason boolean; previous_correction text;
begin
 if auth.uid() is null then raise exception 'authentication required' using errcode='28000';end if;
 select * into e from public.work_entries where id=p_work_entry_id for update;
 if e.id is null then raise exception 'work entry not found';end if;
 if not private.has_scope_access(e.firm_id,e.billing_entity_id,e.client_id,e.matter_id,'edit')then raise exception 'not authorized' using errcode='42501';end if;
 select client_id into target_client from public.client_profiles where id=(p_values->>'client_profile_id')::uuid and firm_id=e.firm_id and active;
 select coalesce(bool_or(role='operator'),false) into operator_requires_reason from public.firm_members where firm_id=e.firm_id and user_id=auth.uid() and active;
 new_invoiced:=coalesce((p_values->>'is_invoiced')::boolean,false);new_paid:=coalesce((p_values->>'is_paid')::boolean,false);new_invoice_date:=nullif(p_values->>'invoice_date','')::date;why:=coalesce(nullif(btrim(p_reason),''),'Edição por administrador na ficha do movimento');
 if target_client is null or coalesce((p_values->>'duration_minutes')::integer,0)<0 or btrim(coalesce(p_values->>'activity_description',''))='' then raise exception 'invalid work entry';end if;
 if new_paid and not new_invoiced then raise exception 'paid movement must be invoiced';end if;
 if new_invoiced and new_invoice_date is null then raise exception 'invoice date required';end if;
 
 previous_correction:=current_setting('app.work_entry_correction',true);
 perform set_config('app.work_entry_correction','on',true);
 update public.work_entries set work_date=(p_values->>'work_date')::date,client_id=target_client,client_profile_id=(p_values->>'client_profile_id')::uuid,matter_id=nullif(p_values->>'matter_id','')::uuid,professional_id=(p_values->>'professional_id')::uuid,billing_entity_id=nullif(p_values->>'billing_entity_id','')::uuid,activity_description=btrim(p_values->>'activity_description'),observations=nullif(btrim(coalesce(p_values->>'observations','')),''),duration_minutes=(p_values->>'duration_minutes')::integer,effective_hourly_rate=nullif(p_values->>'effective_hourly_rate','')::numeric,effective_amount=nullif(p_values->>'effective_amount','')::numeric,currency=upper(p_values->>'currency'),status=p_values->>'status',is_billable=(p_values->>'is_billable')::boolean,is_invoiced=new_invoiced,invoice_date=case when new_invoiced then new_invoice_date else null end,is_paid=new_paid,archive_status=nullif(p_values->>'archive_status',''),charge_type=nullif(p_values->>'charge_type',''),effective_discount_amount=nullif(p_values->>'effective_discount_amount','')::numeric,discount_percentage=nullif(p_values->>'discount_percentage','')::numeric,discount_reason=nullif(btrim(coalesce(p_values->>'discount_reason','')),''),has_manual_override=true,updated_by=auth.uid()where id=e.id;
 perform set_config('app.work_entry_correction',coalesce(previous_correction,''),true);
end;
$function$;

CREATE OR REPLACE FUNCTION public.update_work_entry_full(p_work_entry_id uuid, p_values jsonb, p_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare previous public.work_entries%rowtype;current_entry public.work_entries%rowtype;operator_requires_reason boolean;rate_changed boolean;dimensions_changed boolean;discount_changed boolean;pricing record;base_amount numeric;discount_amount numeric;final_amount numeric;previous_recalculation text;
begin
 select * into previous from public.work_entries where id=p_work_entry_id;
 select coalesce(bool_or(role='operator'),false) into operator_requires_reason from public.firm_members where firm_id=previous.firm_id and user_id=auth.uid() and active;
 
 rate_changed:=nullif(p_values->>'effective_hourly_rate','')::numeric is distinct from previous.effective_hourly_rate;
 discount_changed:=nullif(p_values->>'effective_discount_amount','')::numeric is distinct from previous.effective_discount_amount or nullif(p_values->>'discount_percentage','')::numeric is distinct from previous.discount_percentage;
 dimensions_changed:=(p_values->>'work_date')::date is distinct from previous.work_date or nullif(p_values->>'client_profile_id','')::uuid is distinct from previous.client_profile_id or nullif(p_values->>'matter_id','')::uuid is distinct from previous.matter_id or nullif(p_values->>'professional_id','')::uuid is distinct from previous.professional_id or nullif(p_values->>'billing_entity_id','')::uuid is distinct from previous.billing_entity_id;
 if rate_changed then p_values:=jsonb_set(p_values,'{charge_type}',to_jsonb('hourly'::text),true);end if;
 perform private.update_work_entry_full(p_work_entry_id,p_values,p_reason);
 select * into current_entry from public.work_entries where id=p_work_entry_id;
 if current_entry.billing_scope<>'standard' or to_jsonb(current_entry)->>'retainer_id' is not null then return;end if;
 previous_recalculation:=current_setting('app.pricing_recalculation',true);
 perform set_config('app.pricing_recalculation','on',true);
 if dimensions_changed and not rate_changed then
  select * into pricing from private.calculate_work_entry(p_work_entry_id);
  update public.work_entries set pricing_rule_id=pricing.pricing_rule_id,charge_type=pricing.charge_type,calculated_hourly_rate=pricing.hourly_rate,effective_hourly_rate=pricing.hourly_rate,pre_discount_amount=pricing.pre_discount_amount,calculated_discount_amount=pricing.discount_amount,effective_discount_amount=pricing.discount_amount,calculated_amount=pricing.proposed_amount,effective_amount=pricing.proposed_amount,currency=coalesce(pricing.currency,currency),calculation_version=calculation_version+1,last_calculated_at=now(),updated_by=auth.uid() where id=p_work_entry_id;
 elsif rate_changed or discount_changed or current_entry.duration_minutes is distinct from previous.duration_minutes or current_entry.charge_type is distinct from previous.charge_type then
  base_amount:=case when current_entry.charge_type in('free','non_billable')then 0 when current_entry.charge_type in('fixed','retainer','hour_package','per_act','manual_negotiated')then coalesce(current_entry.pre_discount_amount,current_entry.effective_amount+coalesce(current_entry.effective_discount_amount,0)) when current_entry.effective_hourly_rate is null then null else round(current_entry.effective_hourly_rate*current_entry.duration_minutes::numeric/60,2)end;
  discount_amount:=case when current_entry.discount_percentage is not null then round(coalesce(base_amount,0)*current_entry.discount_percentage/100,2)else coalesce(current_entry.effective_discount_amount,0)end;
  final_amount:=case when base_amount is null then null else round(greatest(0,base_amount-discount_amount),2)end;
  update public.work_entries set pre_discount_amount=base_amount,calculated_discount_amount=discount_amount,effective_discount_amount=discount_amount,calculated_amount=final_amount,effective_amount=final_amount,calculation_version=calculation_version+1,last_calculated_at=now(),updated_by=auth.uid() where id=p_work_entry_id;
 end if;
 perform set_config('app.pricing_recalculation',coalesce(previous_recalculation,''),true);
end;$function$;

notify pgrst,'reload schema';

create or replace function public.set_work_entry_billing_scope(p_work_entry_id uuid,p_billing_scope text,p_reason text default null)
returns void language plpgsql security definer set search_path='' as $$
declare entry public.work_entries;
begin
 if auth.uid() is null then raise exception 'authentication required' using errcode='28000';end if;
 select * into entry from public.work_entries where id=p_work_entry_id for update;
 if entry.id is null or not private.has_scope_access(entry.firm_id,entry.billing_entity_id,entry.client_id,entry.matter_id,'edit') then raise exception 'not authorized' using errcode='42501';end if;
 if p_billing_scope not in('standard','retainer')then raise exception 'invalid billing scope';end if;
 update public.work_entries set billing_scope=p_billing_scope where id=entry.id;
end;$$;

CREATE OR REPLACE FUNCTION public.update_work_entry_with_allocation(p_work_entry_id uuid, p_values jsonb, p_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare entry public.work_entries;referrer text;other_name text;target_society uuid;target_scope text;
begin
 if auth.uid() is null then raise exception 'authentication required' using errcode='28000';end if;
 select * into entry from public.work_entries where id=p_work_entry_id for update;
 if entry.id is null or not private.has_scope_access(entry.firm_id,entry.billing_entity_id,entry.client_id,entry.matter_id,'edit') then raise exception 'not authorized' using errcode='42501';end if;
 target_society:=nullif(p_values->>'billing_entity_id','')::uuid;
 if target_society is not null and not exists(select 1 from public.billing_entities where id=target_society and firm_id=entry.firm_id) then raise exception 'invalid society';end if;
 if not private.has_scope_access(entry.firm_id,target_society,entry.client_id,entry.matter_id,'edit') then raise exception 'not authorized' using errcode='42501';end if;
 referrer:=case when p_values?'task_referrer' then nullif(p_values->>'task_referrer','') else entry.task_referrer end;
 other_name:=case when referrer='other' then nullif(btrim(coalesce(p_values->>'task_referrer_other',entry.task_referrer_other)),'') else null end;
 if private.is_legalteam(target_society) and referrer is null then raise exception 'Indique o angariador da tarefa.';end if;
 target_scope:=coalesce(p_values->>'billing_scope',entry.billing_scope);
 if target_scope not in('standard','retainer','fixed_fee') then raise exception 'invalid billing scope';end if;
 if entry.billing_scope='retainer' and target_scope='standard' then perform public.set_work_entry_billing_scope(p_work_entry_id,'standard',null);end if;
 perform public.update_work_entry_full(p_work_entry_id,p_values,p_reason);
 if target_scope='retainer' and entry.billing_scope<>'retainer' then perform public.set_work_entry_billing_scope(p_work_entry_id,'retainer',null);end if;
 update public.work_entries set task_referrer=referrer,task_referrer_other=other_name where id=p_work_entry_id;
end;$function$;
notify pgrst,'reload schema';
