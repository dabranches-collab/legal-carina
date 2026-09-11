-- Distingue trabalho abandonado antes de facturar de crédito facturado incobrável.
alter table public.work_entries drop constraint if exists work_entries_status_check;
alter table public.work_entries add constraint work_entries_status_check check(status in(
  'draft','pending_review','approved','invoiced','paid','non_billable','cancelled',
  'uncollectible_uninvoiced','uncollectible_invoiced'
));

create or replace function public.update_work_entry_collection_status(p_work_entry_id uuid,p_state text)
returns void language plpgsql security definer set search_path='' as $$
declare entry public.work_entries%rowtype;
begin
 if auth.uid() is null then raise exception 'authentication required' using errcode='28000'; end if;
 select * into entry from public.work_entries where id=p_work_entry_id for update;
 if entry.id is null then raise exception 'work entry not found'; end if;
 if not private.has_scope_access(entry.firm_id,entry.billing_entity_id,entry.client_id,entry.matter_id,'edit') then raise exception 'not authorized' using errcode='42501'; end if;
 if p_state not in('uncollectible_uninvoiced','uncollectible_invoiced') then raise exception 'invalid collection state'; end if;
 if p_state='uncollectible_invoiced' and entry.invoice_date is null then raise exception 'invoice date is required'; end if;
 insert into public.manual_overrides(firm_id,work_entry_id,field_name,previous_value,calculated_value,override_value,reason,created_by)
 values(entry.firm_id,entry.id,'status',to_jsonb(entry.status),to_jsonb(entry.status),to_jsonb(p_state),'Edição directa na tabela',auth.uid());
 if entry.is_invoiced is distinct from(p_state='uncollectible_invoiced') then
  insert into public.manual_overrides(firm_id,work_entry_id,field_name,previous_value,calculated_value,override_value,reason,created_by)
  values(entry.firm_id,entry.id,'is_invoiced',to_jsonb(entry.is_invoiced),to_jsonb(entry.is_invoiced),to_jsonb(p_state='uncollectible_invoiced'),'Actualização automática pelo estado Incobrável',auth.uid());
 end if;
 if entry.is_paid then
  insert into public.manual_overrides(firm_id,work_entry_id,field_name,previous_value,calculated_value,override_value,reason,created_by)
  values(entry.firm_id,entry.id,'is_paid',to_jsonb(entry.is_paid),to_jsonb(entry.is_paid),'false'::jsonb,'Actualização automática pelo estado Incobrável',auth.uid());
 end if;
 update public.work_entries set status=p_state,
  is_invoiced=(p_state='uncollectible_invoiced'),is_paid=false,
  invoice_date=case when p_state='uncollectible_invoiced' then invoice_date else null end,
  has_manual_override=true,updated_by=auth.uid() where id=entry.id;
end;$$;
revoke all on function public.update_work_entry_collection_status(uuid,text) from public,anon;
grant execute on function public.update_work_entry_collection_status(uuid,text) to authenticated;
notify pgrst,'reload schema';
