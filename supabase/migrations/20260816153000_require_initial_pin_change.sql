alter table public.user_login_credentials
  add column must_change_pin boolean not null default false,
  add column pin_changed_at timestamptz,
  add column display_name text;

comment on column public.work_entries.created_by is
  'Autor administrativo que criou ou importou o movimento; não representa o responsável do movimento nem o responsável pela facturação do processo.';
comment on column public.work_entries.professional_id is
  'Responsável indicado no movimento, incluindo o campo histórico RESPONSÁVEL do Excel.';
comment on column public.matters.responsible_professional_id is
  'Responsável pela facturação e acompanhamento do processo; independente do autor dos movimentos.';

alter table public.work_entries add column updated_by uuid references auth.users(id) on delete set null;
update public.work_entries set updated_by=created_by where updated_by is null;

create or replace function private.stamp_work_entry_actor()
returns trigger language plpgsql security definer set search_path='' as $$
declare actor uuid := coalesce((select auth.uid()), new.updated_by, new.created_by);
begin
  if actor is null then raise exception 'O utilizador executor é obrigatório para auditar o movimento.'; end if;
  if tg_op='INSERT' then new.created_by := coalesce(new.created_by,actor); end if;
  if tg_op='UPDATE' then new.created_by := old.created_by; end if;
  new.updated_by := actor;
  return new;
end;
$$;

create trigger work_entries_stamp_actor before insert or update on public.work_entries
for each row execute function private.stamp_work_entry_actor();
revoke all on function private.stamp_work_entry_actor() from public,anon,authenticated;

create or replace function private.audit_business_change()
returns trigger language plpgsql security definer set search_path='' as $$
declare old_data jsonb; new_data jsonb; target_firm_id uuid; target_id uuid; actor uuid;
begin
  old_data := case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) else null end;
  new_data := case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) else null end;
  target_firm_id := coalesce((new_data->>'firm_id')::uuid,(old_data->>'firm_id')::uuid);
  target_id := coalesce((new_data->>'id')::uuid,(old_data->>'id')::uuid);
  actor := coalesce((select auth.uid()),nullif(new_data->>'updated_by','')::uuid,nullif(new_data->>'created_by','')::uuid,nullif(old_data->>'updated_by','')::uuid,nullif(old_data->>'created_by','')::uuid);
  if actor is null then raise exception 'O utilizador executor é obrigatório para criar o registo de auditoria.'; end if;
  insert into public.audit_log(firm_id,actor_user_id,action,entity_type,entity_id,previous_data,new_data)
  values(target_firm_id,actor,lower(tg_op),tg_table_name,target_id,old_data,new_data);
  return case when tg_op='DELETE' then old else new end;
end;
$$;

update public.user_login_credentials set display_name = username where display_name is null;
alter table public.user_login_credentials alter column display_name set not null;
alter table public.user_login_credentials add constraint user_login_credentials_display_name_format
  check (char_length(display_name) between 1 and 100 and display_name = btrim(display_name));

comment on column public.user_login_credentials.display_name is
  'Nome apresentado durante a sessão; é independente do username usado exclusivamente no login.';

comment on column public.user_login_credentials.must_change_pin is
  'Bloqueia o acesso aos dados de negócio até o utilizador substituir o PIN inicial definido pela administração.';

