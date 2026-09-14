-- Reinstala os endpoints operacionais sem promover o histórico divergente.
-- A função de criação é mantida no ficheiro 20260818133428 e aplicada em conjunto
-- com esta correcção isolada. Esta definição final torna a edição directa
-- operacional para todos os perfis que já possuam âmbito de edição sobre a linha.

create or replace function public.update_work_entry_inline(
  p_work_entry_id uuid,
  p_field text,
  p_value text
) returns void
language plpgsql
security definer
set search_path=''
as $$
declare
  entry public.work_entries%rowtype;
  target_id uuid;
  target_client_id uuid;
  numeric_value numeric;
  boolean_value boolean;
  date_value date;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode='28000'; end if;
  select * into entry from public.work_entries where id=p_work_entry_id for update;
  if entry.id is null then raise exception 'work entry not found'; end if;
  if not private.has_scope_access(entry.firm_id,entry.billing_entity_id,entry.client_id,entry.matter_id,'edit') then
    raise exception 'not authorized' using errcode='42501';
  end if;

  case p_field
    when 'client_profile_id' then
      target_id:=nullif(p_value,'')::uuid;
      select cp.client_id into target_client_id from public.client_profiles cp
       where cp.id=target_id and cp.firm_id=entry.firm_id and cp.active;
      if target_client_id is null or not private.has_scope_access(entry.firm_id,entry.billing_entity_id,target_client_id,null,'edit') then
        raise exception 'invalid client or not authorized' using errcode='42501';
      end if;
      update public.work_entries set client_id=target_client_id,client_profile_id=target_id,matter_id=null,updated_by=auth.uid() where id=entry.id;
    when 'professional_id' then
      target_id:=nullif(p_value,'')::uuid;
      if target_id is null or not exists(select 1 from public.professionals p where p.id=target_id and p.firm_id=entry.firm_id and p.active) then raise exception 'invalid responsible'; end if;
      update public.work_entries set professional_id=target_id,updated_by=auth.uid() where id=entry.id;
    when 'billing_entity_id' then
      target_id:=nullif(p_value,'')::uuid;
      if target_id is not null and not exists(select 1 from public.billing_entities b where b.id=target_id and b.firm_id=entry.firm_id and b.active) then raise exception 'invalid society'; end if;
      if target_id is not null and not private.has_scope_access(entry.firm_id,target_id,entry.client_id,entry.matter_id,'edit') then raise exception 'not authorized for target society' using errcode='42501'; end if;
      insert into public.manual_overrides(firm_id,work_entry_id,field_name,previous_value,calculated_value,override_value,reason,created_by)
      values(entry.firm_id,entry.id,'billing_entity_id',coalesce(to_jsonb(entry.billing_entity_id),'null'::jsonb),coalesce(to_jsonb(entry.billing_entity_id),'null'::jsonb),coalesce(to_jsonb(target_id),'null'::jsonb),'Edição directa na tabela',auth.uid());
      update public.work_entries set billing_entity_id=target_id,has_manual_override=true,updated_by=auth.uid() where id=entry.id;
    when 'archive_status' then
      if p_value<>'' and p_value not in('none','gaveta','dossier','findos','digital','other') then raise exception 'invalid archive state'; end if;
      update public.work_entries set archive_status=nullif(p_value,''),updated_by=auth.uid() where id=entry.id;
    when 'is_invoiced' then
      if p_value not in('true','false') then raise exception 'invalid invoiced state'; end if;
      boolean_value:=p_value::boolean;
      if boolean_value and entry.invoice_date is null then raise exception 'invoice date is required'; end if;
      insert into public.manual_overrides(firm_id,work_entry_id,field_name,previous_value,calculated_value,override_value,reason,created_by)
      values(entry.firm_id,entry.id,'is_invoiced',to_jsonb(entry.is_invoiced),to_jsonb(entry.is_invoiced),to_jsonb(boolean_value),'Edição directa na tabela',auth.uid());
      if not boolean_value and entry.is_paid then
        insert into public.manual_overrides(firm_id,work_entry_id,field_name,previous_value,calculated_value,override_value,reason,created_by)
        values(entry.firm_id,entry.id,'is_paid',to_jsonb(entry.is_paid),to_jsonb(entry.is_paid),'false'::jsonb,'Edição directa na tabela',auth.uid());
      end if;
      update public.work_entries set is_invoiced=boolean_value,is_paid=case when boolean_value then is_paid else false end,invoice_date=case when boolean_value then invoice_date else null end,status=case when boolean_value then 'invoiced' else 'approved' end,has_manual_override=true,updated_by=auth.uid() where id=entry.id;
    when 'is_paid' then
      if p_value not in('true','false') then raise exception 'invalid paid state'; end if;
      boolean_value:=p_value::boolean;
      if boolean_value and not entry.is_invoiced then raise exception 'a paid movement must be invoiced'; end if;
      insert into public.manual_overrides(firm_id,work_entry_id,field_name,previous_value,calculated_value,override_value,reason,created_by)
      values(entry.firm_id,entry.id,'is_paid',to_jsonb(entry.is_paid),to_jsonb(entry.is_paid),to_jsonb(boolean_value),'Edição directa na tabela',auth.uid());
      update public.work_entries set is_paid=boolean_value,status=case when boolean_value then 'paid' else 'invoiced' end,has_manual_override=true,updated_by=auth.uid() where id=entry.id;
    when 'work_date' then
      date_value:=p_value::date;
      update public.work_entries set work_date=date_value,updated_by=auth.uid() where id=entry.id;
    when 'invoice_date' then
      date_value:=nullif(p_value,'')::date;
      if entry.is_invoiced and date_value is null then raise exception 'invoice date is required'; end if;
      update public.work_entries set invoice_date=date_value,updated_by=auth.uid() where id=entry.id;
    when 'duration_minutes' then
      numeric_value:=p_value::numeric;
      if numeric_value<0 or numeric_value<>trunc(numeric_value) then raise exception 'duration must be a non-negative whole number'; end if;
      insert into public.manual_overrides(firm_id,work_entry_id,field_name,previous_value,calculated_value,override_value,reason,created_by)
      values(entry.firm_id,entry.id,'duration_minutes',to_jsonb(entry.duration_minutes),to_jsonb(entry.imported_duration_minutes),to_jsonb(numeric_value::integer),'Edição directa na tabela',auth.uid());
      update public.work_entries set duration_minutes=numeric_value::integer,has_manual_override=true,updated_by=auth.uid() where id=entry.id;
    when 'effective_hourly_rate' then
      numeric_value:=nullif(p_value,'')::numeric;
      if numeric_value is not null and numeric_value<0 then raise exception 'invalid hourly rate'; end if;
      insert into public.manual_overrides(firm_id,work_entry_id,field_name,previous_value,calculated_value,override_value,reason,created_by)
      values(entry.firm_id,entry.id,'effective_hourly_rate',coalesce(to_jsonb(entry.effective_hourly_rate),'null'::jsonb),coalesce(to_jsonb(entry.calculated_hourly_rate),'null'::jsonb),coalesce(to_jsonb(numeric_value),'null'::jsonb),'Edição directa na tabela',auth.uid());
      update public.work_entries set effective_hourly_rate=numeric_value,has_manual_override=true,updated_by=auth.uid() where id=entry.id;
    when 'effective_amount' then
      numeric_value:=nullif(p_value,'')::numeric;
      if numeric_value is not null and numeric_value<0 then raise exception 'invalid amount'; end if;
      insert into public.manual_overrides(firm_id,work_entry_id,field_name,previous_value,calculated_value,override_value,reason,created_by)
      values(entry.firm_id,entry.id,'effective_amount',coalesce(to_jsonb(entry.effective_amount),'null'::jsonb),coalesce(to_jsonb(entry.calculated_amount),'null'::jsonb),coalesce(to_jsonb(numeric_value),'null'::jsonb),'Edição directa na tabela',auth.uid());
      update public.work_entries set effective_amount=numeric_value,manual_amount=numeric_value,has_manual_override=true,updated_by=auth.uid() where id=entry.id;
    when 'activity_description' then
      if btrim(coalesce(p_value,''))='' then raise exception 'activity is required'; end if;
      update public.work_entries set activity_description=btrim(p_value),updated_by=auth.uid() where id=entry.id;
    when 'observations' then
      update public.work_entries set observations=nullif(btrim(coalesce(p_value,'')),''),updated_by=auth.uid() where id=entry.id;
    else raise exception 'unsupported inline field';
  end case;
end;$$;

revoke all on function public.update_work_entry_inline(uuid,text,text) from public,anon;
grant execute on function public.update_work_entry_inline(uuid,text,text) to authenticated;
notify pgrst,'reload schema';
