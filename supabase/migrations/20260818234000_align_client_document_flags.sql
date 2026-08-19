create or replace function public.get_client_document_action_flags()
returns table(client_id uuid,has_uninvoiced boolean,has_unpaid boolean)
language sql stable security definer set search_path=''
as $$
  with scope_access as materialized(
    select targets.firm_id,targets.billing_entity_id,targets.client_id,targets.matter_id,
      private.has_scope_access(targets.firm_id,targets.billing_entity_id,targets.client_id,targets.matter_id,'view') can_view
    from(select distinct w.firm_id,w.billing_entity_id,w.client_id,w.matter_id from public.work_entries w)targets
  )
  select w.client_id,
    bool_or(not w.is_invoiced and w.status<>'uncollectible_uninvoiced') has_uninvoiced,
    bool_or(w.is_invoiced and not w.is_paid and w.status<>'uncollectible_invoiced') has_unpaid
  from public.work_entries w
  join scope_access scope on scope.firm_id=w.firm_id
    and scope.billing_entity_id is not distinct from w.billing_entity_id
    and scope.client_id=w.client_id
    and scope.matter_id is not distinct from w.matter_id
  where scope.can_view
  group by w.client_id
  having bool_or(not w.is_invoiced and w.status<>'uncollectible_uninvoiced')
    or bool_or(w.is_invoiced and not w.is_paid and w.status<>'uncollectible_invoiced');
$$;
revoke all on function public.get_client_document_action_flags() from public,anon;
grant execute on function public.get_client_document_action_flags() to authenticated;
notify pgrst,'reload schema';
