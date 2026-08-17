create or replace function private.update_work_entry_full(p_work_entry_id uuid,p_values jsonb,p_reason text)
returns void language plpgsql security definer set search_path='' as $$
declare e public.work_entries%rowtype;target_client uuid;new_invoiced boolean;new_paid boolean;new_invoice_date date;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode='28000';end if;
  select * into e from public.work_entries where id=p_work_entry_id for update;
  if e.id is null then raise exception 'work entry not found';end if;
  if not private.has_scope_access(e.firm_id,e.billing_entity_id,e.client_id,e.matter_id,'edit') then raise exception 'not authorized' using errcode='42501';end if;
  select client_id into target_client from public.client_profiles where id=(p_values->>'client_profile_id')::uuid and firm_id=e.firm_id and active;
  new_invoiced:=coalesce((p_values->>'is_invoiced')::boolean,false);new_paid:=coalesce((p_values->>'is_paid')::boolean,false);new_invoice_date:=nullif(p_values->>'invoice_date','')::date;
  if target_client is null or coalesce((p_values->>'duration_minutes')::integer,0)<0 or btrim(coalesce(p_values->>'activity_description',''))='' then raise exception 'invalid work entry';end if;
  if new_paid and not new_invoiced then raise exception 'paid movement must be invoiced';end if;
  if new_invoiced and new_invoice_date is null then raise exception 'invoice date required';end if;
  if (coalesce((p_values->>'effective_hourly_rate')::numeric,e.effective_hourly_rate) is distinct from e.effective_hourly_rate or coalesce((p_values->>'effective_amount')::numeric,e.effective_amount) is distinct from e.effective_amount) and btrim(coalesce(p_reason,''))='' then raise exception 'override reason required';end if;
  update public.work_entries set work_date=(p_values->>'work_date')::date,client_id=target_client,client_profile_id=(p_values->>'client_profile_id')::uuid,matter_id=nullif(p_values->>'matter_id','')::uuid,professional_id=(p_values->>'professional_id')::uuid,billing_entity_id=nullif(p_values->>'billing_entity_id','')::uuid,activity_description=btrim(p_values->>'activity_description'),observations=nullif(btrim(coalesce(p_values->>'observations','')),''),duration_minutes=(p_values->>'duration_minutes')::integer,effective_hourly_rate=nullif(p_values->>'effective_hourly_rate','')::numeric,effective_amount=nullif(p_values->>'effective_amount','')::numeric,currency=upper(p_values->>'currency'),status=p_values->>'status',is_billable=(p_values->>'is_billable')::boolean,is_invoiced=new_invoiced,invoice_date=case when new_invoiced then new_invoice_date else null end,is_paid=new_paid,archive_status=nullif(p_values->>'archive_status',''),charge_type=nullif(p_values->>'charge_type',''),effective_discount_amount=nullif(p_values->>'effective_discount_amount','')::numeric,discount_percentage=nullif(p_values->>'discount_percentage','')::numeric,discount_reason=nullif(btrim(coalesce(p_values->>'discount_reason','')),''),has_manual_override=has_manual_override or btrim(coalesce(p_reason,''))<>'' ,updated_by=auth.uid() where id=e.id;
  if btrim(coalesce(p_reason,''))<>'' then insert into public.manual_overrides(firm_id,work_entry_id,field_name,previous_value,calculated_value,override_value,reason,created_by) values(e.firm_id,e.id,'full_record',to_jsonb(e),null,p_values,btrim(p_reason),auth.uid());end if;
end;$$;

revoke all on function private.update_work_entry_full(uuid,jsonb,text) from public,anon;
grant execute on function private.update_work_entry_full(uuid,jsonb,text) to authenticated;
create or replace function public.update_work_entry_full(p_work_entry_id uuid,p_values jsonb,p_reason text)
returns void language sql security invoker set search_path='' as $$select private.update_work_entry_full(p_work_entry_id,p_values,p_reason);$$;
revoke all on function public.update_work_entry_full(uuid,jsonb,text) from public,anon;
grant execute on function public.update_work_entry_full(uuid,jsonb,text) to authenticated;

create or replace function private.delete_work_entry(p_work_entry_id uuid,p_reason text)
returns void language plpgsql security definer set search_path='' as $$
declare e public.work_entries%rowtype;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode='28000';end if;
  select * into e from public.work_entries where id=p_work_entry_id for update;
  if e.id is null then raise exception 'work entry not found';end if;
  if not private.has_firm_role(e.firm_id,array['owner','admin']) then raise exception 'not authorized' using errcode='42501';end if;
  if btrim(coalesce(p_reason,''))='' then raise exception 'deletion reason required';end if;
  if e.is_invoiced or exists(select 1 from public.invoice_lines where work_entry_id=e.id) then raise exception 'invoiced movement cannot be deleted';end if;
  update public.work_entries set observations=concat_ws(E'\n',observations,'Motivo de eliminação: '||btrim(p_reason)),updated_by=auth.uid() where id=e.id;
  delete from public.manual_overrides where work_entry_id=e.id;
  delete from public.work_entries where id=e.id;
end;$$;

revoke all on function private.delete_work_entry(uuid,text) from public,anon;
grant execute on function private.delete_work_entry(uuid,text) to authenticated;
create or replace function public.delete_work_entry(p_work_entry_id uuid,p_reason text)
returns void language sql security invoker set search_path='' as $$select private.delete_work_entry(p_work_entry_id,p_reason);$$;
revoke all on function public.delete_work_entry(uuid,text) from public,anon;
grant execute on function public.delete_work_entry(uuid,text) to authenticated;
