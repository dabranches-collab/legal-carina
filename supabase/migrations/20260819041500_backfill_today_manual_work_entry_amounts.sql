alter table public.work_entries disable trigger work_entries_prepare;

with targets as (
  select id,firm_id,created_by,
    round(duration_minutes::numeric*effective_hourly_rate/60,2) as corrected_amount
  from public.work_entries
  where source_type='manual'
    and created_at>=timestamptz '2026-08-18 23:00:00+00'
    and created_at<timestamptz '2026-08-19 23:00:00+00'
    and effective_hourly_rate is not null
    and effective_amount is null
), audited as (
  insert into public.manual_overrides(
    firm_id,work_entry_id,field_name,previous_value,calculated_value,
    override_value,reason,created_by
  )
  select firm_id,id,'effective_amount','null'::jsonb,to_jsonb(corrected_amount),
    to_jsonb(corrected_amount),'Correcção técnica do cálculo na criação do movimento',created_by
  from targets
  returning work_entry_id
)
update public.work_entries w
set pre_discount_amount=t.corrected_amount,
    calculated_amount=t.corrected_amount,
    effective_amount=t.corrected_amount,
    last_calculated_at=now()
from targets t
where w.id=t.id
  and exists(select 1 from audited a where a.work_entry_id=w.id);

alter table public.work_entries enable trigger work_entries_prepare;
