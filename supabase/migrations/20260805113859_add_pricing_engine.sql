-- Commercial rules and pricing engine. No existing amount is recalculated automatically.

alter table public.work_entries drop constraint if exists work_entries_status_check;
alter table public.work_entries drop constraint if exists work_entries_archive_status_check;
alter table public.invoices drop constraint if exists invoices_status_check;

update public.work_entries set status = 'approved' where status = 'validated';
update public.work_entries set status = 'paid' where is_paid;
update public.work_entries set status = 'invoiced' where is_invoiced and not is_paid;
update public.work_entries set archive_status = 'gaveta' where archive_status = 'drawer';
update public.work_entries set archive_status = 'findos' where archive_status = 'closed_files';

alter table public.work_entries
  add constraint work_entries_status_check
    check (status in ('draft', 'pending_review', 'approved', 'invoiced', 'paid', 'non_billable', 'cancelled')),
  add constraint work_entries_archive_status_check
    check (archive_status is null or archive_status in ('none', 'gaveta', 'dossier', 'findos', 'digital', 'other'));

alter table public.invoices
  add constraint invoices_status_check
    check (status in ('draft', 'issued', 'partially_paid', 'paid', 'overdue', 'cancelled'));

alter table public.rate_rules
  add column charge_type text not null default 'hourly',
  add column configuration jsonb not null default '{}'::jsonb,
  add column specificity_rank smallint generated always as (
    case
      when matter_id is not null and professional_id is not null then 700
      when client_id is not null and professional_id is not null then 600
      when client_id is not null then 500
      when billing_entity_id is not null then 400
      when professional_id is not null then 300
      when service_type_id is not null then 200
      else 100
    end
  ) stored,
  add constraint rate_rules_charge_type_check check (
    charge_type in ('hourly', 'fixed', 'retainer', 'hour_package', 'per_act', 'free', 'non_billable', 'manual_negotiated')
  ),
  add constraint rate_rules_configuration_object_check check (jsonb_typeof(configuration) = 'object'),
  add constraint rate_rules_supported_scope_check check (
    (matter_id is not null and professional_id is not null and client_id is null and billing_entity_id is null and service_type_id is null)
    or (client_id is not null and professional_id is not null and matter_id is null and billing_entity_id is null and service_type_id is null)
    or (client_id is not null and matter_id is null and professional_id is null and billing_entity_id is null and service_type_id is null)
    or (billing_entity_id is not null and client_id is null and matter_id is null and professional_id is null and service_type_id is null)
    or (professional_id is not null and client_id is null and matter_id is null and billing_entity_id is null and service_type_id is null)
    or (service_type_id is not null and client_id is null and matter_id is null and professional_id is null and billing_entity_id is null)
    or (client_id is null and matter_id is null and professional_id is null and billing_entity_id is null and service_type_id is null)
  );

alter table public.rate_rules drop constraint if exists rate_rules_check;
alter table public.rate_rules
  add constraint rate_rules_charge_value_check check (
    (charge_type = 'hourly' and hourly_rate is not null)
    or (charge_type in ('fixed', 'retainer', 'hour_package', 'per_act', 'manual_negotiated') and fixed_amount is not null)
    or (charge_type in ('free', 'non_billable') and coalesce(hourly_rate, fixed_amount, 0) = 0)
  );

create index rate_rules_lookup_idx on public.rate_rules (
  firm_id, specificity_rank desc, priority desc, valid_from desc
) where active;

