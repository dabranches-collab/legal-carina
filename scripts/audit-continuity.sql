-- Auditoria exclusivamente de leitura. Não devolve nomes, emails, UUIDs ou conteúdo.
-- Executar com uma conta administrativa autorizada e guardar apenas os agregados.

select jsonb_build_object(
  'auth_users', (select count(*) from auth.users),
  'confirmed_users', (select count(*) from auth.users where email_confirmed_at is not null),
  'banned_users', (select count(*) from auth.users where banned_until is not null and banned_until > now()),
  'firm_members', (select count(*) from public.firm_members),
  'access_grants', (select count(*) from public.access_grants),
  'financial_permissions', (select count(*) from public.billing_entity_financial_permissions),
  'memberships_without_auth', (
    select count(*) from public.firm_members fm
    left join auth.users au on au.id = fm.user_id
    where au.id is null
  ),
  'auth_without_membership', (
    select count(*) from auth.users au
    left join public.firm_members fm on fm.user_id = au.id
    where fm.user_id is null
  ),
  'credentials_without_auth', (
    select count(*) from public.user_login_credentials ulc
    left join auth.users au on au.id = ulc.user_id
    where au.id is null
  ),
  'professionals_without_auth', (
    select count(*) from public.professionals p
    left join auth.users au on au.id = p.user_id
    where p.user_id is not null and au.id is null
  ),
  'public_tables', (
    select count(*) from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
  ),
  'public_tables_with_rls', (
    select count(*) from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
  ),
  'public_policies', (select count(*) from pg_policies where schemaname = 'public')
) as continuity_snapshot;

select role::text, count(*)::bigint
from public.firm_members
group by role
order by role;

select
  b.id as bucket,
  b.public,
  count(o.id)::bigint as object_count,
  coalesce(sum((o.metadata ->> 'size')::bigint), 0)::bigint as total_bytes
from storage.buckets b
left join storage.objects o on o.bucket_id = b.id
group by b.id, b.public
order by b.id;
