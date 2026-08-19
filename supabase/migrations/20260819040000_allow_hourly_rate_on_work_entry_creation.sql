drop function if exists public.create_work_entry(date,uuid,uuid,uuid,uuid,text,integer,text);

create function public.create_work_entry(
  p_work_date date,p_client_profile_id uuid,p_matter_id uuid,p_professional_id uuid,
  p_billing_entity_id uuid,p_activity_description text,p_duration_minutes integer,
  p_observations text default null,p_hourly_rate numeric default null
)
returns uuid language plpgsql security definer set search_path='' as $$
declare
 actor_id uuid:=auth.uid();target_firm_id uuid;target_client_id uuid;new_id uuid:=gen_random_uuid();
 selected_rule_id uuid;selected_charge_type text;selected_hourly_rate numeric;selected_fixed_amount numeric;selected_currency text;
 selected_discount_id uuid;selected_discount_type text;selected_discount_percentage numeric;selected_discount_fixed_amount numeric;selected_discount_reason text;
 base_amount numeric;discount_amount numeric;proposed_amount numeric;
begin
 if actor_id is null then raise exception 'authentication required' using errcode='28000';end if;
 select cp.firm_id,cp.client_id into target_firm_id,target_client_id from public.client_profiles cp where cp.id=p_client_profile_id and cp.active;
 if target_firm_id is null or p_work_date is null or coalesce(p_duration_minutes,0)<1 or btrim(coalesce(p_activity_description,''))='' or p_hourly_rate<0 then raise exception 'invalid work entry';end if;
 if not private.has_firm_role(target_firm_id,array['owner','admin','manager','billing','professional','operator']) or not private.has_scope_access(target_firm_id,p_billing_entity_id,target_client_id,p_matter_id,'edit') then raise exception 'not authorized' using errcode='42501';end if;
 if not exists(select 1 from public.professionals p where p.id=p_professional_id and p.firm_id=target_firm_id and p.active)then raise exception 'invalid responsible';end if;
 if p_billing_entity_id is not null and not exists(select 1 from public.billing_entities b where b.id=p_billing_entity_id and b.firm_id=target_firm_id and b.active)then raise exception 'invalid society';end if;
 if p_matter_id is not null and not exists(select 1 from public.matters m where m.id=p_matter_id and m.firm_id=target_firm_id and m.client_id=target_client_id)then raise exception 'invalid process';end if;
 select rule_id,charge_type,hourly_rate,fixed_amount,currency into selected_rule_id,selected_charge_type,selected_hourly_rate,selected_fixed_amount,selected_currency from private.resolve_rate_rule(target_firm_id,p_work_date,target_client_id,p_matter_id,p_professional_id,p_billing_entity_id,null);
 if p_hourly_rate is not null then selected_rule_id:=null;selected_charge_type:='hourly';selected_hourly_rate:=p_hourly_rate;selected_fixed_amount:=null;end if;
 base_amount:=case when selected_charge_type='hourly'then round(selected_hourly_rate*p_duration_minutes::numeric/60,2)when selected_charge_type in('fixed','retainer','hour_package','per_act','manual_negotiated')then selected_fixed_amount when selected_charge_type in('free','non_billable')then 0::numeric else null end;
 select d.id,d.discount_type,d.percentage,d.fixed_amount,d.reason into selected_discount_id,selected_discount_type,selected_discount_percentage,selected_discount_fixed_amount,selected_discount_reason from public.discounts d where d.firm_id=target_firm_id and d.active and d.valid_from<=p_work_date and(d.valid_until is null or d.valid_until>=p_work_date)and((d.scope_type='client'and d.client_id=target_client_id)or d.scope_type='period')order by case d.scope_type when'client'then 200 else 100 end desc,d.priority desc,d.created_at desc,d.id limit 1;
 if base_amount is not null then discount_amount:=0;end if;
 if base_amount is not null and selected_discount_id is not null then discount_amount:=case when selected_discount_type='percentage'then round(base_amount*selected_discount_percentage/100,2)else least(selected_discount_fixed_amount,base_amount)end;end if;
 proposed_amount:=case when base_amount is null then null else greatest(0,base_amount-coalesce(discount_amount,0))end;
 insert into public.work_entries(id,firm_id,work_date,client_id,client_profile_id,matter_id,professional_id,billing_entity_id,activity_description,duration_minutes,specific_hourly_rate,calculated_hourly_rate,effective_hourly_rate,pricing_rule_id,charge_type,pre_discount_amount,calculated_discount_amount,effective_discount_amount,discount_percentage,discount_reason,calculated_amount,effective_amount,currency,status,source_type,observations,created_by,last_calculated_at)
 values(new_id,target_firm_id,p_work_date,target_client_id,p_client_profile_id,p_matter_id,p_professional_id,p_billing_entity_id,btrim(p_activity_description),p_duration_minutes,p_hourly_rate,selected_hourly_rate,selected_hourly_rate,selected_rule_id,coalesce(selected_charge_type,'hourly'),base_amount,discount_amount,discount_amount,selected_discount_percentage,selected_discount_reason,proposed_amount,proposed_amount,coalesce(selected_currency,'EUR'),'draft','manual',nullif(btrim(coalesce(p_observations,'')),''),actor_id,now());
 return new_id;
end;$$;

revoke all on function public.create_work_entry(date,uuid,uuid,uuid,uuid,text,integer,text,numeric) from public,anon;
grant execute on function public.create_work_entry(date,uuid,uuid,uuid,uuid,text,integer,text,numeric) to authenticated;
