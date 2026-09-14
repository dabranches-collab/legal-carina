-- A data da factura é a acção inequívoca que inicia a facturação.
-- A operação é atómica para evitar estados intermédios impossíveis na grelha.
create or replace function public.update_work_entry_invoice_date(
  p_work_entry_id uuid,
  p_invoice_date date
) returns void
language plpgsql
security definer
set search_path=''
as $$
declare
  entry public.work_entries%rowtype;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode='28000';
  end if;

  select * into entry
  from public.work_entries
  where id=p_work_entry_id
  for update;

  if entry.id is null then raise exception 'work entry not found'; end if;
  if not private.has_scope_access(
    entry.firm_id,entry.billing_entity_id,entry.client_id,entry.matter_id,'edit'
  ) then
    raise exception 'not authorized' using errcode='42501';
  end if;

  insert into public.manual_overrides(
    firm_id,work_entry_id,field_name,previous_value,calculated_value,
    override_value,reason,created_by
  ) values (
    entry.firm_id,entry.id,'invoice_date',
    coalesce(to_jsonb(entry.invoice_date),'null'::jsonb),
    coalesce(to_jsonb(entry.invoice_date),'null'::jsonb),
    coalesce(to_jsonb(p_invoice_date),'null'::jsonb),
    'Edição directa na tabela',auth.uid()
  );

  if entry.is_invoiced is distinct from (p_invoice_date is not null) then
    insert into public.manual_overrides(firm_id,work_entry_id,field_name,previous_value,calculated_value,override_value,reason,created_by)
    values(entry.firm_id,entry.id,'is_invoiced',to_jsonb(entry.is_invoiced),to_jsonb(entry.is_invoiced),to_jsonb(p_invoice_date is not null),'Actualização automática pela Data da factura',auth.uid());
  end if;
  if p_invoice_date is null and entry.is_paid then
    insert into public.manual_overrides(firm_id,work_entry_id,field_name,previous_value,calculated_value,override_value,reason,created_by)
    values(entry.firm_id,entry.id,'is_paid',to_jsonb(entry.is_paid),to_jsonb(entry.is_paid),'false'::jsonb,'Actualização automática pela Data da factura',auth.uid());
  end if;

  update public.work_entries
  set invoice_date=p_invoice_date,
      is_invoiced=p_invoice_date is not null,
      is_paid=case when p_invoice_date is null then false else is_paid end,
      status=case
        when p_invoice_date is null then 'approved'
        when is_paid then 'paid'
        else 'invoiced'
      end,
      has_manual_override=true,
      updated_by=auth.uid()
  where id=entry.id;
end;$$;

revoke all on function public.update_work_entry_invoice_date(uuid,date) from public,anon;
grant execute on function public.update_work_entry_invoice_date(uuid,date) to authenticated;
notify pgrst,'reload schema';
