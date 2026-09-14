create or replace function private.update_work_entry_full(p_work_entry_id uuid,p_values jsonb,p_reason text)
returns void language plpgsql security definer set search_path='' as $$
declare e public.work_entries%rowtype;target_client uuid;new_invoiced boolean;new_paid boolean;new_invoice_date date;why text;
begin
 if auth.uid() is null then raise exception 'authentication required' using errcode='28000';end if;
 select * into e from public.work_entries where id=p_work_entry_id for update;
 if e.id is null then raise exception 'work entry not found';end if;
 if not private.has_scope_access(e.firm_id,e.billing_entity_id,e.client_id,e.matter_id,'edit')then raise exception 'not authorized' using errcode='42501';end if;
 select client_id into target_client from public.client_profiles where id=(p_values->>'client_profile_id')::uuid and firm_id=e.firm_id and active;
 new_invoiced:=coalesce((p_values->>'is_invoiced')::boolean,false);new_paid:=coalesce((p_values->>'is_paid')::boolean,false);new_invoice_date:=nullif(p_values->>'invoice_date','')::date;why:=coalesce(nullif(btrim(p_reason),''),'Edição na ficha do movimento');
 if target_client is null or coalesce((p_values->>'duration_minutes')::integer,0)<0 or btrim(coalesce(p_values->>'activity_description',''))='' then raise exception 'invalid work entry';end if;
 if new_paid and not new_invoiced then raise exception 'paid movement must be invoiced';end if;
 if new_invoiced and new_invoice_date is null then raise exception 'invoice date required';end if;
 if (nullif(p_values->>'effective_hourly_rate','')::numeric is distinct from e.effective_hourly_rate or nullif(p_values->>'effective_amount','')::numeric is distinct from e.effective_amount)and btrim(coalesce(p_reason,''))=''then raise exception 'override reason required';end if;
 insert into public.manual_overrides(firm_id,work_entry_id,field_name,previous_value,calculated_value,override_value,reason,created_by)
 select e.firm_id,e.id,v.field_name,v.previous_value,v.previous_value,v.override_value,why,auth.uid() from(values
  ('duration_minutes',to_jsonb(e.duration_minutes),to_jsonb((p_values->>'duration_minutes')::integer)),
  ('effective_hourly_rate',coalesce(to_jsonb(e.effective_hourly_rate),'null'::jsonb),coalesce(to_jsonb(nullif(p_values->>'effective_hourly_rate','')::numeric),'null'::jsonb)),
  ('effective_discount_amount',coalesce(to_jsonb(e.effective_discount_amount),'null'::jsonb),coalesce(to_jsonb(nullif(p_values->>'effective_discount_amount','')::numeric),'null'::jsonb)),
  ('effective_amount',coalesce(to_jsonb(e.effective_amount),'null'::jsonb),coalesce(to_jsonb(nullif(p_values->>'effective_amount','')::numeric),'null'::jsonb)),
  ('billing_entity_id',coalesce(to_jsonb(e.billing_entity_id),'null'::jsonb),coalesce(to_jsonb(nullif(p_values->>'billing_entity_id','')::uuid),'null'::jsonb)),
  ('is_invoiced',to_jsonb(e.is_invoiced),to_jsonb(new_invoiced)),('is_paid',to_jsonb(e.is_paid),to_jsonb(new_paid))
 )v(field_name,previous_value,override_value)where v.previous_value is distinct from v.override_value;
 update public.work_entries set work_date=(p_values->>'work_date')::date,client_id=target_client,client_profile_id=(p_values->>'client_profile_id')::uuid,matter_id=nullif(p_values->>'matter_id','')::uuid,professional_id=(p_values->>'professional_id')::uuid,billing_entity_id=nullif(p_values->>'billing_entity_id','')::uuid,activity_description=btrim(p_values->>'activity_description'),observations=nullif(btrim(coalesce(p_values->>'observations','')),''),duration_minutes=(p_values->>'duration_minutes')::integer,effective_hourly_rate=nullif(p_values->>'effective_hourly_rate','')::numeric,effective_amount=nullif(p_values->>'effective_amount','')::numeric,currency=upper(p_values->>'currency'),status=p_values->>'status',is_billable=(p_values->>'is_billable')::boolean,is_invoiced=new_invoiced,invoice_date=case when new_invoiced then new_invoice_date else null end,is_paid=new_paid,archive_status=nullif(p_values->>'archive_status',''),charge_type=nullif(p_values->>'charge_type',''),effective_discount_amount=nullif(p_values->>'effective_discount_amount','')::numeric,discount_percentage=nullif(p_values->>'discount_percentage','')::numeric,discount_reason=nullif(btrim(coalesce(p_values->>'discount_reason','')),''),has_manual_override=true,updated_by=auth.uid()where id=e.id;
 if btrim(coalesce(p_reason,''))<>''then insert into public.manual_overrides(firm_id,work_entry_id,field_name,previous_value,calculated_value,override_value,reason,created_by)values(e.firm_id,e.id,'full_record',to_jsonb(e),null,p_values,btrim(p_reason),auth.uid());end if;
end;$$;
revoke all on function private.update_work_entry_full(uuid,jsonb,text)from public,anon;
grant execute on function private.update_work_entry_full(uuid,jsonb,text)to authenticated;
