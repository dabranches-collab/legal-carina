-- Concessão pedida pelo proprietário para a utilizadora PAULA CHAVES.
-- É aditiva: conserva pertença, concessões por Sociedade e permissões financeiras.
do $$
declare
  target_user_id uuid;
  target_firm_id uuid;
  actor_user_id uuid;
begin
  select credentials.user_id, credentials.firm_id
    into target_user_id, target_firm_id
  from public.user_login_credentials credentials
  join public.firm_members membership
    on membership.firm_id = credentials.firm_id
   and membership.user_id = credentials.user_id
  where upper(credentials.display_name) = 'PAULA CHAVES'
    and membership.active
    and membership.role = 'operator';

  if target_user_id is null then
    raise exception 'Active operator PAULA CHAVES was not found';
  end if;

  select membership.user_id into actor_user_id
  from public.firm_members membership
  where membership.firm_id = target_firm_id
    and membership.active
    and membership.role = 'owner'
  order by membership.created_at
  limit 1;

  if actor_user_id is null then
    raise exception 'Active owner was not found';
  end if;

  if not exists (
    select 1 from public.access_grants grant_row
    where grant_row.firm_id = target_firm_id
      and grant_row.principal_type = 'user'
      and grant_row.user_id = target_user_id
      and grant_row.resource_type = 'firm'
      and grant_row.active
      and grant_row.valid_from <= now()
      and (grant_row.valid_until is null or grant_row.valid_until > now())
      and private.permission_rank(grant_row.permission) >= private.permission_rank('edit')
  ) then
    insert into public.access_grants (
      firm_id, principal_type, user_id, resource_type, permission, created_by
    ) values (
      target_firm_id, 'user', target_user_id, 'firm', 'edit', actor_user_id
    );
  end if;
end;
$$;
