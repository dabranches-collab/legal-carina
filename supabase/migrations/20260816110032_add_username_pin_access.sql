create table public.user_login_credentials (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.law_firms(id) on delete cascade,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  username text not null unique,
  auth_email text not null unique,
  failed_attempts smallint not null default 0 check (failed_attempts between 0 and 20),
  locked_until timestamptz,
  last_failed_at timestamptz,
  last_success_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_login_credentials_username_format check (
    username = lower(username)
    and username ~ '^[a-z0-9][a-z0-9._-]{2,31}$'
  )
);

comment on table public.user_login_credentials is
  'Mapeamento privado entre nome de utilizador e identidade Supabase Auth. Nunca contém o PIN nem a password derivada.';

create index user_login_credentials_lookup_idx
  on public.user_login_credentials (username)
  where locked_until is null or failed_attempts < 5;

create trigger user_login_credentials_set_updated_at
before update on public.user_login_credentials
for each row execute function private.set_updated_at();

alter table public.user_login_credentials enable row level security;

revoke all on public.user_login_credentials from public, anon, authenticated;

-- A tabela é deliberadamente inacessível pela Data API aos clientes. Apenas
-- Edge Functions com service role podem criar identidades e resolver usernames.

create table public.billing_entity_financial_permissions (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.law_firms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  billing_entity_id uuid not null,
  can_view_financials boolean not null default false,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (firm_id, billing_entity_id) references public.billing_entities(firm_id, id) on delete cascade,
  unique (firm_id, user_id, billing_entity_id)
);

comment on table public.billing_entity_financial_permissions is
  'Autorização explícita e independente para consultar valores financeiros por sociedade faturante.';

create trigger billing_entity_financial_permissions_set_updated_at
before update on public.billing_entity_financial_permissions
for each row execute function private.set_updated_at();

alter table public.billing_entity_financial_permissions enable row level security;
revoke all on public.billing_entity_financial_permissions from public, anon, authenticated;

create or replace function private.can_view_billing_financials(target_firm_id uuid, target_billing_entity_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.firm_members fm
    where fm.firm_id = target_firm_id and fm.user_id = (select auth.uid())
      and fm.active and fm.role in ('owner', 'admin')
  ) or exists (
    select 1 from public.billing_entity_financial_permissions fp
    where fp.firm_id = target_firm_id and fp.user_id = (select auth.uid())
      and fp.billing_entity_id = target_billing_entity_id and fp.can_view_financials
  );
$$;

revoke all on function private.can_view_billing_financials(uuid,uuid) from public, anon;
grant execute on function private.can_view_billing_financials(uuid,uuid) to authenticated;
