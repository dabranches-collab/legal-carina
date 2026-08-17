create table public.client_identifiers (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.law_firms(id) on delete restrict,
  client_id uuid not null,
  identifier_type text not null check (identifier_type in ('citizen_card','passport','residence_permit','company_registration','tax','other')),
  identifier_number text not null check (btrim(identifier_number) <> ''),
  issuing_country text,
  issuing_authority text,
  issued_on date,
  expires_on date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (firm_id,client_id) references public.clients(firm_id,id) on delete restrict,
  unique (firm_id,client_id,identifier_type,identifier_number),
  unique (firm_id,id),
  check (expires_on is null or issued_on is null or expires_on >= issued_on)
);

create index client_identifiers_client_id_idx on public.client_identifiers(client_id);
alter table public.client_identifiers enable row level security;

create policy client_identifiers_select_scoped on public.client_identifiers for select to authenticated
using ((select private.can_read_client(firm_id,client_id)));
create policy client_identifiers_insert_admin on public.client_identifiers for insert to authenticated
with check ((select private.has_firm_role(firm_id,array['owner','admin'])));
create policy client_identifiers_update_admin on public.client_identifiers for update to authenticated
using ((select private.has_firm_role(firm_id,array['owner','admin'])))
with check ((select private.has_firm_role(firm_id,array['owner','admin'])));

grant select,insert,update on public.client_identifiers to authenticated;

create trigger set_client_identifiers_updated_at before update on public.client_identifiers
for each row execute function private.set_updated_at();
