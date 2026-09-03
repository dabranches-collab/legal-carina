-- Additive, no backfill: historical referrals must be completed by the office.
alter table public.clients add column client_referrer text
  check (client_referrer in ('carina','hugo'));
alter table public.work_entries add column task_referrer text
  check (task_referrer in ('carina','hugo','other'));
alter table public.work_entries add column task_referrer_other text;
alter table public.work_entries add constraint work_task_referrer_other_valid check (
  (task_referrer is not distinct from 'other' and nullif(btrim(task_referrer_other),'') is not null and length(task_referrer_other)<=200)
  or (task_referrer is distinct from 'other' and task_referrer_other is null)
);

create function private.is_legalteam(p_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.billing_entities where id=p_id and regexp_replace(lower(name),'\s','','g')='legalteam');
$$;
revoke all on function private.is_legalteam(uuid) from public,anon;

-- Deferred check permits the existing transactional creation RPC to calculate prices
-- before the new wrapper attaches the referral. Legacy rows are not guessed/backfilled.
create function private.require_task_referrer() returns trigger
language plpgsql security definer set search_path='' as $$
declare current_entry public.work_entries;
begin
 if tg_op='UPDATE' then
  if new.billing_entity_id is not distinct from old.billing_entity_id
    and new.task_referrer is not distinct from old.task_referrer
    and new.task_referrer_other is not distinct from old.task_referrer_other then return null;end if;
 end if;
 select * into current_entry from public.work_entries where id=new.id;
 if current_entry.id is not null and private.is_legalteam(current_entry.billing_entity_id)
    and current_entry.task_referrer is null then
   raise exception 'Indique o angariador da tarefa nos registos da LEGALTEAM.';
 end if;
 return null;
end;$$;
revoke all on function private.require_task_referrer() from public,anon;
create constraint trigger work_entries_require_task_referrer after insert or update on public.work_entries
deferrable initially deferred for each row execute function private.require_task_referrer();

create function public.create_work_entry_with_allocation(
 p_work_date date,p_client_profile_id uuid,p_matter_id uuid,p_professional_id uuid,
 p_billing_entity_id uuid,p_activity_description text,p_duration_minutes integer,
 p_observations text default null,p_hourly_rate numeric default null,
 p_billing_scope text default 'standard',p_expenses jsonb default '[]',
 p_billing_state text default 'billable',p_invoice_date date default null,
 p_task_referrer text default null,p_task_referrer_other text default null
) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;entry public.work_entries;
begin
 if auth.uid() is null then raise exception 'authentication required' using errcode='28000';end if;
 if private.is_legalteam(p_billing_entity_id) and nullif(p_task_referrer,'') is null then raise exception 'Indique o angariador da tarefa.';end if;
 result:=public.create_work_entry_with_treatment(p_work_date,p_client_profile_id,p_matter_id,p_professional_id,p_billing_entity_id,p_activity_description,p_duration_minutes,p_observations,p_hourly_rate,p_billing_scope,p_expenses,p_billing_state,p_invoice_date);
 select * into entry from public.work_entries where id=(result->>'workEntryId')::uuid;
 if not private.has_scope_access(entry.firm_id,entry.billing_entity_id,entry.client_id,entry.matter_id,'edit') then raise exception 'not authorized' using errcode='42501';end if;
 update public.work_entries set task_referrer=nullif(p_task_referrer,''),task_referrer_other=case when p_task_referrer='other' then nullif(btrim(p_task_referrer_other),'') else null end where id=entry.id;
 return result;
end;$$;
revoke all on function public.create_work_entry_with_allocation(date,uuid,uuid,uuid,uuid,text,integer,text,numeric,text,jsonb,text,date,text,text) from public,anon;
grant execute on function public.create_work_entry_with_allocation(date,uuid,uuid,uuid,uuid,text,integer,text,numeric,text,jsonb,text,date,text,text) to authenticated;

