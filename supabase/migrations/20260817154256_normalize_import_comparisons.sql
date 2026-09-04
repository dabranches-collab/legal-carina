create or replace function private.import_changed_fields(p_row jsonb, p_work_entry_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(field_name order by ordinal), '[]'::jsonb)
  from (
    select field_name, ordinal
    from public.work_entries w
    join public.clients c on c.id = w.client_id and c.firm_id = w.firm_id
    join public.client_profiles cp on cp.id = w.client_profile_id and cp.firm_id = w.firm_id
    join public.professionals p on p.id = w.professional_id and p.firm_id = w.firm_id
    left join public.billing_entities b on b.id = w.billing_entity_id and b.firm_id = w.firm_id
    cross join lateral (values
      ('date', 1, to_jsonb(w.work_date) is distinct from to_jsonb(private.import_date(p_row#>>'{normalized,date}'))),
      ('client', 2, upper(btrim(c.display_name)) is distinct from upper(btrim(p_row#>>'{cells,clientName,text}'))),
      ('clientCode', 3, upper(btrim(c.client_code)) is distinct from upper(btrim(p_row#>>'{cells,clientCode,text}'))),
      ('clientType', 4, p_row#>>'{normalized,clientType}' is not null and cp.client_type is distinct from p_row#>>'{normalized,clientType}'),
      ('activity', 5, upper(btrim(w.activity_description)) is distinct from upper(btrim(p_row#>>'{cells,activity,text}'))),
      ('responsible', 6, upper(btrim(p.display_name)) is distinct from upper(btrim(p_row#>>'{cells,responsible,text}'))),
      ('duration', 7, w.imported_duration_minutes is distinct from private.import_integer(p_row#>>'{normalized,durationMinutes}')),
      ('hourlyRate', 8, w.imported_hourly_rate is distinct from private.import_numeric(p_row#>>'{normalized,hourlyRate}')),
      ('amount', 9, case when w.imported_amount is null or private.import_numeric(p_row#>>'{normalized,importedAmount}') is null then w.imported_amount is distinct from private.import_numeric(p_row#>>'{normalized,importedAmount}') else abs(w.imported_amount-private.import_numeric(p_row#>>'{normalized,importedAmount}'))>0.005 end),
      ('billingEntity', 10, upper(btrim(coalesce(b.name, ''))) is distinct from upper(btrim(coalesce(p_row#>>'{cells,billingEntity,text}', '')))),
      ('invoiced', 11, w.is_invoiced is distinct from coalesce(private.import_boolean(p_row#>>'{normalized,invoiced}'), false)),
      ('invoiceDate', 12, w.invoice_date is distinct from private.import_date(p_row#>>'{normalized,invoiceDate}')),
      ('paid', 13, w.is_paid is distinct from coalesce(private.import_boolean(p_row#>>'{normalized,paid}'), false)),
      ('archive', 14, w.archive_status is distinct from nullif(p_row#>>'{normalized,archive}', '')),
      ('notes', 15, btrim(coalesce(w.observations, '')) is distinct from btrim(coalesce(p_row#>>'{cells,notes,text}', '')))
    ) changed(field_name, ordinal, differs)
    where w.id = p_work_entry_id and differs
  ) differences;
$$;

revoke all on function private.import_changed_fields(jsonb, uuid) from public, anon, authenticated;
