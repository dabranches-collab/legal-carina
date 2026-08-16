-- Public pricing actions validate row scope and financial visibility before
-- delegating to the private calculation engine.

create or replace function public.apply_work_entry_override(
  p_work_entry_id uuid,
  p_field_name text,
  p_override_value jsonb,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  entry public.work_entries%rowtype;
  target_billing_entity_id uuid;
begin
  if (select auth.uid()) is null then raise exception 'authentication required' using errcode='28000'; end if;
  select * into entry from public.work_entries where id=p_work_entry_id;
  if entry.id is null then raise exception 'work entry not found' using errcode='P0002'; end if;
  if not private.has_scope_access(entry.firm_id,entry.billing_entity_id,entry.client_id,entry.matter_id,'edit')
     or not private.can_view_billing_financials(entry.firm_id,entry.billing_entity_id) then
    raise exception 'not authorized' using errcode='42501';
  end if;
  if p_field_name='billing_entity_id' then
    target_billing_entity_id := (p_override_value #>> '{}')::uuid;
    if target_billing_entity_id is null
       or not exists(select 1 from public.billing_entities b where b.id=target_billing_entity_id and b.firm_id=entry.firm_id)
       or not private.can_view_billing_financials(entry.firm_id,target_billing_entity_id) then
      raise exception 'not authorized for target billing entity' using errcode='42501';
    end if;
  end if;
  return private.apply_work_entry_override(p_work_entry_id,p_field_name,p_override_value,p_reason);
end;
$$;

create or replace function public.preview_work_entry_recalculation(
  p_target_ids uuid[],
  p_skip_overrides boolean default true,
  p_uninvoiced_only boolean default true
)
returns table (selected_count integer, current_total numeric, proposed_total numeric, difference numeric, records_without_price integer)
language plpgsql
security definer
set search_path = ''
as $$
declare unauthorized_count integer;
begin
  if (select auth.uid()) is null then raise exception 'authentication required' using errcode='28000'; end if;
  if coalesce(cardinality(p_target_ids),0)=0 or cardinality(p_target_ids)>10000 then
    raise exception 'between 1 and 10000 entries are required';
  end if;
  select count(*) into unauthorized_count from public.work_entries w
  where w.id=any(p_target_ids) and (
    not private.has_scope_access(w.firm_id,w.billing_entity_id,w.client_id,w.matter_id,'edit')
    or not private.can_view_billing_financials(w.firm_id,w.billing_entity_id));
  if unauthorized_count>0 then raise exception 'not authorized for all selected entries' using errcode='42501'; end if;
  return query
  with selected as (
    select w.id,w.effective_amount
    from public.work_entries w
    where w.id=any(p_target_ids)
      and (not p_skip_overrides or not w.has_manual_override)
      and (not p_uninvoiced_only or not w.is_invoiced)
      and w.status<>'cancelled'
  ), proposal as (
    select s.effective_amount,c.proposed_amount from selected s
    cross join lateral private.calculate_work_entry(s.id) c
  )
  select count(*)::integer,coalesce(sum(effective_amount),0),coalesce(sum(proposed_amount),0),
    coalesce(sum(proposed_amount-effective_amount),0),count(*) filter(where proposed_amount is null)::integer
  from proposal;
end;
$$;

create or replace function public.recalculate_work_entries(
  p_target_ids uuid[],
  p_skip_overrides boolean default true,
  p_uninvoiced_only boolean default true
)
returns table (updated_count integer, previous_total numeric, proposed_total numeric, difference numeric)
language plpgsql
security definer
set search_path = ''
as $$
declare unauthorized_count integer;
begin
  if (select auth.uid()) is null then raise exception 'authentication required' using errcode='28000'; end if;
  if coalesce(cardinality(p_target_ids),0)=0 or cardinality(p_target_ids)>10000 then raise exception 'between 1 and 10000 entries are required'; end if;
  select count(*) into unauthorized_count from public.work_entries w
  where w.id=any(p_target_ids) and (
    not private.has_scope_access(w.firm_id,w.billing_entity_id,w.client_id,w.matter_id,'edit')
    or not private.can_view_billing_financials(w.firm_id,w.billing_entity_id));
  if unauthorized_count>0 then raise exception 'not authorized for all selected entries' using errcode='42501'; end if;
  return query select * from private.recalculate_work_entries(p_target_ids,p_skip_overrides,p_uninvoiced_only);
end;
$$;

revoke all on function public.apply_work_entry_override(uuid,text,jsonb,text) from public,anon;
revoke all on function public.preview_work_entry_recalculation(uuid[],boolean,boolean) from public,anon;
revoke all on function public.recalculate_work_entries(uuid[],boolean,boolean) from public,anon;
grant execute on function public.apply_work_entry_override(uuid,text,jsonb,text) to authenticated;
grant execute on function public.preview_work_entry_recalculation(uuid[],boolean,boolean) to authenticated;
grant execute on function public.recalculate_work_entries(uuid[],boolean,boolean) to authenticated;
