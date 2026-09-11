create or replace function public.get_client_document_action_flags()
returns table(client_id uuid,has_uninvoiced boolean,has_unpaid boolean)
language sql stable security definer set search_path='' as $$
 select w.client_id,bool_or(not w.is_invoiced),bool_or(w.is_invoiced and not w.is_paid)
 from public.work_entries w
 where private.has_scope_access(w.firm_id,w.billing_entity_id,w.client_id,w.matter_id,'view')
 group by w.client_id
 having bool_or(not w.is_invoiced) or bool_or(w.is_invoiced and not w.is_paid);
$$;
revoke all on function public.get_client_document_action_flags() from public,anon;
grant execute on function public.get_client_document_action_flags() to authenticated;
comment on function public.get_client_document_action_flags() is 'Indicadores por Cliente para Nota de Honorários (não facturados) e Cobrança (facturados não pagos).';
notify pgrst,'reload schema';