alter table public.work_entries
  add column imported_duration_minutes integer,
  add column imported_amount numeric(14,2),
  add column specific_hourly_rate numeric(12,2),
  add column manual_amount numeric(14,2),
  add column pricing_rule_id uuid,
  add column service_type_id uuid,
  add column charge_type text,
  add column pre_discount_amount numeric(14,2),
  add column calculated_discount_amount numeric(14,2),
  add column effective_discount_amount numeric(14,2),
  add column discount_percentage numeric(7,4),
  add column discount_reason text,
  add column has_manual_override boolean not null default false,
  add column calculation_version integer not null default 1,
  add column last_calculated_at timestamptz,
  add constraint work_entries_imported_duration_check check (imported_duration_minutes is null or imported_duration_minutes >= 0),
  add constraint work_entries_imported_amount_check check (imported_amount is null or imported_amount >= 0),
  add constraint work_entries_specific_rate_check check (specific_hourly_rate is null or specific_hourly_rate >= 0),
  add constraint work_entries_manual_amount_check check (manual_amount is null or manual_amount >= 0),
  add constraint work_entries_discount_amount_check check (calculated_discount_amount is null or calculated_discount_amount >= 0),
  add constraint work_entries_effective_discount_check check (effective_discount_amount is null or effective_discount_amount >= 0),
  add constraint work_entries_discount_percentage_check check (discount_percentage is null or (discount_percentage >= 0 and discount_percentage <= 100)),
  add constraint work_entries_charge_type_check check (
    charge_type is null or charge_type in ('hourly', 'fixed', 'retainer', 'hour_package', 'per_act', 'free', 'non_billable', 'manual_negotiated')
  ),
  add foreign key (firm_id, pricing_rule_id) references public.rate_rules(firm_id, id) on delete restrict,
  add foreign key (firm_id, service_type_id) references public.service_types(firm_id, id) on delete restrict;

update public.work_entries
set imported_duration_minutes = duration_minutes,
    imported_amount = effective_amount
where source_type in ('xlsx', 'csv');

create index work_entries_pricing_rule_id_idx on public.work_entries(pricing_rule_id) where pricing_rule_id is not null;
create index work_entries_service_type_id_idx on public.work_entries(service_type_id) where service_type_id is not null;
create index work_entries_recalculation_idx on public.work_entries(firm_id, work_date, is_invoiced)
where not has_manual_override and status <> 'cancelled';

create table public.discounts (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.law_firms(id) on delete restrict,
  name text not null check (btrim(name) <> ''),
  scope_type text not null check (scope_type in ('client', 'work_entry', 'period')),
  client_id uuid,
  work_entry_id uuid,
  discount_type text not null check (discount_type in ('percentage', 'fixed')),
  percentage numeric(7,4) check (percentage is null or (percentage >= 0 and percentage <= 100)),
  fixed_amount numeric(14,2) check (fixed_amount is null or fixed_amount >= 0),
  currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  valid_from date not null,
  valid_until date,
  priority integer not null default 100 check (priority >= 0),
  reason text not null check (btrim(reason) <> ''),
  authorized_by uuid not null references auth.users(id) on delete restrict,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (firm_id, client_id) references public.clients(firm_id, id) on delete restrict,
  foreign key (firm_id, work_entry_id) references public.work_entries(firm_id, id) on delete restrict,
  unique (firm_id, id),
  check (valid_until is null or valid_until >= valid_from),
  check ((discount_type = 'percentage' and percentage is not null and fixed_amount is null)
      or (discount_type = 'fixed' and fixed_amount is not null and percentage is null)),
  check ((scope_type = 'client' and client_id is not null and work_entry_id is null)
      or (scope_type = 'work_entry' and work_entry_id is not null and client_id is null)
      or (scope_type = 'period' and client_id is null and work_entry_id is null))
);

create index discounts_client_period_idx on public.discounts(client_id, valid_from, valid_until) where active and scope_type = 'client';
create index discounts_work_entry_idx on public.discounts(work_entry_id) where active and scope_type = 'work_entry';
create index discounts_period_idx on public.discounts(firm_id, valid_from, valid_until) where active and scope_type = 'period';
create index discounts_authorized_by_idx on public.discounts(authorized_by);

create trigger discounts_set_updated_at before update on public.discounts
for each row execute function private.set_updated_at();
create trigger discounts_audit after insert or update or delete on public.discounts
for each row execute function private.audit_business_change();

alter table public.discounts enable row level security;
revoke all on public.discounts from anon;
grant select, insert, update on public.discounts to authenticated;
create policy discounts_select_member on public.discounts for select to authenticated
using ((select private.is_firm_member(firm_id)));
create policy discounts_insert_privileged on public.discounts for insert to authenticated
with check ((select private.has_firm_role(firm_id, array['owner', 'admin', 'billing'])) and authorized_by = (select auth.uid()));
create policy discounts_update_privileged on public.discounts for update to authenticated
using ((select private.has_firm_role(firm_id, array['owner', 'admin', 'billing'])))
with check ((select private.has_firm_role(firm_id, array['owner', 'admin', 'billing'])));

