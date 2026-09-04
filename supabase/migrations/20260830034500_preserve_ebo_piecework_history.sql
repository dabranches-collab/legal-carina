-- Preserve the four EBO movements that had an explicit positive hourly rate
-- before the historical retainer reconciliation. The audit trail remains on.
alter table public.work_entries disable trigger work_entries_prepare;

with targets as (
  select id
  from public.work_entries
  where client_id='30a36d77-82bb-4843-ac61-17c5353562d6'
), transitions as (
  select distinct on(a.entity_id) a.entity_id,a.previous_data
  from public.audit_log a
  join targets t on t.id=a.entity_id
  where a.entity_type='work_entries'
    and a.action='update'
    and a.previous_data->>'billing_scope'='standard'
    and a.new_data->>'billing_scope'='retainer'
  order by a.entity_id,a.created_at desc
)
update public.work_entries w
set billing_scope='standard',
    effective_hourly_rate=nullif(t.previous_data->>'effective_hourly_rate','')::numeric,
    effective_amount=nullif(t.previous_data->>'effective_amount','')::numeric,
    calculated_amount=nullif(t.previous_data->>'calculated_amount','')::numeric,
    imported_amount=nullif(t.previous_data->>'imported_amount','')::numeric,
    manual_amount=nullif(t.previous_data->>'manual_amount','')::numeric,
    is_billable=coalesce((t.previous_data->>'is_billable')::boolean,true),
    is_invoiced=coalesce((t.previous_data->>'is_invoiced')::boolean,false),
    invoice_date=nullif(t.previous_data->>'invoice_date','')::date,
    is_paid=coalesce((t.previous_data->>'is_paid')::boolean,false),
    status=coalesce(nullif(t.previous_data->>'status',''),'draft'),
    charge_type=coalesce(nullif(t.previous_data->>'charge_type',''),'hourly'),
    updated_at=now()
from transitions t
where w.id=t.entity_id
  and nullif(t.previous_data->>'effective_hourly_rate','')::numeric>0;

alter table public.work_entries enable trigger work_entries_prepare;
