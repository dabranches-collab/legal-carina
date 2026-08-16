-- Legal Carina: normalized, tenant-scoped foundation.
-- This migration intentionally contains no historical/customer seed data.

create schema if not exists private;
revoke all on schema private from public, anon;

create table public.law_firms (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.firm_members (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.law_firms(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'billing', 'professional', 'viewer')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (firm_id, user_id),
  unique (firm_id, id)
);

create table public.billing_entities (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.law_firms(id) on delete restrict,
  name text not null check (btrim(name) <> ''),
  legal_name text,
  tax_number text,
  address text,
  email text,
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (firm_id, name),
  unique (firm_id, id)
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.law_firms(id) on delete restrict,
  client_code text not null check (btrim(client_code) <> ''),
  client_type text not null check (client_type in ('individual', 'company')),
  display_name text not null check (btrim(display_name) <> ''),
  legal_name text,
  tax_number text,
  email text,
  phone text,
  address text,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (firm_id, client_code),
  unique (firm_id, id)
);

create table public.client_contacts (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.law_firms(id) on delete restrict,
  client_id uuid not null,
  name text not null check (btrim(name) <> ''),
  email text,
  phone text,
  role text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (firm_id, client_id) references public.clients(firm_id, id) on delete restrict,
  unique (firm_id, id)
);

create table public.professionals (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.law_firms(id) on delete restrict,
  user_id uuid references auth.users(id) on delete set null,
  display_name text not null check (btrim(display_name) <> ''),
  full_name text,
  email text,
  role text,
  active boolean not null default true,
  default_hourly_rate numeric(12,2) check (default_hourly_rate is null or default_hourly_rate >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (firm_id, display_name),
  unique (firm_id, id)
);

create table public.service_types (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.law_firms(id) on delete restrict,
  name text not null check (btrim(name) <> ''),
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (firm_id, name),
  unique (firm_id, id)
);

create table public.matters (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.law_firms(id) on delete restrict,
  client_id uuid not null,
  matter_code text not null check (btrim(matter_code) <> ''),
  title text not null check (btrim(title) <> ''),
  description text,
  responsible_professional_id uuid,
  billing_entity_id uuid,
  status text not null default 'open' check (status in ('open', 'on_hold', 'closed', 'archived')),
  opened_at date,
  closed_at date,
  archived_at timestamptz,
  archive_location text check (archive_location is null or archive_location in ('drawer', 'dossier', 'closed_files')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (firm_id, client_id) references public.clients(firm_id, id) on delete restrict,
  foreign key (firm_id, responsible_professional_id) references public.professionals(firm_id, id) on delete restrict,
  foreign key (firm_id, billing_entity_id) references public.billing_entities(firm_id, id) on delete restrict,
  check (closed_at is null or opened_at is null or closed_at >= opened_at),
  unique (firm_id, matter_code),
  unique (firm_id, id)
);

create table public.imports (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.law_firms(id) on delete restrict,
  original_filename text not null check (btrim(original_filename) <> ''),
  file_hash text not null check (file_hash ~ '^[0-9a-f]{64}$'),
  file_size bigint not null check (file_size >= 0),
  status text not null default 'analyzing' check (status in ('analyzing', 'ready', 'importing', 'completed', 'failed', 'reverted')),
  total_rows integer not null default 0 check (total_rows >= 0),
  valid_rows integer not null default 0 check (valid_rows >= 0),
  warning_rows integer not null default 0 check (warning_rows >= 0),
  invalid_rows integer not null default 0 check (invalid_rows >= 0),
  duplicate_rows integer not null default 0 check (duplicate_rows >= 0),
  imported_by uuid references auth.users(id) on delete set null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  reverted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (valid_rows + warning_rows + invalid_rows <= total_rows),
  check (duplicate_rows <= total_rows),
  check (completed_at is null or completed_at >= started_at),
  unique (firm_id, file_hash),
  unique (firm_id, id)
);

create table public.work_entries (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.law_firms(id) on delete restrict,
  work_date date not null,
  client_id uuid not null,
  matter_id uuid,
  professional_id uuid not null,
  billing_entity_id uuid,
  activity_description text not null check (btrim(activity_description) <> ''),
  duration_minutes integer not null check (duration_minutes >= 0),
  imported_hourly_rate numeric(12,2) check (imported_hourly_rate is null or imported_hourly_rate >= 0),
  calculated_hourly_rate numeric(12,2) check (calculated_hourly_rate is null or calculated_hourly_rate >= 0),
  effective_hourly_rate numeric(12,2) check (effective_hourly_rate is null or effective_hourly_rate >= 0),
  calculated_amount numeric(14,2) check (calculated_amount is null or calculated_amount >= 0),
  effective_amount numeric(14,2) check (effective_amount is null or effective_amount >= 0),
  currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'draft' check (status in ('draft', 'validated', 'cancelled')),
  is_billable boolean not null default true,
  is_invoiced boolean not null default false,
  invoice_date date,
  is_paid boolean not null default false,
  archive_status text check (archive_status is null or archive_status in ('drawer', 'dossier', 'closed_files')),
  observations text,
  source_type text not null default 'manual' check (source_type in ('manual', 'xlsx', 'csv', 'api')),
  import_row_id uuid,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (firm_id, client_id) references public.clients(firm_id, id) on delete restrict,
  foreign key (firm_id, matter_id) references public.matters(firm_id, id) on delete restrict,
  foreign key (firm_id, professional_id) references public.professionals(firm_id, id) on delete restrict,
  foreign key (firm_id, billing_entity_id) references public.billing_entities(firm_id, id) on delete restrict,
  check (not is_paid or is_invoiced),
  check (not is_invoiced or invoice_date is not null),
  unique (firm_id, id)
);

create table public.rate_rules (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.law_firms(id) on delete restrict,
  name text not null check (btrim(name) <> ''),
  client_id uuid,
  matter_id uuid,
  professional_id uuid,
  billing_entity_id uuid,
  service_type_id uuid,
  hourly_rate numeric(12,2) check (hourly_rate is null or hourly_rate >= 0),
  fixed_amount numeric(14,2) check (fixed_amount is null or fixed_amount >= 0),
  currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  valid_from date not null,
  valid_until date,
  priority integer not null default 100 check (priority >= 0),
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (firm_id, client_id) references public.clients(firm_id, id) on delete restrict,
  foreign key (firm_id, matter_id) references public.matters(firm_id, id) on delete restrict,
  foreign key (firm_id, professional_id) references public.professionals(firm_id, id) on delete restrict,
  foreign key (firm_id, billing_entity_id) references public.billing_entities(firm_id, id) on delete restrict,
  foreign key (firm_id, service_type_id) references public.service_types(firm_id, id) on delete restrict,
  check (hourly_rate is not null or fixed_amount is not null),
  check (valid_until is null or valid_until >= valid_from),
  unique (firm_id, id)
);

create table public.manual_overrides (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.law_firms(id) on delete restrict,
  work_entry_id uuid not null,
  field_name text not null check (btrim(field_name) <> ''),
  previous_value jsonb,
  calculated_value jsonb,
  override_value jsonb not null,
  reason text not null check (btrim(reason) <> ''),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  reverted_by uuid references auth.users(id) on delete restrict,
  reverted_at timestamptz,
  foreign key (firm_id, work_entry_id) references public.work_entries(firm_id, id) on delete restrict,
  check ((reverted_at is null) = (reverted_by is null)),
  unique (firm_id, id)
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.law_firms(id) on delete restrict,
  billing_entity_id uuid not null,
  client_id uuid not null,
  invoice_number text not null check (btrim(invoice_number) <> ''),
  invoice_date date not null,
  status text not null default 'draft' check (status in ('draft', 'issued', 'partially_paid', 'paid', 'cancelled')),
  subtotal numeric(14,2) not null default 0 check (subtotal >= 0),
  discount_total numeric(14,2) not null default 0 check (discount_total >= 0),
  tax_total numeric(14,2) not null default 0 check (tax_total >= 0),
  total numeric(14,2) not null default 0 check (total >= 0),
  paid_total numeric(14,2) not null default 0 check (paid_total >= 0 and paid_total <= total),
  currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (firm_id, billing_entity_id) references public.billing_entities(firm_id, id) on delete restrict,
  foreign key (firm_id, client_id) references public.clients(firm_id, id) on delete restrict,
  check (total = subtotal - discount_total + tax_total),
  unique (firm_id, billing_entity_id, invoice_number),
  unique (firm_id, id)
);

create table public.invoice_lines (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.law_firms(id) on delete restrict,
  invoice_id uuid not null,
  work_entry_id uuid,
  description text not null check (btrim(description) <> ''),
  quantity numeric(12,4) not null check (quantity > 0),
  unit_price numeric(14,2) not null check (unit_price >= 0),
  discount numeric(14,2) not null default 0 check (discount >= 0),
  line_total numeric(14,2) not null check (line_total >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (firm_id, invoice_id) references public.invoices(firm_id, id) on delete restrict,
  foreign key (firm_id, work_entry_id) references public.work_entries(firm_id, id) on delete restrict,
  check (line_total = round((quantity * unit_price) - discount, 2)),
  unique (firm_id, work_entry_id),
  unique (firm_id, id)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.law_firms(id) on delete restrict,
  invoice_id uuid not null,
  payment_date date not null,
  amount numeric(14,2) not null check (amount > 0),
  currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  payment_method text,
  reference text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (firm_id, invoice_id) references public.invoices(firm_id, id) on delete restrict,
  unique (firm_id, id)
);

create table public.import_rows (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.law_firms(id) on delete restrict,
  import_id uuid not null,
  sheet_name text not null check (btrim(sheet_name) <> ''),
  source_row_number integer not null check (source_row_number > 0),
  raw_data jsonb not null default '{}'::jsonb check (jsonb_typeof(raw_data) = 'object'),
  normalized_data jsonb not null default '{}'::jsonb check (jsonb_typeof(normalized_data) = 'object'),
  validation_errors jsonb not null default '[]'::jsonb check (jsonb_typeof(validation_errors) = 'array'),
  validation_warnings jsonb not null default '[]'::jsonb check (jsonb_typeof(validation_warnings) = 'array'),
  row_hash text not null check (row_hash ~ '^[0-9a-f]{64}$'),
  status text not null default 'pending' check (status in ('pending', 'valid', 'warning', 'invalid', 'duplicate', 'imported', 'skipped', 'reverted')),
  work_entry_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (firm_id, import_id) references public.imports(firm_id, id) on delete restrict,
  foreign key (firm_id, work_entry_id) references public.work_entries(firm_id, id) on delete restrict,
  unique (import_id, sheet_name, source_row_number),
  unique (firm_id, row_hash, import_id),
  unique (firm_id, id)
);

alter table public.work_entries
  add constraint work_entries_import_row_fkey
  foreign key (firm_id, import_row_id) references public.import_rows(firm_id, id) on delete restrict;

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.law_firms(id) on delete restrict,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null check (action in ('insert', 'update', 'delete', 'revert')),
  entity_type text not null check (btrim(entity_type) <> ''),
  entity_id uuid not null,
  previous_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now(),
  check (previous_data is not null or new_data is not null)
);

-- Foreign keys are not indexed automatically by PostgreSQL.
create index firm_members_user_id_idx on public.firm_members(user_id) where active;
create index billing_entities_firm_id_idx on public.billing_entities(firm_id) where active;
create index clients_firm_id_display_name_idx on public.clients(firm_id, display_name) where active;
create index client_contacts_client_id_idx on public.client_contacts(client_id);
create index professionals_firm_id_idx on public.professionals(firm_id) where active;
create index professionals_user_id_idx on public.professionals(user_id) where user_id is not null;
create index service_types_firm_id_idx on public.service_types(firm_id) where active;
create index matters_client_id_idx on public.matters(client_id);
create index matters_responsible_professional_id_idx on public.matters(responsible_professional_id) where responsible_professional_id is not null;
create index matters_billing_entity_id_idx on public.matters(billing_entity_id) where billing_entity_id is not null;
create index matters_firm_status_idx on public.matters(firm_id, status);
create index work_entries_client_date_idx on public.work_entries(client_id, work_date desc);
create index work_entries_professional_date_idx on public.work_entries(professional_id, work_date desc);
create index work_entries_billing_entity_id_idx on public.work_entries(billing_entity_id) where billing_entity_id is not null;
create index work_entries_matter_id_idx on public.work_entries(matter_id) where matter_id is not null;
create index work_entries_firm_date_idx on public.work_entries(firm_id, work_date desc);
create index work_entries_import_row_id_idx on public.work_entries(import_row_id) where import_row_id is not null;
create index rate_rules_client_id_idx on public.rate_rules(client_id) where client_id is not null and active;
create index rate_rules_matter_id_idx on public.rate_rules(matter_id) where matter_id is not null and active;
create index rate_rules_professional_id_idx on public.rate_rules(professional_id) where professional_id is not null and active;
create index rate_rules_billing_entity_id_idx on public.rate_rules(billing_entity_id) where billing_entity_id is not null and active;
create index rate_rules_service_type_id_idx on public.rate_rules(service_type_id) where service_type_id is not null and active;
create index rate_rules_resolution_idx on public.rate_rules(firm_id, priority, valid_from desc) where active;
create index manual_overrides_work_entry_id_idx on public.manual_overrides(work_entry_id, created_at desc);
create index manual_overrides_created_by_idx on public.manual_overrides(created_by);
create index invoices_client_date_idx on public.invoices(client_id, invoice_date desc);
create index invoices_billing_entity_id_idx on public.invoices(billing_entity_id);
create index invoices_firm_status_idx on public.invoices(firm_id, status);
create index invoice_lines_invoice_id_idx on public.invoice_lines(invoice_id);
create index payments_invoice_date_idx on public.payments(invoice_id, payment_date desc);
create index imports_imported_by_idx on public.imports(imported_by) where imported_by is not null;
create index imports_firm_status_idx on public.imports(firm_id, status, started_at desc);
create index import_rows_import_status_idx on public.import_rows(import_id, status);
create index import_rows_work_entry_id_idx on public.import_rows(work_entry_id) where work_entry_id is not null;
create index audit_log_entity_idx on public.audit_log(firm_id, entity_type, entity_id, created_at desc);
create index audit_log_actor_idx on public.audit_log(actor_user_id, created_at desc) where actor_user_id is not null;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function private.is_firm_member(target_firm_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.firm_members
    where firm_id = target_firm_id
      and user_id = (select auth.uid())
      and active
  );
$$;

create or replace function private.has_firm_role(target_firm_id uuid, allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.firm_members
    where firm_id = target_firm_id
      and user_id = (select auth.uid())
      and role = any(allowed_roles)
      and active
  );
$$;

create or replace function private.prepare_work_entry()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.effective_hourly_rate := coalesce(new.effective_hourly_rate, new.calculated_hourly_rate, new.imported_hourly_rate);
    new.calculated_amount := coalesce(new.calculated_amount, round((new.duration_minutes::numeric / 60) * new.calculated_hourly_rate, 2));
    new.effective_amount := coalesce(new.effective_amount, new.calculated_amount, round((new.duration_minutes::numeric / 60) * new.effective_hourly_rate, 2));
    return new;
  end if;

  if (
    new.billing_entity_id is distinct from old.billing_entity_id
    or new.imported_hourly_rate is distinct from old.imported_hourly_rate
    or new.calculated_hourly_rate is distinct from old.calculated_hourly_rate
    or new.effective_hourly_rate is distinct from old.effective_hourly_rate
    or new.calculated_amount is distinct from old.calculated_amount
    or new.effective_amount is distinct from old.effective_amount
    or new.currency is distinct from old.currency
    or new.is_invoiced is distinct from old.is_invoiced
    or new.invoice_date is distinct from old.invoice_date
    or new.is_paid is distinct from old.is_paid
  ) and not (select private.has_firm_role(old.firm_id, array['owner', 'admin', 'billing'])) then
    raise exception 'financial fields require owner, admin, or billing role';
  end if;

  if new.effective_hourly_rate is distinct from old.effective_hourly_rate and not exists (
    select 1 from public.manual_overrides
    where work_entry_id = old.id and field_name = 'effective_hourly_rate'
      and reverted_at is null and created_at >= transaction_timestamp()
      and override_value = to_jsonb(new.effective_hourly_rate)
  ) then
    raise exception 'effective_hourly_rate requires a matching manual override';
  end if;

  if new.effective_amount is distinct from old.effective_amount and not exists (
    select 1 from public.manual_overrides
    where work_entry_id = old.id and field_name = 'effective_amount'
      and reverted_at is null and created_at >= transaction_timestamp()
      and override_value = to_jsonb(new.effective_amount)
  ) then
    raise exception 'effective_amount requires a matching manual override';
  end if;
  return new;
end;
$$;

create or replace function private.protect_work_entry_delete()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.is_invoiced or exists (select 1 from public.invoice_lines where work_entry_id = old.id) then
    raise exception 'invoiced work entries cannot be deleted';
  end if;
  return old;
end;
$$;

create or replace function private.validate_import_reversal()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.reverted_at is not null and old.reverted_at is null then
    if new.status <> 'reverted' then
      raise exception 'reverted imports must have status reverted';
    end if;
    if exists (
      select 1 from public.work_entries we
      join public.import_rows ir on ir.id = we.import_row_id
      join public.invoice_lines il on il.work_entry_id = we.id
      where ir.import_id = old.id
    ) then
      raise exception 'imports with invoiced work entries cannot be reverted';
    end if;
  end if;
  return new;
end;
$$;

create or replace function private.revert_import(target_import_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_firm_id uuid;
begin
  select firm_id into target_firm_id
  from public.imports
  where id = target_import_id
  for update;

  if target_firm_id is null then
    raise exception 'import not found';
  end if;
  if not (select private.has_firm_role(target_firm_id, array['owner', 'admin', 'billing'])) then
    raise exception 'not authorized to revert this import';
  end if;
  if exists (
    select 1
    from public.work_entries we
    join public.import_rows ir on ir.id = we.import_row_id
    join public.invoice_lines il on il.work_entry_id = we.id
    where ir.import_id = target_import_id
  ) then
    raise exception 'imports with invoiced work entries cannot be reverted';
  end if;

  update public.import_rows
  set work_entry_id = null, status = 'reverted', updated_at = now()
  where import_id = target_import_id;

  delete from public.work_entries we
  where exists (
    select 1 from public.import_rows ir
    where ir.id = we.import_row_id and ir.import_id = target_import_id
  );

  update public.imports
  set status = 'reverted', reverted_at = now(), updated_at = now()
  where id = target_import_id;
end;
$$;

create or replace function private.audit_business_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_data jsonb;
  new_data jsonb;
  target_firm_id uuid;
  target_id uuid;
begin
  old_data := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end;
  new_data := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end;
  target_firm_id := coalesce((new_data ->> 'firm_id')::uuid, (old_data ->> 'firm_id')::uuid);
  target_id := coalesce((new_data ->> 'id')::uuid, (old_data ->> 'id')::uuid);
  insert into public.audit_log (firm_id, actor_user_id, action, entity_type, entity_id, previous_data, new_data)
  values (target_firm_id, (select auth.uid()), lower(tg_op), tg_table_name, target_id, old_data, new_data);
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'law_firms', 'firm_members', 'billing_entities', 'clients', 'client_contacts',
    'professionals', 'service_types', 'matters', 'imports', 'work_entries',
    'rate_rules', 'invoices', 'invoice_lines', 'payments', 'import_rows'
  ] loop
    execute format('create trigger %I_set_updated_at before update on public.%I for each row execute function private.set_updated_at()', table_name, table_name);
  end loop;
end;
$$;

create trigger work_entries_prepare before insert or update on public.work_entries
for each row execute function private.prepare_work_entry();
create trigger work_entries_protect_delete before delete on public.work_entries
for each row execute function private.protect_work_entry_delete();
create trigger imports_validate_reversal before update on public.imports
for each row execute function private.validate_import_reversal();

do $$
declare table_name text;
begin
  foreach table_name in array array['work_entries', 'manual_overrides', 'invoices', 'invoice_lines', 'payments', 'imports'] loop
    execute format('create trigger %I_audit after insert or update or delete on public.%I for each row execute function private.audit_business_change()', table_name, table_name);
  end loop;
end;
$$;

revoke all on function private.set_updated_at() from public, anon, authenticated;
revoke all on function private.prepare_work_entry() from public, anon, authenticated;
revoke all on function private.protect_work_entry_delete() from public, anon, authenticated;
revoke all on function private.validate_import_reversal() from public, anon, authenticated;
revoke all on function private.audit_business_change() from public, anon, authenticated;
revoke all on function private.revert_import(uuid) from public, anon;
revoke all on function private.is_firm_member(uuid) from public, anon;
revoke all on function private.has_firm_role(uuid, text[]) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_firm_member(uuid) to authenticated;
grant execute on function private.has_firm_role(uuid, text[]) to authenticated;
grant execute on function private.revert_import(uuid) to authenticated;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'law_firms', 'firm_members', 'billing_entities', 'clients', 'client_contacts',
    'professionals', 'service_types', 'matters', 'work_entries', 'rate_rules',
    'manual_overrides', 'invoices', 'invoice_lines', 'payments', 'imports',
    'import_rows', 'audit_log'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on public.%I from anon', table_name);
  end loop;
end;
$$;

-- Read access is firm-scoped. law_firms and audit_log use specific policies below.
do $$
declare table_name text;
begin
  foreach table_name in array array[
    'firm_members', 'billing_entities', 'clients', 'client_contacts',
    'professionals', 'service_types', 'matters', 'work_entries', 'rate_rules',
    'manual_overrides', 'invoices', 'invoice_lines', 'payments', 'imports', 'import_rows'
  ] loop
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select private.is_firm_member(firm_id)))',
      table_name || '_select_member', table_name
    );
  end loop;
