-- Mantém autoria/data e auditoria automática, mas deixa de bloquear Operadores por falta de texto livre.
do $$
declare signature regprocedure;definition text;updated text;
begin
 foreach signature in array array[
  'public.update_work_entry_full(uuid,jsonb,text)'::regprocedure,
  'private.update_work_entry_full(uuid,jsonb,text)'::regprocedure,
  'public.update_work_entry_inline_audited(uuid,text,text,text)'::regprocedure,
  'private.delete_work_entry(uuid,text)'::regprocedure,
  'public.bulk_update_work_entries(uuid[],text,jsonb,text)'::regprocedure,
  'public.update_work_entry_expense(uuid,numeric,text,text)'::regprocedure,
  'public.remove_work_entry_expense(uuid,text)'::regprocedure
 ] loop
  definition:=pg_get_functiondef(signature);
  updated:=regexp_replace(
    definition,
    'if[[:space:]]+(operator_requires_reason|is_operator)[[:space:]]+and[^;]*then[[:space:]]+raise exception[[:space:]]+''[^'']+'';[[:space:]]*end if;',
    '',
    'gi'
  );
  if updated=definition then raise exception 'Não foi localizada a restrição de motivo em %',signature;end if;
  execute updated;
 end loop;
end$$;

comment on function public.update_work_entry_full(uuid,jsonb,text) is 'Edição auditada; o motivo é opcional para todos os perfis autorizados.';
notify pgrst,'reload schema';
