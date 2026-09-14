-- Administradores editam e eliminam sem justificação. O Operador pode gerir
-- movimentos, incluindo mudar a Sociedade, mas deixa sempre um motivo auditável.

create or replace function public.get_work_entry_form_options()
returns jsonb language sql stable security definer set search_path='' as $$
with firms as(select firm_id from public.firm_members where user_id=auth.uid() and active),
societies as(select b.id,b.name from public.billing_entities b join firms f on f.firm_id=b.firm_id where b.active and (private.has_firm_role(b.firm_id,array['owner','admin','operator']) or private.has_scope_access(b.firm_id,b.id,null,null,'edit')) order by b.name),
profiles as(select cp.id,cp.client_id,cp.client_type,cp.client_code,c.display_name from public.client_profiles cp join public.clients c on c.id=cp.client_id join firms f on f.firm_id=cp.firm_id where cp.active and c.active and private.has_scope_access(cp.firm_id,null,cp.client_id,null,'view') order by c.display_name,cp.client_type,cp.client_code),
responsibles as(select p.id,p.display_name from public.professionals p join firms f on f.firm_id=p.firm_id where p.active order by p.display_name)
select jsonb_build_object('societies',coalesce((select jsonb_agg(to_jsonb(societies))from societies),'[]'::jsonb),'clientProfiles',coalesce((select jsonb_agg(to_jsonb(profiles))from profiles),'[]'::jsonb),'responsibles',coalesce((select jsonb_agg(to_jsonb(responsibles))from responsibles),'[]'::jsonb),'processes','[]'::jsonb);$$;

create or replace function private.prepare_work_entry()
returns trigger language plpgsql set search_path='' as $$
declare is_recalculation boolean:=coalesce(current_setting('app.pricing_recalculation',true),'')='on';is_import_reconciliation boolean:=coalesce(current_setting('app.import_reconciliation',true),'')='on';society_only_operator_change boolean:=false;
begin
 if tg_op='INSERT' then
  if(new.imported_hourly_rate is not null or new.calculated_hourly_rate is not null or new.effective_hourly_rate is not null or new.calculated_amount is not null or new.effective_amount is not null or new.imported_amount is not null or new.manual_amount is not null or new.is_invoiced or new.is_paid)and not(private.has_scope_access(new.firm_id,new.billing_entity_id,new.client_id,new.matter_id,'edit')and private.can_view_billing_financials(new.firm_id,new.billing_entity_id))then raise exception 'financial values require edit and financial permission for the Society' using errcode='42501';end if;
  new.imported_duration_minutes:=coalesce(new.imported_duration_minutes,case when new.source_type in('xlsx','csv')then new.duration_minutes end);new.effective_hourly_rate:=coalesce(new.effective_hourly_rate,new.specific_hourly_rate,new.calculated_hourly_rate,new.imported_hourly_rate);new.calculated_amount:=coalesce(new.calculated_amount,round((new.duration_minutes::numeric/60)*new.calculated_hourly_rate,2));new.effective_amount:=coalesce(new.effective_amount,new.imported_amount,new.calculated_amount,round((new.duration_minutes::numeric/60)*new.effective_hourly_rate,2));return new;
 end if;
 society_only_operator_change:=new.billing_entity_id is distinct from old.billing_entity_id and private.has_firm_role(old.firm_id,array['operator']) and private.has_scope_access(old.firm_id,old.billing_entity_id,old.client_id,old.matter_id,'edit') and private.has_current_override(old.id,'billing_entity_id',to_jsonb(new.billing_entity_id)) and new.imported_hourly_rate is not distinct from old.imported_hourly_rate and new.calculated_hourly_rate is not distinct from old.calculated_hourly_rate and new.effective_hourly_rate is not distinct from old.effective_hourly_rate and new.calculated_amount is not distinct from old.calculated_amount and new.effective_amount is not distinct from old.effective_amount and new.effective_discount_amount is not distinct from old.effective_discount_amount and new.currency is not distinct from old.currency and new.is_invoiced is not distinct from old.is_invoiced and new.invoice_date is not distinct from old.invoice_date and new.is_paid is not distinct from old.is_paid;
 if(new.billing_entity_id is distinct from old.billing_entity_id or new.imported_hourly_rate is distinct from old.imported_hourly_rate or new.calculated_hourly_rate is distinct from old.calculated_hourly_rate or new.effective_hourly_rate is distinct from old.effective_hourly_rate or new.calculated_amount is distinct from old.calculated_amount or new.effective_amount is distinct from old.effective_amount or new.effective_discount_amount is distinct from old.effective_discount_amount or new.currency is distinct from old.currency or new.is_invoiced is distinct from old.is_invoiced or new.invoice_date is distinct from old.invoice_date or new.is_paid is distinct from old.is_paid)and not society_only_operator_change and not(private.has_scope_access(old.firm_id,old.billing_entity_id,old.client_id,old.matter_id,'edit')and private.can_view_billing_financials(old.firm_id,old.billing_entity_id)and(new.billing_entity_id is not distinct from old.billing_entity_id or private.can_view_billing_financials(old.firm_id,new.billing_entity_id)))then raise exception 'financial fields require edit and financial permission for the Society' using errcode='42501';end if;
 if is_recalculation and old.has_manual_override then raise exception 'recalculation cannot replace a manual override';end if;
 if new.duration_minutes is distinct from old.duration_minutes and not is_recalculation and not is_import_reconciliation and not private.has_current_override(old.id,'duration_minutes',to_jsonb(new.duration_minutes))then raise exception 'duration_minutes requires a matching manual override';end if;
 if new.effective_hourly_rate is distinct from old.effective_hourly_rate and not is_recalculation and not is_import_reconciliation and not private.has_current_override(old.id,'effective_hourly_rate',to_jsonb(new.effective_hourly_rate))then raise exception 'effective_hourly_rate requires a matching manual override';end if;
 if new.effective_discount_amount is distinct from old.effective_discount_amount and not is_recalculation and not is_import_reconciliation and not private.has_current_override(old.id,'effective_discount_amount',to_jsonb(new.effective_discount_amount))then raise exception 'effective_discount_amount requires a matching manual override';end if;
 if new.effective_amount is distinct from old.effective_amount and not is_recalculation and not is_import_reconciliation and not private.has_current_override(old.id,'effective_amount',to_jsonb(new.effective_amount))then raise exception 'effective_amount requires a matching manual override';end if;
 if new.billing_entity_id is distinct from old.billing_entity_id and not is_import_reconciliation and not private.has_current_override(old.id,'billing_entity_id',to_jsonb(new.billing_entity_id))then raise exception 'billing_entity_id requires a matching manual override';end if;
 if new.is_invoiced is distinct from old.is_invoiced and not is_import_reconciliation and not private.has_current_override(old.id,'is_invoiced',to_jsonb(new.is_invoiced))then raise exception 'is_invoiced requires a matching manual override';end if;
 if new.is_paid is distinct from old.is_paid and not is_import_reconciliation and not private.has_current_override(old.id,'is_paid',to_jsonb(new.is_paid))then raise exception 'is_paid requires a matching manual override';end if;return new;