end;
$$;

create policy law_firms_select_member on public.law_firms for select to authenticated
using ((select private.is_firm_member(id)));

create policy audit_log_select_privileged on public.audit_log for select to authenticated
using ((select private.has_firm_role(firm_id, array['owner', 'admin'])));

-- Firm lifecycle and membership are owner/admin operations.
create policy law_firms_update_admin on public.law_firms for update to authenticated
using ((select private.has_firm_role(id, array['owner', 'admin'])))
with check ((select private.has_firm_role(id, array['owner', 'admin'])));
create policy firm_members_insert_admin on public.firm_members for insert to authenticated
with check ((select private.has_firm_role(firm_id, array['owner', 'admin'])));
create policy firm_members_update_admin on public.firm_members for update to authenticated
using ((select private.has_firm_role(firm_id, array['owner', 'admin'])))
with check ((select private.has_firm_role(firm_id, array['owner', 'admin'])));

-- Reference and pricing data are managed by owners/admins; billing can manage prices.
do $$
declare table_name text;
begin
  foreach table_name in array array['billing_entities', 'clients', 'client_contacts', 'professionals', 'service_types', 'matters'] loop
    execute format('create policy %I on public.%I for insert to authenticated with check ((select private.has_firm_role(firm_id, array[''owner'', ''admin''])))', table_name || '_insert_admin', table_name);
    execute format('create policy %I on public.%I for update to authenticated using ((select private.has_firm_role(firm_id, array[''owner'', ''admin'']))) with check ((select private.has_firm_role(firm_id, array[''owner'', ''admin''])))', table_name || '_update_admin', table_name);
  end loop;
