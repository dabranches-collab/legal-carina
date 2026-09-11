-- O Operador assegura a manutenção diária dos movimentos. Pode eliminá-los,
-- desde que indique um motivo; o trigger de auditoria conserva o registo
-- anterior completo e o utilizador que executou a operação.
create or replace function private.delete_work_entry(p_work_entry_id uuid,p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  entry public.work_entries%rowtype;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  select * into entry
  from public.work_entries
  where id = p_work_entry_id
  for update;

  if entry.id is null then
    raise exception 'work entry not found';
  end if;

  if not private.has_firm_role(entry.firm_id, array['owner','admin','manager','operator'])
    or not private.has_scope_access(
      entry.firm_id,
      entry.billing_entity_id,
      entry.client_id,
      entry.matter_id,
      'edit'
    ) then
    raise exception 'Não tem permissão para eliminar este movimento.' using errcode = '42501';
  end if;

  if btrim(coalesce(p_reason, '')) = '' then
    raise exception 'Indique o motivo da eliminação para o registo de auditoria.';
  end if;

  -- A alteração imediatamente anterior à eliminação faz com que o motivo
  -- integre também o previous_data do evento DELETE criado pelo trigger.
  update public.work_entries
  set observations = concat_ws(
        E'\n',
        observations,
        'Motivo de eliminação: ' || btrim(p_reason)
      ),
      updated_by = auth.uid()
  where id = entry.id;

  update public.invoice_lines set work_entry_id = null where work_entry_id = entry.id;
  update public.import_rows set work_entry_id = null where work_entry_id = entry.id;
  update public.discounts set work_entry_id = null where work_entry_id = entry.id;
  delete from public.manual_overrides where work_entry_id = entry.id;
  delete from public.work_entries where id = entry.id;
end;
$$;

notify pgrst, 'reload schema';