create or replace function private.resolve_rate_rule(
  target_firm_id uuid,
  service_date date,
  target_client_id uuid,
  target_matter_id uuid,
  target_professional_id uuid,
  target_billing_entity_id uuid,
  target_service_type_id uuid
)
returns table (
  rule_id uuid,
  charge_type text,
  hourly_rate numeric,
  fixed_amount numeric,
  currency text,
  specificity_rank smallint,
  priority integer
)
language sql
stable
set search_path = ''
as $$
  select rr.id, rr.charge_type, rr.hourly_rate, rr.fixed_amount, rr.currency, rr.specificity_rank, rr.priority
  from public.rate_rules rr
  where rr.firm_id = target_firm_id
    and rr.active
    and rr.valid_from <= service_date
    and (rr.valid_until is null or rr.valid_until >= service_date)
    and (rr.client_id is null or rr.client_id = target_client_id)
    and (rr.matter_id is null or rr.matter_id = target_matter_id)
    and (rr.professional_id is null or rr.professional_id = target_professional_id)
    and (rr.billing_entity_id is null or rr.billing_entity_id = target_billing_entity_id)
    and (rr.service_type_id is null or rr.service_type_id = target_service_type_id)
  order by rr.specificity_rank desc, rr.priority desc, rr.created_at desc, rr.id
  limit 1;
$$;

create or replace function private.calculate_work_entry(target_work_entry_id uuid)
returns table (
  work_entry_id uuid,
  pricing_rule_id uuid,
  charge_type text,
  hourly_rate numeric,
  pre_discount_amount numeric,
  discount_amount numeric,
  proposed_amount numeric,
  currency text
)
language sql
stable
set search_path = ''
as $$
  with entry as (
    select we.* from public.work_entries we where we.id = target_work_entry_id
  ), selected_rule as (
    select r.*
    from entry e
    left join lateral private.resolve_rate_rule(
      e.firm_id, e.work_date, e.client_id, e.matter_id, e.professional_id,
      e.billing_entity_id, e.service_type_id
    ) r on true
  ), base as (
    select e.*,
      sr.rule_id,
      coalesce(case when e.specific_hourly_rate is not null then 'hourly' end, sr.charge_type) as selected_charge_type,
      coalesce(e.specific_hourly_rate, sr.hourly_rate) as selected_hourly_rate,
      sr.fixed_amount as selected_fixed_amount,
      coalesce(sr.currency, e.currency) as selected_currency,
      case
        when e.specific_hourly_rate is not null then round(e.specific_hourly_rate * e.duration_minutes / 60.0, 2)
        when sr.charge_type = 'hourly' then round(sr.hourly_rate * e.duration_minutes / 60.0, 2)
        when sr.charge_type in ('fixed', 'retainer', 'hour_package', 'per_act', 'manual_negotiated') then sr.fixed_amount
        when sr.charge_type in ('free', 'non_billable') then 0::numeric
        else null::numeric
      end as base_amount
    from entry e left join selected_rule sr on true
  ), selected_discount as (
    select b.id as entry_id, d.id, d.discount_type, d.percentage, d.fixed_amount
    from base b
    left join lateral (
      select d.* from public.discounts d
      where d.firm_id = b.firm_id and d.active
        and d.valid_from <= b.work_date and (d.valid_until is null or d.valid_until >= b.work_date)
        and ((d.scope_type = 'work_entry' and d.work_entry_id = b.id)
          or (d.scope_type = 'client' and d.client_id = b.client_id)
          or d.scope_type = 'period')
      order by case d.scope_type when 'work_entry' then 300 when 'client' then 200 else 100 end desc,
        d.priority desc, d.created_at desc, d.id
      limit 1
    ) d on true
  )
  select b.id, b.rule_id, b.selected_charge_type, b.selected_hourly_rate, b.base_amount,
    case
      when b.base_amount is null then null
      when sd.discount_type = 'percentage' then round(b.base_amount * sd.percentage / 100.0, 2)
      when sd.discount_type = 'fixed' then least(sd.fixed_amount, b.base_amount)
      else 0::numeric
    end as discount_amount,
    case
      when b.base_amount is null then null
      when sd.discount_type = 'percentage' then greatest(0, round(b.base_amount * (1 - sd.percentage / 100.0), 2))
      when sd.discount_type = 'fixed' then greatest(0, b.base_amount - sd.fixed_amount)
      else b.base_amount
    end as proposed_amount,
    b.selected_currency
  from base b left join selected_discount sd on sd.entry_id = b.id;
