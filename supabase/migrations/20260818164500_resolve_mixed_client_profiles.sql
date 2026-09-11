begin;

do $$
declare
  mixed_count integer;
  personal_count integer;
begin
  select count(*) into mixed_count
  from (
    select client_id
    from public.client_profiles
    where active
    group by client_id
    having count(distinct client_type) > 1
  ) mixed;

  if mixed_count <> 24 then
    raise exception 'Expected 24 mixed clients, found %', mixed_count;
  end if;

  select count(*) into personal_count
  from public.clients
  where upper(display_name) in ('JUAN CARTAYA', 'FRED SCHANER', 'DONOVAN');

  if personal_count <> 3 then
    raise exception 'Could not identify exactly the three requested individual clients';
  end if;
end;
$$;

with mixed as (
  select client_id
  from public.client_profiles
  where active
  group by client_id
  having count(distinct client_type) > 1
), decisions as (
  select
    c.id as client_id,
    case
      when upper(c.display_name) in ('JUAN CARTAYA', 'FRED SCHANER', 'DONOVAN')
        then 'individual'
      else 'company'
    end as target_type
  from mixed
  join public.clients c on c.id = mixed.client_id
), targets as (
  select d.client_id, cp.id as profile_id, d.target_type
  from decisions d
  join public.client_profiles cp
    on cp.client_id = d.client_id
   and cp.client_type = d.target_type
   and cp.active
)
update public.work_entries w
set client_profile_id = targets.profile_id,
    matter_id = null,
    updated_at = now()
from targets
where w.client_id = targets.client_id
  and w.client_profile_id is distinct from targets.profile_id;

with mixed as (
  select client_id
  from public.client_profiles
  where active
  group by client_id
  having count(distinct client_type) > 1
), decisions as (
  select
    c.id as client_id,
    case
      when upper(c.display_name) in ('JUAN CARTAYA', 'FRED SCHANER', 'DONOVAN')
        then 'individual'
      else 'company'
    end as target_type
  from mixed
  join public.clients c on c.id = mixed.client_id
)
update public.clients c
set client_type = decisions.target_type,
    updated_at = now()
from decisions
where c.id = decisions.client_id;

with mixed as (
  select client_id
  from public.client_profiles
  where active
  group by client_id
  having count(distinct client_type) > 1
), decisions as (
  select
    c.id as client_id,
    case
      when upper(c.display_name) in ('JUAN CARTAYA', 'FRED SCHANER', 'DONOVAN')
        then 'individual'
      else 'company'
    end as target_type
  from mixed
  join public.clients c on c.id = mixed.client_id
)
update public.client_profiles cp
set active = (cp.client_type = decisions.target_type),
    updated_at = now()
from decisions
where cp.client_id = decisions.client_id;

do $$
declare remaining integer;
begin
  select count(*) into remaining
  from (
    select client_id
    from public.client_profiles
    where active
    group by client_id
    having count(distinct client_type) > 1
  ) mixed;
  if remaining <> 0 then
    raise exception 'Mixed clients remain after consolidation: %', remaining;
  end if;
end;
$$;

commit;
