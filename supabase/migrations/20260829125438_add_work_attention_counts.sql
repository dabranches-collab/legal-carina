create or replace function public.get_work_attention_counts(
  p_search text default null,p_year integer default null,p_professional_id uuid default null,
  p_billing_entity_id uuid default null,p_archive text default null,p_client_type text default null,p_client_id uuid default null
) returns jsonb language sql stable security definer set search_path='' set statement_timeout='15s' as $$
with memberships as materialized(
 select fm.firm_id,bool_or(fm.role in('owner','admin','operator')) privileged
 from public.firm_members fm where fm.user_id=(select auth.uid()) and fm.active
 and private.has_completed_pin_setup((select auth.uid())) group by fm.firm_id
), filtered as materialized(
 select w.* from public.work_entries w join memberships m on m.firm_id=w.firm_id join public.clients c on c.id=w.client_id
 where (m.privileged or private.has_scope_access(w.firm_id,w.billing_entity_id,w.client_id,w.matter_id,'view'))
 and(p_search is null or btrim(p_search)='' or w.activity_description ilike '%'||p_search||'%' or coalesce(w.observations,'') ilike '%'||p_search||'%' or c.display_name ilike '%'||p_search||'%' or c.client_code ilike '%'||p_search||'%')
 and(p_year is null or w.work_date>=make_date(p_year,1,1) and w.work_date<make_date(p_year+1,1,1))
 and(p_professional_id is null or w.professional_id=p_professional_id)
 and(p_billing_entity_id is null or w.billing_entity_id=p_billing_entity_id)
 and(p_archive is null or w.archive_status=p_archive)
 and(p_client_type is null or exists(select 1 from public.client_profiles cp where cp.id=w.client_profile_id and cp.client_type=p_client_type and cp.active))
 and(p_client_id is null or w.client_id=p_client_id)
)
select jsonb_build_object(
 'missing_society',count(*)filter(where billing_entity_id is null),
 'missing_price',count(*)filter(where effective_hourly_rate is null),
 'uninvoiced',count(*)filter(where billing_scope='standard'and not is_invoiced and status<>'uncollectible_uninvoiced'),
 'unpaid',count(*)filter(where billing_scope='standard'and is_invoiced and not is_paid and status<>'uncollectible_invoiced'),
 'historical',count(*)filter(where(is_invoiced and invoice_date is null)or has_historical_state_exception),
 'retainer',count(*)filter(where billing_scope='retainer')
) from filtered;
$$;
revoke all on function public.get_work_attention_counts(text,integer,uuid,uuid,text,text,uuid) from public,anon;
grant execute on function public.get_work_attention_counts(text,integer,uuid,uuid,text,text,uuid) to authenticated;
notify pgrst,'reload schema';