$$;

create or replace function private.has_current_override(target_work_entry_id uuid, target_field_name text, target_value jsonb)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.manual_overrides mo
    where mo.work_entry_id = target_work_entry_id
      and mo.field_name = target_field_name
      and mo.override_value = target_value
      and mo.reverted_at is null
      and mo.created_at >= transaction_timestamp()
  );
$$;

create or replace function private.prepare_work_entry()
returns trigger
language plpgsql
set search_path = ''
as $$
declare is_recalculation boolean := coalesce(current_setting('app.pricing_recalculation', true), '') = 'on';
begin
  if tg_op = 'INSERT' then
    new.imported_duration_minutes := coalesce(new.imported_duration_minutes, case when new.source_type in ('xlsx', 'csv') then new.duration_minutes end);
    new.effective_hourly_rate := coalesce(new.effective_hourly_rate, new.specific_hourly_rate, new.calculated_hourly_rate, new.imported_hourly_rate);
    new.calculated_amount := coalesce(new.calculated_amount, round((new.duration_minutes::numeric / 60) * new.calculated_hourly_rate, 2));
    new.effective_amount := coalesce(new.effective_amount, new.imported_amount, new.calculated_amount, round((new.duration_minutes::numeric / 60) * new.effective_hourly_rate, 2));
    return new;
  end if;

  if (
    new.billing_entity_id is distinct from old.billing_entity_id
    or new.imported_hourly_rate is distinct from old.imported_hourly_rate
    or new.calculated_hourly_rate is distinct from old.calculated_hourly_rate
    or new.effective_hourly_rate is distinct from old.effective_hourly_rate
    or new.calculated_amount is distinct from old.calculated_amount
    or new.effective_amount is distinct from old.effective_amount
    or new.effective_discount_amount is distinct from old.effective_discount_amount
    or new.currency is distinct from old.currency
    or new.is_invoiced is distinct from old.is_invoiced
    or new.invoice_date is distinct from old.invoice_date
    or new.is_paid is distinct from old.is_paid
  ) and not (select private.has_firm_role(old.firm_id, array['owner', 'admin', 'billing'])) then
    raise exception 'financial fields require owner, admin, or billing role';
  end if;

  if is_recalculation and old.has_manual_override then
    raise exception 'recalculation cannot replace a manual override';
  end if;

  if new.duration_minutes is distinct from old.duration_minutes
    and not is_recalculation
    and not private.has_current_override(old.id, 'duration_minutes', to_jsonb(new.duration_minutes)) then
    raise exception 'duration_minutes requires a matching manual override';
  end if;
  if new.effective_hourly_rate is distinct from old.effective_hourly_rate
    and not is_recalculation
    and not private.has_current_override(old.id, 'effective_hourly_rate', to_jsonb(new.effective_hourly_rate)) then
    raise exception 'effective_hourly_rate requires a matching manual override';
  end if;
  if new.effective_discount_amount is distinct from old.effective_discount_amount
    and not is_recalculation
    and not private.has_current_override(old.id, 'effective_discount_amount', to_jsonb(new.effective_discount_amount)) then
    raise exception 'effective_discount_amount requires a matching manual override';
  end if;
  if new.effective_amount is distinct from old.effective_amount
    and not is_recalculation
    and not private.has_current_override(old.id, 'effective_amount', to_jsonb(new.effective_amount)) then
    raise exception 'effective_amount requires a matching manual override';
  end if;
  if new.billing_entity_id is distinct from old.billing_entity_id
    and not private.has_current_override(old.id, 'billing_entity_id', to_jsonb(new.billing_entity_id)) then
    raise exception 'billing_entity_id requires a matching manual override';
  end if;
  if new.is_invoiced is distinct from old.is_invoiced
    and not private.has_current_override(old.id, 'is_invoiced', to_jsonb(new.is_invoiced)) then
    raise exception 'is_invoiced requires a matching manual override';
  end if;
  if new.is_paid is distinct from old.is_paid
    and not private.has_current_override(old.id, 'is_paid', to_jsonb(new.is_paid)) then
    raise exception 'is_paid requires a matching manual override';
  end if;
  return new;