end;
$$;

create policy rate_rules_insert_privileged on public.rate_rules for insert to authenticated
with check ((select private.has_firm_role(firm_id, array['owner', 'admin', 'billing'])) and created_by = (select auth.uid()));
create policy rate_rules_update_privileged on public.rate_rules for update to authenticated
using ((select private.has_firm_role(firm_id, array['owner', 'admin', 'billing'])))
with check ((select private.has_firm_role(firm_id, array['owner', 'admin', 'billing'])));

create policy work_entries_insert_professional on public.work_entries for insert to authenticated
with check ((select private.has_firm_role(firm_id, array['owner', 'admin', 'billing', 'professional'])) and created_by = (select auth.uid()));
create policy work_entries_update_professional on public.work_entries for update to authenticated
using ((select private.has_firm_role(firm_id, array['owner', 'admin', 'billing', 'professional'])))
with check ((select private.has_firm_role(firm_id, array['owner', 'admin', 'billing', 'professional'])));
create policy manual_overrides_insert_privileged on public.manual_overrides for insert to authenticated
with check ((select private.has_firm_role(firm_id, array['owner', 'admin', 'billing'])) and created_by = (select auth.uid()));
create policy manual_overrides_update_privileged on public.manual_overrides for update to authenticated
using ((select private.has_firm_role(firm_id, array['owner', 'admin', 'billing'])))
with check ((select private.has_firm_role(firm_id, array['owner', 'admin', 'billing'])));

