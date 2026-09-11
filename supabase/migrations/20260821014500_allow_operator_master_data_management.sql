-- O Operador mantém os dados operacionais de Clientes, Sociedades e Responsáveis.
drop policy if exists billing_entities_select_scoped on public.billing_entities;
create policy billing_entities_select_scoped on public.billing_entities for select to authenticated
using ((select private.has_firm_role(firm_id,array['owner','admin','operator'])) or (select private.has_scope_access(firm_id,id,null,null,'view')));
drop policy if exists billing_entities_insert_admin on public.billing_entities;
create policy billing_entities_insert_admin on public.billing_entities for insert to authenticated
with check ((select private.has_firm_role(firm_id,array['owner','admin','operator'])));
drop policy if exists billing_entities_update_admin on public.billing_entities;
create policy billing_entities_update_admin on public.billing_entities for update to authenticated
using ((select private.has_firm_role(firm_id,array['owner','admin','operator'])))
with check ((select private.has_firm_role(firm_id,array['owner','admin','operator'])));

drop policy if exists professionals_insert_admin on public.professionals;
create policy professionals_insert_admin on public.professionals for insert to authenticated
with check ((select private.has_firm_role(firm_id,array['owner','admin','operator'])));
drop policy if exists professionals_update_admin on public.professionals;
create policy professionals_update_admin on public.professionals for update to authenticated
using ((select private.has_firm_role(firm_id,array['owner','admin','operator'])))
with check ((select private.has_firm_role(firm_id,array['owner','admin','operator'])));

comment on policy billing_entities_insert_admin on public.billing_entities is 'Proprietário, Administrador e Operador podem criar Sociedades.';
comment on policy billing_entities_update_admin on public.billing_entities is 'Proprietário, Administrador e Operador podem actualizar Sociedades.';
comment on policy professionals_insert_admin on public.professionals is 'Proprietário, Administrador e Operador podem criar Responsáveis.';
comment on policy professionals_update_admin on public.professionals is 'Proprietário, Administrador e Operador podem actualizar Responsáveis.';
