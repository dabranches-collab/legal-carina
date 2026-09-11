-- Named referrers are recipients of the allocation, never authentication users.
create table public.client_referrers (
 id uuid primary key default gen_random_uuid(),
 firm_id uuid not null references public.law_firms(id),
 name text not null check(length(btrim(name)) between 1 and 200),
 created_at timestamptz not null default now(),
 created_by uuid default auth.uid(),
 unique(firm_id,id)
);
create unique index client_referrers_firm_name on public.client_referrers(firm_id,lower(btrim(name)));
alter table public.clients add column client_referrer_other text;
alter table public.clients add column client_referrer_id uuid;
alter table public.clients add column primary_billing_entity_id uuid references public.billing_entities(id);
alter table public.clients add constraint clients_referrer_same_firm foreign key(firm_id,client_referrer_id) references public.client_referrers(firm_id,id);
alter table public.clients drop constraint clients_client_referrer_check;
alter table public.clients add constraint clients_client_referrer_check check(client_referrer in ('carina','hugo','other'));
alter table public.clients add constraint clients_other_referrer_complete check(
 (client_referrer is not distinct from 'other' and client_referrer_id is not null and nullif(btrim(client_referrer_other),'') is not null)
 or (client_referrer is distinct from 'other' and client_referrer_id is null and client_referrer_other is null)
);
create index clients_referrer_directory on public.clients(client_referrer_id) where client_referrer_id is not null;
alter table public.client_referrers enable row level security;
revoke all on public.client_referrers from public,anon,authenticated;
grant select on public.client_referrers to authenticated;
create policy client_referrers_read on public.client_referrers for select to authenticated using(
 (select private.has_firm_role(firm_id,array['owner','admin','operator']))
 or exists(select 1 from public.clients c where c.client_referrer_id=client_referrers.id)
);
create function private.assign_client_referrer() returns trigger
language plpgsql security definer set search_path='' as $$
declare label text;recipient public.client_referrers;
begin
 if new.primary_billing_entity_id is not null and not exists(select 1 from public.billing_entities b where b.id=new.primary_billing_entity_id and b.firm_id=new.firm_id) then
  raise exception 'A sociedade do cliente deve pertencer ao mesmo escritório.' using errcode='23514';
 end if;
 if new.client_referrer='other' then
  label:=regexp_replace(btrim(coalesce(new.client_referrer_other,'')),'\s+',' ','g');
  if length(label) not between 1 and 200 then raise exception 'Preencha o nome do angariador (até 200 caracteres).' using errcode='23514';end if;
  if lower(label) in ('carina','carina santos') then new.client_referrer:='carina';
  elsif lower(label) in ('hugo','hugo mendonça','hugo mendonca') then new.client_referrer:='hugo';
  else
   insert into public.client_referrers(firm_id,name) values(new.firm_id,label)
   on conflict(firm_id,lower(btrim(name))) do update set name=client_referrers.name returning * into recipient;
   new.client_referrer_id:=recipient.id;new.client_referrer_other:=recipient.name;
  end if;
 end if;
 if new.client_referrer is distinct from 'other' then new.client_referrer_id:=null;new.client_referrer_other:=null;end if;
 return new;
end;$$;
revoke all on function private.assign_client_referrer() from public,anon,authenticated;
create trigger assign_client_referrer before insert or update of client_referrer,client_referrer_other,client_referrer_id,primary_billing_entity_id,firm_id on public.clients
 for each row execute function private.assign_client_referrer();

-- Preserve permissions and data; avoid repeating the full scope check for each 500-row page.
create or replace function public.get_legalteam_allocation_work(p_billing_entity_id uuid,p_start date,p_end date,p_offset integer default 0,p_limit integer default 500)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare entity public.billing_entities;result jsonb;
begin
 select * into entity from public.billing_entities where id=p_billing_entity_id;
 if auth.uid() is null or entity.id is null or not private.is_legalteam(entity.id)
   or not private.has_scope_access(entity.firm_id,entity.id,null,null,'view')
   or not private.can_view_billing_financials(entity.firm_id,entity.id) then raise exception 'Sem permissão para consultar a repartição.' using errcode='42501';end if;
 -- Both dates may be null to obtain the complete authorised period, still paginated.
 if (p_start is null)<>(p_end is null) or p_start>p_end or p_offset is null or p_offset<0 or p_limit is null or p_limit not between 1 and 5000 then raise exception 'Período ou paginação inválidos.';end if;
 with eligible as materialized (
  select w.id,w.client_id,w.work_date,c.display_name client_name,coalesce(p.display_name,'') professional_name,
   w.activity_description,w.duration_minutes,w.effective_amount,w.currency,w.billing_scope,w.is_billable,w.is_paid,w.status,
   c.client_referrer,c.client_referrer_other,c.client_referrer_id,w.task_referrer,w.task_referrer_other
  from public.work_entries w join public.clients c on c.id=w.client_id and c.firm_id=w.firm_id
  left join public.professionals p on p.id=w.professional_id and p.firm_id=w.firm_id
  where w.firm_id=entity.firm_id and w.billing_entity_id=entity.id and (p_start is null or w.work_date between p_start and p_end)
   and w.currency='EUR' and private.has_scope_access(w.firm_id,w.billing_entity_id,w.client_id,w.matter_id,'view')
 ), page as(select * from eligible order by work_date,id offset p_offset limit p_limit)
 select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(page) order by work_date,id) from page),'[]'::jsonb),'total',(select count(*) from eligible)) into result;
 return result;
end;$$;
revoke all on function public.get_legalteam_allocation_work(uuid,date,date,integer,integer) from public,anon;
grant execute on function public.get_legalteam_allocation_work(uuid,date,date,integer,integer) to authenticated;
notify pgrst,'reload schema';
