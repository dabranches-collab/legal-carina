-- Import batches and raw rows are written only by controlled security-definer
-- functions. Direct client mutations would bypass file and row validation.
drop policy if exists imports_insert_billing on public.imports;
drop policy if exists imports_update_billing on public.imports;
drop policy if exists import_rows_insert_billing on public.import_rows;
drop policy if exists import_rows_update_billing on public.import_rows;

revoke insert,update,delete,truncate on public.imports,public.import_rows
  from authenticated,anon;