create or replace function private.has_completed_pin_setup(target_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select not exists (
    select 1 from public.user_login_credentials credential
    where credential.user_id = target_user_id and credential.must_change_pin
  );
$$;

create or replace function private.has_scope_access(
  target_firm_id uuid, target_billing_entity_id uuid default null,
  target_client_id uuid default null, target_matter_id uuid default null,
  required_permission text default 'view'
)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.has_completed_pin_setup((select auth.uid()))
    and private.has_accepted_current_terms((select auth.uid())) and (
      exists (select 1 from public.firm_members fm where fm.firm_id = target_firm_id
        and fm.user_id = (select auth.uid()) and fm.active and fm.role in ('owner', 'admin'))
      or exists (
        select 1 from public.access_grants ag
        where ag.firm_id = target_firm_id and ag.active and ag.valid_from <= now()
          and (ag.valid_until is null or ag.valid_until > now())
          and private.permission_rank(ag.permission) >= private.permission_rank(required_permission)
          and ((ag.principal_type = 'user' and ag.user_id = (select auth.uid()))
            or (ag.principal_type = 'team' and exists (
              select 1 from public.team_members tm where tm.team_id = ag.team_id
                and tm.user_id = (select auth.uid()) and tm.firm_id = target_firm_id)))
          and (ag.resource_type = 'firm'
            or (ag.resource_type = 'billing_entity' and ag.billing_entity_id = target_billing_entity_id)
            or (ag.resource_type = 'client' and ag.client_id = target_client_id)
            or (ag.resource_type = 'matter' and ag.matter_id = target_matter_id))
      )
    );
$$;

revoke all on function private.has_completed_pin_setup(uuid) from public, anon;
grant execute on function private.has_completed_pin_setup(uuid) to authenticated;

create table public.client_profiles (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.law_firms(id) on delete restrict,
  client_id uuid not null,
  client_type text not null check (client_type in ('individual','company')),
  client_code text not null check (btrim(client_code) <> ''),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (firm_id,client_id) references public.clients(firm_id,id) on delete restrict,
  unique (firm_id,client_id,client_type),
  unique (firm_id,client_code),
  unique (firm_id,client_id,id)
);

comment on table public.client_profiles is
  'Vertentes operacionais do cliente. Uma mesma entidade pode ter simultaneamente perfil particular e empresa.';

insert into public.client_profiles (firm_id,client_id,client_type,client_code)
select firm_id,id,client_type,client_code from public.clients;

alter table public.work_entries add column client_profile_id uuid;
update public.work_entries w set client_profile_id = cp.id
from public.client_profiles cp where cp.firm_id=w.firm_id and cp.client_id=w.client_id and cp.client_type=(select c.client_type from public.clients c where c.id=w.client_id);
alter table public.work_entries alter column client_profile_id set not null;
alter table public.work_entries add constraint work_entries_client_profile_fkey
  foreign key (firm_id,client_id,client_profile_id) references public.client_profiles(firm_id,client_id,id) on delete restrict;

alter table public.client_profiles enable row level security;
create policy client_profiles_select_scope on public.client_profiles for select to authenticated
using ((select private.has_scope_access(firm_id,null,client_id,null,'view')));
create policy client_profiles_insert_admin on public.client_profiles for insert to authenticated
with check ((select private.has_firm_role(firm_id,array['owner','admin'])));
create policy client_profiles_update_admin on public.client_profiles for update to authenticated
using ((select private.has_firm_role(firm_id,array['owner','admin'])))
with check ((select private.has_firm_role(firm_id,array['owner','admin'])));
grant select,insert,update on public.client_profiles to authenticated;

create or replace function public.get_client_category_dashboard(p_client_type text default null)
returns jsonb language sql stable security invoker set search_path = '' as $$
with entries as (
  select w.*, cp.client_type from public.work_entries w
  join public.client_profiles cp on cp.id = w.client_profile_id
  where p_client_type is null
    or (p_client_type in ('individual','company') and cp.client_type = p_client_type)
    or (p_client_type='mixed' and exists (
      select 1 from public.client_profiles other where other.firm_id=cp.firm_id
        and other.client_id=cp.client_id and other.active and other.client_type<>cp.client_type))
), annual as (
  select extract(year from work_date)::int label, round(sum(effective_amount),2) value from entries group by 1 order by 1
), monthly as (
  select extract(month from work_date)::int label, round(sum(effective_amount),2) value from entries
  where extract(year from work_date)=(select max(extract(year from work_date)) from entries) group by 1 order by 1
), recent as (
  select work_date, activity_description, duration_minutes, effective_amount from entries order by work_date desc, created_at desc limit 8
), totals as (
  select coalesce(sum(duration_minutes),0) minutes, coalesce(sum(effective_amount),0) total,
    coalesce(sum(effective_amount) filter(where is_invoiced),0) invoiced,
    coalesce(sum(effective_amount) filter(where is_paid),0) paid,
    count(*) movements, count(distinct client_id) clients, count(distinct professional_id) professionals,
    count(distinct billing_entity_id) billing_entities from entries
)
select jsonb_build_object(
  'selectedId',coalesce(p_client_type,'all'), 'options','[]'::jsonb,
  'identity',jsonb_build_object(
    'title',case p_client_type when 'individual' then 'Particulares' when 'company' then 'Empresas' when 'mixed' then 'Clientes mistos' else 'Todos os clientes' end,
    'subtitle',case p_client_type when 'individual' then 'Clientes particulares' when 'company' then 'Clientes empresariais' when 'mixed' then 'Clientes com vertente particular e empresa' else 'Consolidado de particulares e empresas' end,
    'code',''),
  'metrics',jsonb_build_object('minutes',t.minutes,'total',t.total,'invoiced',t.invoiced,'paid',t.paid,'pending',t.invoiced-t.paid,
    'averageRate',case when t.minutes=0 then 0 else round(t.total*60/t.minutes,2) end,'movements',t.movements,'clients',t.clients,'professionals',t.professionals,'billingEntities',t.billing_entities),
  'annual',coalesce((select jsonb_agg(to_jsonb(annual)) from annual),'[]'::jsonb),
  'monthly',coalesce((select jsonb_agg(to_jsonb(monthly)) from monthly),'[]'::jsonb),
  'recent',coalesce((select jsonb_agg(to_jsonb(recent)) from recent),'[]'::jsonb)
) from totals t where p_client_type is null or p_client_type in ('individual','company','mixed');
$$;

revoke all on function public.get_client_category_dashboard(text) from public, anon;
grant execute on function public.get_client_category_dashboard(text) to authenticated;
