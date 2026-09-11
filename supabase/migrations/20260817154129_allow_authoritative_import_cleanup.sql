create or replace function private.protect_work_entry_delete()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (old.is_invoiced or exists (select 1 from public.invoice_lines where work_entry_id = old.id))
    and coalesce(current_setting('app.import_reconciliation', true), '') <> 'on' then
    raise exception 'invoiced work entries cannot be deleted';
  end if;
  return old;
end;
$$;
