-- Authentication terms, security events and granular access control.
-- Legal documents are intentionally not seeded: only legally approved content may be published.

alter table public.firm_members drop constraint if exists firm_members_role_check;
alter table public.firm_members add constraint firm_members_role_check
  check (role in ('owner', 'admin', 'billing', 'professional', 'viewer', 'auditor'));

create table public.legal_documents (
  id uuid primary key default gen_random_uuid(),
  document_type text not null check (document_type in ('terms_of_service', 'privacy_policy', 'gdpr_terms')),
  version text not null check (btrim(version) <> ''),
  title text not null check (btrim(title) <> ''),
  body_markdown text not null check (btrim(body_markdown) <> ''),
  effective_at timestamptz not null,
  status text not null default 'draft' check (status in ('draft', 'published', 'retired')),
  content_hash text not null check (content_hash ~ '^[a-f0-9]{64}$'),
  published_by uuid references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (document_type, version)
);

create unique index legal_documents_one_current_idx on public.legal_documents(document_type)
where status = 'published';

create table public.user_legal_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  legal_document_id uuid not null references public.legal_documents(id) on delete restrict,
  document_type text not null check (document_type in ('terms_of_service', 'privacy_policy', 'gdpr_terms')),
  document_version text not null,
  accepted_at timestamptz not null default now(),
  evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence) = 'object'),
  unique (user_id, legal_document_id)
);

create index user_legal_acceptances_user_idx on public.user_legal_acceptances(user_id, accepted_at desc);

create table public.security_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in (
    'login_succeeded', 'login_failed', 'logout', 'password_recovery_requested',
    'password_changed', 'terms_accepted', 'access_denied'
  )),
  occurred_at timestamptz not null default now(),
  session_id uuid,
  ip_hash text,
  email_hash text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object')
);

create index security_events_user_time_idx on public.security_events(user_id, occurred_at desc)
where user_id is not null;
create index security_events_type_time_idx on public.security_events(event_type, occurred_at desc);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.law_firms(id) on delete restrict,
  name text not null check (btrim(name) <> ''),
  active boolean not null default true,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (firm_id, name),
  unique (firm_id, id)
);

create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.law_firms(id) on delete restrict,
  team_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  foreign key (firm_id, team_id) references public.teams(firm_id, id) on delete cascade,
  unique (team_id, user_id),
  unique (firm_id, id)
);

create table public.access_grants (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.law_firms(id) on delete restrict,
  principal_type text not null check (principal_type in ('user', 'team')),
  user_id uuid references auth.users(id) on delete cascade,
  team_id uuid,
  resource_type text not null check (resource_type in ('firm', 'billing_entity', 'client', 'matter')),
  billing_entity_id uuid,
  client_id uuid,
  matter_id uuid,
  permission text not null check (permission in ('view', 'edit', 'billing', 'admin')),
  active boolean not null default true,
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (firm_id, team_id) references public.teams(firm_id, id) on delete cascade,
  foreign key (firm_id, billing_entity_id) references public.billing_entities(firm_id, id) on delete cascade,
  foreign key (firm_id, client_id) references public.clients(firm_id, id) on delete cascade,
  foreign key (firm_id, matter_id) references public.matters(firm_id, id) on delete cascade,
  check ((principal_type = 'user' and user_id is not null and team_id is null)
      or (principal_type = 'team' and team_id is not null and user_id is null)),
  check ((resource_type = 'firm' and billing_entity_id is null and client_id is null and matter_id is null)
      or (resource_type = 'billing_entity' and billing_entity_id is not null and client_id is null and matter_id is null)
      or (resource_type = 'client' and client_id is not null and billing_entity_id is null and matter_id is null)
      or (resource_type = 'matter' and matter_id is not null and billing_entity_id is null and client_id is null)),
  check (valid_until is null or valid_until > valid_from),
  unique (firm_id, id)
);

