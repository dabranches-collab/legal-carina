create or replace function private.delete_work_entry(p_work_entry_id uuid,p_reason text)
returns void language plpgsql security definer set search_path='' as $$
declare e public.work_entries%rowtype;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode='28000';end if;
  select * into e from public.work_entries where id=p_work_entry_id for update;
  if e.id is null then raise exception 'work entry not found';end if;
  if not private.has_scope_access(e.firm_id,e.billing_entity_id,e.client_id,e.matter_id,'edit') then raise exception 'not authorized' using errcode='42501';end if;
  update public.invoice_lines set work_entry_id=null where work_entry_id=e.id;
  update public.import_rows set work_entry_id=null where work_entry_id=e.id;
  update public.discounts set work_entry_id=null where work_entry_id=e.id;
  delete from public.manual_overrides where work_entry_id=e.id;
  delete from public.work_entries where id=e.id;
end;$$;

revoke all on function private.delete_work_entry(uuid,text) from public,anon;
grant execute on function private.delete_work_entry(uuid,text) to authenticated;
