-- A interface e o RPC aplicam a mesma regra: o Operador justifica qualquer
-- alteração; owner/admin/manager não ficam condicionados por uma justificação.
create or replace function public.update_work_entry_full(
  p_work_entry_id uuid,
  p_values jsonb,
  p_reason text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_firm_id uuid;
  operator_requires_reason boolean;
begin
  select firm_id into target_firm_id
  from public.work_entries
  where id = p_work_entry_id;

  select coalesce(bool_or(role = 'operator'), false)
  into operator_requires_reason
  from public.firm_members
  where firm_id = target_firm_id
    and user_id = auth.uid()
    and active;

  if operator_requires_reason and btrim(coalesce(p_reason, '')) = '' then
    raise exception 'override reason required';
  end if;

  perform private.update_work_entry_full(p_work_entry_id, p_values, p_reason);
end;
$$;

revoke all on function public.update_work_entry_full(uuid,jsonb,text) from public,anon;
grant execute on function public.update_work_entry_full(uuid,jsonb,text) to authenticated;
notify pgrst,'reload schema';
