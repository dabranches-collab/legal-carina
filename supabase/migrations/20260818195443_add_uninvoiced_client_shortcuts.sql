create or replace function public.get_uninvoiced_client_ids()
returns setof uuid language sql stable security definer set search_path='' as $$
 select distinct w.client_id from public.work_entries w
 where not w.is_invoiced and private.has_scope_access(w.firm_id,w.billing_entity_id,w.client_id,w.matter_id,'view');
$$;
revoke all on function public.get_uninvoiced_client_ids() from public,anon;
grant execute on function public.get_uninvoiced_client_ids() to authenticated;
comment on function public.get_uninvoiced_client_ids() is 'Clientes com pelo menos um movimento não facturado acessível ao utilizador; alimenta o atalho para Nota de Honorários.';