create function public.update_work_entry_with_allocation(p_work_entry_id uuid,p_values jsonb,p_reason text)
returns void language plpgsql security definer set search_path='' as $$
declare entry public.work_entries;referrer text;other_name text;target_society uuid;
begin
 if auth.uid() is null then raise exception 'authentication required' using errcode='28000';end if;
 select * into entry from public.work_entries where id=p_work_entry_id for update;
 if entry.id is null or not private.has_scope_access(entry.firm_id,entry.billing_entity_id,entry.client_id,entry.matter_id,'edit') then raise exception 'not authorized' using errcode='42501';end if;
 target_society:=nullif(p_values->>'billing_entity_id','')::uuid;
 if target_society is not null and not exists(select 1 from public.billing_entities where id=target_society and firm_id=entry.firm_id) then raise exception 'invalid society';end if;
 if not private.has_scope_access(entry.firm_id,target_society,entry.client_id,entry.matter_id,'edit') then raise exception 'not authorized' using errcode='42501';end if;
 referrer:=case when p_values?'task_referrer' then nullif(p_values->>'task_referrer','') else entry.task_referrer end;
 other_name:=case when referrer='other' then nullif(btrim(coalesce(p_values->>'task_referrer_other',entry.task_referrer_other)),'') else null end;
 if private.is_legalteam(target_society) and referrer is null then raise exception 'Indique o angariador da tarefa.';end if;
 perform public.update_work_entry_full(p_work_entry_id,p_values,p_reason);
 update public.work_entries set task_referrer=referrer,task_referrer_other=other_name where id=p_work_entry_id;
end;$$;
revoke all on function public.update_work_entry_with_allocation(uuid,jsonb,text) from public,anon;
grant execute on function public.update_work_entry_with_allocation(uuid,jsonb,text) to authenticated;

create function public.get_legalteam_allocation_work(p_billing_entity_id uuid,p_start date,p_end date,p_offset integer default 0,p_limit integer default 500)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare entity public.billing_entities;result jsonb;
begin
 select * into entity from public.billing_entities where id=p_billing_entity_id;
 if auth.uid() is null or entity.id is null or not private.is_legalteam(entity.id)
   or not private.has_scope_access(entity.firm_id,entity.id,null,null,'view')
   or not private.can_view_billing_financials(entity.firm_id,entity.id) then raise exception 'Sem permissão para consultar a repartição.' using errcode='42501';end if;
 if p_start is null or p_end is null or p_start>p_end or p_offset is null or p_offset<0 or p_limit is null or p_limit not between 1 and 500 then raise exception 'Período ou paginação inválidos.';end if;
 with eligible as materialized (
  select w.id,w.work_date,c.display_name client_name,coalesce(p.display_name,'') professional_name,
   w.activity_description,w.duration_minutes,w.effective_amount,w.currency,w.billing_scope,w.is_billable,w.is_paid,w.status,
   c.client_referrer,w.task_referrer,w.task_referrer_other
  from public.work_entries w join public.clients c on c.id=w.client_id and c.firm_id=w.firm_id
  left join public.professionals p on p.id=w.professional_id and p.firm_id=w.firm_id
  where w.firm_id=entity.firm_id and w.billing_entity_id=entity.id and w.work_date between p_start and p_end
   and w.currency='EUR' and private.has_scope_access(w.firm_id,w.billing_entity_id,w.client_id,w.matter_id,'view')
 ), page as(select * from eligible order by work_date,id offset p_offset limit p_limit)
 select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(page) order by work_date,id) from page),'[]'::jsonb),'total',(select count(*) from eligible)) into result;
 return result;
end;$$;
revoke all on function public.get_legalteam_allocation_work(uuid,date,date,integer,integer) from public,anon;
grant execute on function public.get_legalteam_allocation_work(uuid,date,date,integer,integer) to authenticated;
notify pgrst,'reload schema';