end;
$$;

create or replace function private.sync_manual_override_indicator()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare target_work_entry_id uuid := coalesce(new.work_entry_id, old.work_entry_id);
begin
  update public.work_entries
  set has_manual_override = exists (
    select 1 from public.manual_overrides where work_entry_id = target_work_entry_id and reverted_at is null
  )
  where id = target_work_entry_id;
  return new;
end;
$$;

create trigger manual_overrides_sync_indicator after insert or update on public.manual_overrides
for each row execute function private.sync_manual_override_indicator();

create or replace function private.apply_work_entry_override(
  target_work_entry_id uuid,
  target_field_name text,
  target_override_value jsonb,
  override_reason text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  entry public.work_entries%rowtype;
  override_id uuid;
  previous_value jsonb;
  calculated_value jsonb;
begin
  if (select auth.uid()) is null then raise exception 'authentication required'; end if;
  if btrim(override_reason) = '' then raise exception 'override reason is required'; end if;
  if target_field_name not in ('duration_minutes', 'effective_hourly_rate', 'effective_discount_amount', 'effective_amount', 'billing_entity_id', 'is_invoiced', 'is_paid') then
    raise exception 'unsupported override field';
  end if;
  select * into entry from public.work_entries where id = target_work_entry_id for update;
  if entry.id is null then raise exception 'work entry not found'; end if;
  if not (select private.has_firm_role(entry.firm_id, array['owner', 'admin', 'billing'])) then raise exception 'not authorized'; end if;
  if target_field_name = 'is_invoiced' and (target_override_value #>> '{}')::boolean and entry.invoice_date is null then
    raise exception 'invoice_date is required before marking an entry as invoiced';
  end if;
  if target_field_name = 'is_invoiced' and not (target_override_value #>> '{}')::boolean and entry.is_paid then
    raise exception 'a paid entry cannot be marked as not invoiced';
  end if;
  if target_field_name = 'is_paid' and (target_override_value #>> '{}')::boolean and not entry.is_invoiced then
    raise exception 'an entry must be invoiced before it can be marked as paid';
  end if;

  previous_value := case target_field_name
    when 'duration_minutes' then to_jsonb(entry.duration_minutes)
    when 'effective_hourly_rate' then to_jsonb(entry.effective_hourly_rate)
    when 'effective_discount_amount' then to_jsonb(entry.effective_discount_amount)
    when 'effective_amount' then to_jsonb(entry.effective_amount)
    when 'billing_entity_id' then to_jsonb(entry.billing_entity_id)
    when 'is_invoiced' then to_jsonb(entry.is_invoiced)
    when 'is_paid' then to_jsonb(entry.is_paid)
  end;
  calculated_value := case target_field_name
    when 'duration_minutes' then to_jsonb(entry.imported_duration_minutes)
    when 'effective_hourly_rate' then to_jsonb(entry.calculated_hourly_rate)
    when 'effective_discount_amount' then to_jsonb(entry.calculated_discount_amount)
    when 'effective_amount' then to_jsonb(entry.calculated_amount)
    else previous_value
  end;

  insert into public.manual_overrides (
    firm_id, work_entry_id, field_name, previous_value, calculated_value,
    override_value, reason, created_by
  ) values (
    entry.firm_id, entry.id, target_field_name, previous_value, calculated_value,
    target_override_value, override_reason, (select auth.uid())
  ) returning id into override_id;

  case target_field_name
    when 'duration_minutes' then update public.work_entries set duration_minutes = (target_override_value #>> '{}')::integer where id = entry.id;
    when 'effective_hourly_rate' then update public.work_entries set effective_hourly_rate = (target_override_value #>> '{}')::numeric where id = entry.id;
    when 'effective_discount_amount' then update public.work_entries set effective_discount_amount = (target_override_value #>> '{}')::numeric where id = entry.id;
    when 'effective_amount' then update public.work_entries set effective_amount = (target_override_value #>> '{}')::numeric, manual_amount = (target_override_value #>> '{}')::numeric where id = entry.id;
    when 'billing_entity_id' then update public.work_entries set billing_entity_id = (target_override_value #>> '{}')::uuid where id = entry.id;
    when 'is_invoiced' then update public.work_entries set
      is_invoiced = (target_override_value #>> '{}')::boolean,
      status = case when (target_override_value #>> '{}')::boolean then 'invoiced' else 'approved' end
      where id = entry.id;
    when 'is_paid' then update public.work_entries set
      is_paid = (target_override_value #>> '{}')::boolean,
      status = case when (target_override_value #>> '{}')::boolean then 'paid' else 'invoiced' end
      where id = entry.id;
  end case;
  return override_id;
end;
$$;

create or replace function private.recalculate_work_entries(
  target_ids uuid[],
  skip_overrides boolean default true,
  uninvoiced_only boolean default true
)
returns table (updated_count integer, previous_total numeric, proposed_total numeric, difference numeric)
language plpgsql
security definer
set search_path = ''
as $$
declare unauthorized_count integer;
begin
  if (select auth.uid()) is null then raise exception 'authentication required'; end if;
  select count(*) into unauthorized_count from public.work_entries we
  where we.id = any(target_ids)
    and not (select private.has_firm_role(we.firm_id, array['owner', 'admin', 'billing']));
  if unauthorized_count > 0 then raise exception 'not authorized for all selected entries'; end if;

  perform set_config('app.pricing_recalculation', 'on', true);
  return query
  with locked as (
    select we.id, we.effective_amount as old_amount
    from public.work_entries we
    where we.id = any(target_ids)
      and (not skip_overrides or not we.has_manual_override)
      and (not uninvoiced_only or not we.is_invoiced)
      and we.status <> 'cancelled'
    order by we.id for update
  ), proposals as (
    select l.id, l.old_amount, c.* from locked l
    cross join lateral private.calculate_work_entry(l.id) c
  ), updated as (
    update public.work_entries we set
      pricing_rule_id = p.pricing_rule_id,
      charge_type = p.charge_type,
      calculated_hourly_rate = p.hourly_rate,
      pre_discount_amount = p.pre_discount_amount,
      calculated_discount_amount = p.discount_amount,
      effective_discount_amount = p.discount_amount,
      calculated_amount = p.proposed_amount,
      effective_hourly_rate = p.hourly_rate,
      effective_amount = p.proposed_amount,
      currency = p.currency,
      calculation_version = we.calculation_version + 1,
      last_calculated_at = now()
    from proposals p
    where we.id = p.id and p.proposed_amount is not null
    returning p.old_amount, we.effective_amount
  )
  select count(*)::integer, coalesce(sum(old_amount), 0), coalesce(sum(effective_amount), 0),
    coalesce(sum(effective_amount - old_amount), 0)
  from updated;
end;
$$;

revoke all on function private.resolve_rate_rule(uuid, date, uuid, uuid, uuid, uuid, uuid) from public, anon;
revoke all on function private.calculate_work_entry(uuid) from public, anon;
revoke all on function private.has_current_override(uuid, text, jsonb) from public, anon, authenticated;
revoke all on function private.sync_manual_override_indicator() from public, anon, authenticated;
revoke all on function private.apply_work_entry_override(uuid, text, jsonb, text) from public, anon;
revoke all on function private.recalculate_work_entries(uuid[], boolean, boolean) from public, anon;
grant execute on function private.resolve_rate_rule(uuid, date, uuid, uuid, uuid, uuid, uuid) to authenticated;
grant execute on function private.calculate_work_entry(uuid) to authenticated;
grant execute on function private.apply_work_entry_override(uuid, text, jsonb, text) to authenticated;
grant execute on function private.recalculate_work_entries(uuid[], boolean, boolean) to authenticated;;
