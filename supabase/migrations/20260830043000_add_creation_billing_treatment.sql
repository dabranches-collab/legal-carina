create function public.create_work_entry_with_treatment(
  p_work_date date,p_client_profile_id uuid,p_matter_id uuid,p_professional_id uuid,
  p_billing_entity_id uuid,p_activity_description text,p_duration_minutes integer,
  p_observations text default null,p_hourly_rate numeric default null,
  p_billing_scope text default 'standard',p_expenses jsonb default '[]'::jsonb,
  p_billing_state text default 'billable',p_invoice_date date default null
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare new_id uuid;item jsonb;expense_id uuid;result_expenses jsonb:='[]'::jsonb;item_amount numeric;
begin
  if p_billing_scope not in('standard','retainer') or p_billing_state not in('billable','invoiced','paid','retainer') then raise exception 'invalid billing treatment';end if;
  if (p_billing_scope='retainer')<>(p_billing_state='retainer') then raise exception 'inconsistent billing treatment';end if;
  if p_billing_state in('invoiced','paid') and p_invoice_date is null then raise exception 'invoice date is required';end if;
  if jsonb_typeof(coalesce(p_expenses,'[]'::jsonb))<>'array' or jsonb_array_length(coalesce(p_expenses,'[]'::jsonb))>100 then raise exception 'invalid expenses';end if;

  new_id:=public.create_work_entry(p_work_date,p_client_profile_id,p_matter_id,p_professional_id,p_billing_entity_id,p_activity_description,p_duration_minutes,p_observations,case when p_billing_scope='retainer' then null else p_hourly_rate end);

  if p_billing_scope='retainer' and not exists(
    select 1 from public.work_entries w join public.client_retainers r on r.client_id=w.client_id and r.active
    where w.id=new_id and r.starts_on<=p_work_date and(r.ends_on is null or r.ends_on>=p_work_date)
  ) then raise exception 'client has no active retainer on work date';end if;

  update public.work_entries set
    billing_scope=p_billing_scope,
    status=case p_billing_state when 'billable' then 'approved' when 'invoiced' then 'invoiced' when 'paid' then 'paid' else 'draft' end,
    is_billable=p_billing_state<>'retainer',
    is_invoiced=p_billing_state in('invoiced','paid'),
    invoice_date=case when p_billing_state in('invoiced','paid') then p_invoice_date else null end,
    is_paid=p_billing_state='paid'
  where id=new_id;

  for item in select value from jsonb_array_elements(coalesce(p_expenses,'[]'::jsonb)) loop
    if jsonb_typeof(item)<>'object' or btrim(coalesce(item->>'key',''))='' then raise exception 'invalid expense';end if;
    begin item_amount:=(item->>'amount')::numeric;exception when others then raise exception 'invalid expense';end;
    expense_id:=public.create_work_entry_expense(new_id,item_amount,item->>'observations');
    result_expenses:=result_expenses||jsonb_build_array(jsonb_build_object('key',item->>'key','id',expense_id));
  end loop;
  return jsonb_build_object('workEntryId',new_id,'expenses',result_expenses);
end;$$;

revoke all on function public.create_work_entry_with_treatment(date,uuid,uuid,uuid,uuid,text,integer,text,numeric,text,jsonb,text,date) from public,anon;
grant execute on function public.create_work_entry_with_treatment(date,uuid,uuid,uuid,uuid,text,integer,text,numeric,text,jsonb,text,date) to authenticated;