-- Financial control is limited to owner/admin/billing. No application DELETE grants.
do $$
declare table_name text;
begin
  foreach table_name in array array['invoices', 'invoice_lines', 'payments', 'imports', 'import_rows'] loop
    execute format('create policy %I on public.%I for insert to authenticated with check ((select private.has_firm_role(firm_id, array[''owner'', ''admin'', ''billing''])))', table_name || '_insert_billing', table_name);
    execute format('create policy %I on public.%I for update to authenticated using ((select private.has_firm_role(firm_id, array[''owner'', ''admin'', ''billing'']))) with check ((select private.has_firm_role(firm_id, array[''owner'', ''admin'', ''billing''])))', table_name || '_update_billing', table_name);
  end loop;
end;
$$;

revoke all on all tables in schema public from anon;
grant select on public.law_firms, public.firm_members, public.billing_entities, public.clients,
  public.client_contacts, public.professionals, public.service_types, public.matters,
  public.work_entries, public.rate_rules, public.manual_overrides, public.invoices,
  public.invoice_lines, public.payments, public.imports, public.import_rows, public.audit_log
to authenticated;
grant insert, update on public.firm_members, public.billing_entities, public.clients,
  public.client_contacts, public.professionals, public.service_types, public.matters,
  public.work_entries, public.rate_rules, public.manual_overrides, public.invoices,
  public.invoice_lines, public.payments, public.imports, public.import_rows
to authenticated;
grant update on public.law_firms to authenticated;;
