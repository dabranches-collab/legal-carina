-- O Operador é o perfil administrativo operacional que mantém o cadastro.
drop policy if exists clients_select_scoped on public.clients;
create policy clients_select_scoped on public.clients for select to authenticated using ((select private.has_firm_role(firm_id,array['owner','admin','operator'])) or (select private.has_scope_access(firm_id,null,id,null,'view')));
drop policy if exists clients_insert_admin on public.clients;
create policy clients_insert_admin on public.clients for insert to authenticated with check ((select private.has_firm_role(firm_id,array['owner','admin','operator'])));
drop policy if exists clients_update_admin on public.clients;
create policy clients_update_admin on public.clients for update to authenticated using ((select private.has_firm_role(firm_id,array['owner','admin','operator']))) with check ((select private.has_firm_role(firm_id,array['owner','admin','operator'])));
drop policy if exists client_profiles_select_scope on public.client_profiles;
create policy client_profiles_select_scope on public.client_profiles for select to authenticated using ((select private.has_firm_role(firm_id,array['owner','admin','operator'])) or (select private.has_scope_access(firm_id,null,client_id,null,'view')));
drop policy if exists client_profiles_insert_admin on public.client_profiles;
create policy client_profiles_insert_admin on public.client_profiles for insert to authenticated with check ((select private.has_firm_role(firm_id,array['owner','admin','operator'])));
drop policy if exists client_profiles_update_admin on public.client_profiles;
create policy client_profiles_update_admin on public.client_profiles for update to authenticated using ((select private.has_firm_role(firm_id,array['owner','admin','operator']))) with check ((select private.has_firm_role(firm_id,array['owner','admin','operator'])));
comment on policy clients_insert_admin on public.clients is 'Proprietário, Administrador e Operador podem criar Clientes no próprio escritório.';
comment on policy clients_update_admin on public.clients is 'Proprietário, Administrador e Operador podem actualizar Clientes no próprio escritório; eliminação não é concedida.';
