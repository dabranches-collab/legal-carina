-- Corrige apenas movimentos horários cujo preço de entrada foi alterado depois
-- do último total manual explícito. Evita sobrescrever totais deliberadamente
-- definidos pelo utilizador.
select set_config('app.pricing_recalculation','on',true);

with candidates as (
  select w.id,w.firm_id,w.updated_by,w.created_by,w.effective_amount,
    round(w.effective_hourly_rate*w.duration_minutes::numeric/60,2) base_amount,
    case when w.discount_percentage is not null
      then round(round(w.effective_hourly_rate*w.duration_minutes::numeric/60,2)*w.discount_percentage/100,2)
      else coalesce(w.effective_discount_amount,0) end discount_amount,
    pricing.last_changed
  from public.work_entries w
  cross join lateral (
    select max(m.created_at) last_changed
    from public.manual_overrides m
    where m.work_entry_id=w.id
      and m.field_name in('duration_minutes','effective_hourly_rate','billing_entity_id','full_record')
  ) pricing
  where w.has_manual_override and not w.is_invoiced
    and w.charge_type='hourly' and w.effective_hourly_rate is not null
    and pricing.last_changed is not null
    and not exists (
      select 1 from public.manual_overrides amount_override
      where amount_override.work_entry_id=w.id
        and amount_override.field_name='effective_amount'
        and amount_override.created_at>=pricing.last_changed
    )
), targets as (
  select *,round(greatest(0,base_amount-discount_amount),2) corrected_amount
  from candidates
  where effective_amount is distinct from round(greatest(0,base_amount-discount_amount),2)
), audited as (
  insert into public.manual_overrides(
    firm_id,work_entry_id,field_name,previous_value,calculated_value,
    override_value,reason,created_by
  )
  select firm_id,id,'effective_amount',coalesce(to_jsonb(effective_amount),'null'::jsonb),
    to_jsonb(corrected_amount),to_jsonb(corrected_amount),
    'Correcção técnica após alteração manual de duração, valor/hora ou Sociedade',
    coalesce(updated_by,created_by)
  from targets
  returning work_entry_id
)
update public.work_entries w set
  pre_discount_amount=t.base_amount,
  calculated_discount_amount=t.discount_amount,
  effective_discount_amount=t.discount_amount,
  calculated_amount=t.corrected_amount,
  effective_amount=t.corrected_amount,
  calculation_version=calculation_version+1,
  last_calculated_at=now()
from targets t
where w.id=t.id and exists(select 1 from audited a where a.work_entry_id=w.id);

notify pgrst,'reload schema';