create index access_grants_user_idx on public.access_grants(firm_id, user_id, resource_type)
where active and user_id is not null;
create index access_grants_team_idx on public.access_grants(firm_id, team_id, resource_type)
where active and team_id is not null;
create index team_members_user_idx on public.team_members(firm_id, user_id);

create trigger legal_documents_set_updated_at before update on public.legal_documents
for each row execute function private.set_updated_at();
create trigger teams_set_updated_at before update on public.teams
for each row execute function private.set_updated_at();
create trigger access_grants_set_updated_at before update on public.access_grants
for each row execute function private.set_updated_at();

create or replace function private.has_accepted_current_terms(target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select count(*) = 3
  from public.legal_documents d
  where d.status = 'published' and d.effective_at <= now()
    and exists (
      select 1 from public.user_legal_acceptances a
      where a.user_id = target_user_id and a.legal_document_id = d.id
        and a.document_type = d.document_type and a.document_version = d.version
    );
$$;

create or replace function private.is_firm_member(target_firm_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_accepted_current_terms((select auth.uid())) and exists (
    select 1 from public.firm_members fm
    where fm.firm_id = target_firm_id and fm.user_id = (select auth.uid()) and fm.active
  );
$$;

create or replace function private.has_firm_role(target_firm_id uuid, allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_accepted_current_terms((select auth.uid())) and exists (
    select 1 from public.firm_members fm
    where fm.firm_id = target_firm_id and fm.user_id = (select auth.uid())
      and fm.active and fm.role = any(allowed_roles)
  );
$$;

create or replace function private.permission_rank(target_permission text)
returns integer language sql immutable set search_path = '' as $$
  select case target_permission when 'view' then 10 when 'edit' then 20 when 'billing' then 30 when 'admin' then 40 else 0 end;
$$;

create or replace function private.has_scope_access(
  target_firm_id uuid,
  target_billing_entity_id uuid default null,
  target_client_id uuid default null,
  target_matter_id uuid default null,
  required_permission text default 'view'
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_accepted_current_terms((select auth.uid())) and (
    exists (select 1 from public.firm_members fm where fm.firm_id = target_firm_id
      and fm.user_id = (select auth.uid()) and fm.active and fm.role in ('owner', 'admin'))
    or exists (
      select 1 from public.access_grants ag
      where ag.firm_id = target_firm_id and ag.active and ag.valid_from <= now()
        and (ag.valid_until is null or ag.valid_until > now())
        and private.permission_rank(ag.permission) >= private.permission_rank(required_permission)
        and (
          (ag.principal_type = 'user' and ag.user_id = (select auth.uid()))
          or (ag.principal_type = 'team' and exists (
            select 1 from public.team_members tm where tm.team_id = ag.team_id
              and tm.user_id = (select auth.uid()) and tm.firm_id = target_firm_id
          ))
        )
        and (ag.resource_type = 'firm'
          or (ag.resource_type = 'billing_entity' and ag.billing_entity_id = target_billing_entity_id)
          or (ag.resource_type = 'client' and ag.client_id = target_client_id)
          or (ag.resource_type = 'matter' and ag.matter_id = target_matter_id))
    )
  );
$$;

alter table public.legal_documents enable row level security;
alter table public.user_legal_acceptances enable row level security;
alter table public.security_events enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.access_grants enable row level security;

revoke all on public.legal_documents, public.user_legal_acceptances, public.security_events,
  public.teams, public.team_members, public.access_grants from anon;

create policy legal_documents_read_published on public.legal_documents for select to authenticated
using (status = 'published' and effective_at <= now());
create policy legal_acceptances_read_own on public.user_legal_acceptances for select to authenticated
using (user_id = (select auth.uid()));
create policy legal_acceptances_insert_own on public.user_legal_acceptances for insert to authenticated
with check (user_id = (select auth.uid()) and exists (
  select 1 from public.legal_documents d where d.id = legal_document_id
    and d.status = 'published' and d.effective_at <= now()
));
create policy security_events_read_privileged on public.security_events for select to authenticated
using ((select private.has_accepted_current_terms((select auth.uid()))) and (
  user_id = (select auth.uid()) or exists (
  select 1 from public.firm_members fm where fm.user_id = (select auth.uid())
    and fm.active and fm.role in ('owner', 'admin', 'auditor')
)));
create policy security_events_insert_own on public.security_events for insert to authenticated
with check (user_id = (select auth.uid()) and event_type in ('login_succeeded', 'logout', 'password_changed', 'terms_accepted', 'access_denied'));

create policy teams_read_authorized on public.teams for select to authenticated
using ((select private.is_firm_member(firm_id)));
create policy team_members_read_authorized on public.team_members for select to authenticated
using ((select private.is_firm_member(firm_id)));
create policy access_grants_read_own_or_admin on public.access_grants for select to authenticated
using ((select private.has_accepted_current_terms((select auth.uid()))) and (user_id = (select auth.uid()) or exists (
  select 1 from public.team_members tm where tm.team_id = access_grants.team_id and tm.user_id = (select auth.uid())
) or (select private.has_firm_role(firm_id, array['owner', 'admin']))));

create policy teams_manage_admin on public.teams for all to authenticated
using ((select private.has_firm_role(firm_id, array['owner', 'admin'])))
with check ((select private.has_firm_role(firm_id, array['owner', 'admin'])));
create policy team_members_manage_admin on public.team_members for all to authenticated
using ((select private.has_firm_role(firm_id, array['owner', 'admin'])))
with check ((select private.has_firm_role(firm_id, array['owner', 'admin'])));
create policy access_grants_manage_admin on public.access_grants for all to authenticated
using ((select private.has_firm_role(firm_id, array['owner', 'admin'])))
with check ((select private.has_firm_role(firm_id, array['owner', 'admin'])));

drop policy if exists clients_select_member on public.clients;
drop policy if exists client_contacts_select_member on public.client_contacts;
drop policy if exists matters_select_member on public.matters;
drop policy if exists work_entries_select_member on public.work_entries;
drop policy if exists invoices_select_member on public.invoices;
drop policy if exists invoice_lines_select_member on public.invoice_lines;
drop policy if exists payments_select_member on public.payments;
drop policy if exists billing_entities_select_member on public.billing_entities;

create policy clients_select_scoped on public.clients for select to authenticated
using ((select private.has_scope_access(firm_id, null, id, null, 'view')));
create policy client_contacts_select_scoped on public.client_contacts for select to authenticated
using ((select private.has_scope_access(firm_id, null, client_id, null, 'view')));
create policy matters_select_scoped on public.matters for select to authenticated
using ((select private.has_scope_access(firm_id, billing_entity_id, client_id, id, 'view')));
create policy work_entries_select_scoped on public.work_entries for select to authenticated
using ((select private.has_scope_access(firm_id, billing_entity_id, client_id, matter_id, 'view')));
create policy billing_entities_select_scoped on public.billing_entities for select to authenticated
using ((select private.has_scope_access(firm_id, id, null, null, 'view')));
create policy invoices_select_scoped on public.invoices for select to authenticated
using ((select private.has_scope_access(firm_id, billing_entity_id, client_id, null, 'view')));
create policy invoice_lines_select_scoped on public.invoice_lines for select to authenticated
using (exists (select 1 from public.invoices i where i.id = invoice_id));
create policy payments_select_scoped on public.payments for select to authenticated
using (exists (select 1 from public.invoices i where i.id = invoice_id));

drop policy if exists work_entries_insert_professional on public.work_entries;
drop policy if exists work_entries_update_professional on public.work_entries;
create policy work_entries_insert_scoped on public.work_entries for insert to authenticated
with check (created_by = (select auth.uid())
  and (select private.has_firm_role(firm_id, array['owner', 'admin', 'billing', 'professional']))
  and (select private.has_scope_access(firm_id, billing_entity_id, client_id, matter_id, 'edit')));
create policy work_entries_update_scoped on public.work_entries for update to authenticated
using ((select private.has_firm_role(firm_id, array['owner', 'admin', 'billing', 'professional']))
  and (select private.has_scope_access(firm_id, billing_entity_id, client_id, matter_id, 'edit')))
with check ((select private.has_firm_role(firm_id, array['owner', 'admin', 'billing', 'professional']))
  and (select private.has_scope_access(firm_id, billing_entity_id, client_id, matter_id, 'edit')));

drop policy if exists invoices_insert_billing on public.invoices;
drop policy if exists invoices_update_billing on public.invoices;
drop policy if exists payments_insert_billing on public.payments;
drop policy if exists payments_update_billing on public.payments;
create policy invoices_insert_scoped on public.invoices for insert to authenticated
with check ((select private.has_firm_role(firm_id, array['owner', 'admin', 'billing']))
  and (select private.has_scope_access(firm_id, billing_entity_id, client_id, null, 'billing')));
create policy invoices_update_scoped on public.invoices for update to authenticated
using ((select private.has_firm_role(firm_id, array['owner', 'admin', 'billing']))
  and (select private.has_scope_access(firm_id, billing_entity_id, client_id, null, 'billing')))
with check ((select private.has_firm_role(firm_id, array['owner', 'admin', 'billing']))
  and (select private.has_scope_access(firm_id, billing_entity_id, client_id, null, 'billing')));
create policy payments_insert_scoped on public.payments for insert to authenticated
with check ((select private.has_firm_role(firm_id, array['owner', 'admin', 'billing']))
  and exists (select 1 from public.invoices i where i.id = invoice_id));
create policy payments_update_scoped on public.payments for update to authenticated
using ((select private.has_firm_role(firm_id, array['owner', 'admin', 'billing']))
  and exists (select 1 from public.invoices i where i.id = invoice_id))
with check ((select private.has_firm_role(firm_id, array['owner', 'admin', 'billing']))
  and exists (select 1 from public.invoices i where i.id = invoice_id));

create or replace function public.get_pending_legal_documents()
returns table (id uuid, document_type text, version text, title text, body_markdown text, effective_at timestamptz, content_hash text)
language sql
stable
security invoker
set search_path = ''
as $$
  select d.id, d.document_type, d.version, d.title, d.body_markdown, d.effective_at, d.content_hash
  from public.legal_documents d
  where d.status = 'published' and d.effective_at <= now()
    and not exists (select 1 from public.user_legal_acceptances a
      where a.user_id = (select auth.uid()) and a.legal_document_id = d.id)
  order by d.document_type;
$$;

create or replace function public.accept_legal_documents(target_document_ids uuid[], acceptance_evidence jsonb)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare inserted_count integer;
begin
  if (select auth.uid()) is null then raise exception 'authentication required'; end if;
  if coalesce(array_length(target_document_ids, 1), 0) <> 3 then
    raise exception 'all three current legal documents must be accepted together';
  end if;
  if jsonb_typeof(acceptance_evidence) <> 'object' then raise exception 'acceptance evidence must be an object'; end if;

  insert into public.user_legal_acceptances (
    user_id, legal_document_id, document_type, document_version, evidence
  )
  select (select auth.uid()), d.id, d.document_type, d.version, acceptance_evidence
  from public.legal_documents d
  where d.id = any(target_document_ids) and d.status = 'published' and d.effective_at <= now()
  on conflict (user_id, legal_document_id) do nothing;
  get diagnostics inserted_count = row_count;

  if not private.has_accepted_current_terms((select auth.uid())) then
    raise exception 'acceptance is incomplete or document versions are not current';
  end if;

  insert into public.security_events(user_id, event_type, session_id, user_agent, metadata)
  values ((select auth.uid()), 'terms_accepted', nullif((select auth.jwt() ->> 'session_id'), '')::uuid,
    acceptance_evidence ->> 'user_agent', jsonb_build_object('document_ids', target_document_ids));
  return inserted_count;
end;
$$;

create or replace function public.publish_legal_document_set(target_documents jsonb, publisher_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare published_count integer;
begin
  if jsonb_typeof(target_documents) <> 'array' or jsonb_array_length(target_documents) <> 3 then
    raise exception 'exactly three legal documents are required';
  end if;
  if not exists (
    select 1 from public.firm_members fm where fm.user_id = publisher_user_id
      and fm.active and fm.role in ('owner', 'admin')
  ) then raise exception 'administrator role required'; end if;
  if (select count(distinct item ->> 'document_type') from jsonb_array_elements(target_documents) item
      where item ->> 'document_type' in ('terms_of_service', 'privacy_policy', 'gdpr_terms')) <> 3 then
    raise exception 'all required document types must be present';
  end if;

  update public.legal_documents set status = 'retired' where status = 'published';
  insert into public.legal_documents (
    document_type, version, title, body_markdown, effective_at, status, content_hash, published_by
  )
  select item ->> 'document_type', item ->> 'version', item ->> 'title', item ->> 'body_markdown',
    (item ->> 'effective_at')::timestamptz, 'published', item ->> 'content_hash', publisher_user_id
  from jsonb_array_elements(target_documents) item;
  get diagnostics published_count = row_count;
  return published_count;
end;
$$;

grant select on public.legal_documents, public.user_legal_acceptances, public.security_events,
  public.teams, public.team_members, public.access_grants to authenticated;
grant insert on public.user_legal_acceptances, public.security_events to authenticated;
grant insert, update, delete on public.teams, public.team_members, public.access_grants to authenticated;
grant execute on function public.get_pending_legal_documents() to authenticated;
grant execute on function public.accept_legal_documents(uuid[], jsonb) to authenticated;
grant execute on function public.publish_legal_document_set(jsonb, uuid) to service_role;

revoke all on function private.has_accepted_current_terms(uuid) from public, anon, authenticated;
revoke all on function private.permission_rank(text) from public, anon, authenticated;
revoke all on function private.has_scope_access(uuid, uuid, uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.get_pending_legal_documents() from public, anon;
revoke all on function public.accept_legal_documents(uuid[], jsonb) from public, anon;
revoke all on function public.publish_legal_document_set(jsonb, uuid) from public, anon, authenticated;

create trigger teams_audit after insert or update or delete on public.teams
for each row execute function private.audit_business_change();
create trigger team_members_audit after insert or update or delete on public.team_members
for each row execute function private.audit_business_change();
create trigger access_grants_audit after insert or update or delete on public.access_grants
for each row execute function private.audit_business_change();

-- Private import originals. Object names must start with the firm UUID.
create or replace function private.storage_firm_id(object_name text)
returns uuid language sql immutable set search_path = '' as $$
  select case
    when (storage.foldername(object_name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then ((storage.foldername(object_name))[1])::uuid
    else null
  end;
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'legal-imports', 'legal-imports', false, 52428800,
  array['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv']
)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy legal_imports_select_scoped on storage.objects for select to authenticated
using (bucket_id = 'legal-imports' and (select private.is_firm_member(private.storage_firm_id(name))));
create policy legal_imports_insert_privileged on storage.objects for insert to authenticated
with check (bucket_id = 'legal-imports' and (select private.has_firm_role(
  private.storage_firm_id(name), array['owner', 'admin', 'billing']
)));
create policy legal_imports_update_privileged on storage.objects for update to authenticated
using (bucket_id = 'legal-imports' and (select private.has_firm_role(
  private.storage_firm_id(name), array['owner', 'admin', 'billing']
)))
with check (bucket_id = 'legal-imports' and (select private.has_firm_role(
  private.storage_firm_id(name), array['owner', 'admin', 'billing']
)));

revoke all on function private.storage_firm_id(text) from public, anon, authenticated;
