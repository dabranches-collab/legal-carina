with mixed as (
  select cp.client_id
  from public.client_profiles cp
  where cp.active
  group by cp.client_id
  having count(distinct cp.client_type) > 1
)
select
  c.id,
  c.display_name,
  jsonb_agg(
    jsonb_build_object(
      'profile_id', cp.id,
      'type', cp.client_type,
      'code', cp.client_code,
      'active', cp.active,
      'movements', (select count(*) from public.work_entries w where w.client_profile_id = cp.id)
    ) order by cp.client_type
  ) as profiles
from mixed m
join public.clients c on c.id = m.client_id
join public.client_profiles cp on cp.client_id = c.id
group by c.id, c.display_name
order by c.display_name;

select
  c.display_name,
  c.client_type,
  cp.client_type as active_profile_type,
  cp.client_code,
  count(w.id) as movements
from public.clients c
join public.client_profiles cp on cp.client_id = c.id and cp.active
left join public.work_entries w on w.client_profile_id = cp.id
where upper(c.display_name) in ('JUAN CARTAYA', 'FRED SCHANER', 'DONOVAN')
group by c.display_name, c.client_type, cp.client_type, cp.client_code
order by c.display_name;
