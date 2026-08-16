-- Import rows preserve original spreadsheet cells and can contain data spanning
-- every Society and client. UI placement is not an access control: only the
-- proprietor and administrators may inspect import batches or their raw rows.
drop policy if exists imports_select_member on public.imports;
drop policy if exists import_rows_select_member on public.import_rows;

create policy imports_select_admin on public.imports for select to authenticated
using ((select private.has_firm_role(firm_id,array['owner','admin'])));

create policy import_rows_select_admin on public.import_rows for select to authenticated
using ((select private.has_firm_role(firm_id,array['owner','admin'])));

comment on table public.import_rows is
  'Raw and normalized import evidence. Read access is restricted to proprietor/administrator because a batch can span every Society and client.';