end;$$;

create or replace function private.delete_work_entry(p_work_entry_id uuid,p_reason text)
returns void language plpgsql security definer set search_path='' as $$
declare entry public.work_entries%rowtype;operator_requires_reason boolean;why text;
begin
 if auth.uid() is null then raise exception 'authentication required' using errcode='28000';end if;
 select * into entry from public.work_entries where id=p_work_entry_id for update;if entry.id is null then raise exception 'work entry not found';end if;
 if not private.has_firm_role(entry.firm_id,array['owner','admin','manager','operator'])or not private.has_scope_access(entry.firm_id,entry.billing_entity_id,entry.client_id,entry.matter_id,'edit')then raise exception 'Não tem permissão para eliminar este movimento.' using errcode='42501';end if;
 select coalesce(bool_or(role='operator'),false) into operator_requires_reason from public.firm_members where firm_id=entry.firm_id and user_id=auth.uid() and active;
 if operator_requires_reason and btrim(coalesce(p_reason,''))=''then raise exception 'Indique o motivo da eliminação para o registo de auditoria.';end if;
 why:=coalesce(nullif(btrim(p_reason),''),'Eliminação por administrador');
 update public.work_entries set observations=concat_ws(E'\n',observations,'Motivo de eliminação: '||why),updated_by=auth.uid()where id=entry.id;
 update public.invoice_lines set work_entry_id=null where work_entry_id=entry.id;update public.import_rows set work_entry_id=null where work_entry_id=entry.id;update public.discounts set work_entry_id=null where work_entry_id=entry.id;delete from public.manual_overrides where work_entry_id=entry.id;delete from public.work_entries where id=entry.id;
end;$$;

revoke all on function public.get_work_entry_form_options() from public,anon;
revoke all on function private.prepare_work_entry() from public,anon,authenticated;
revoke all on function private.delete_work_entry(uuid,text) from public,anon;
grant execute on function public.get_work_entry_form_options() to authenticated;
grant execute on function private.delete_work_entry(uuid,text) to authenticated;
notify pgrst,'reload schema';
