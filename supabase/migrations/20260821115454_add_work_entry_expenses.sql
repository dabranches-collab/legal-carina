-- Despesas operacionais associadas a movimentos. São sempre informativas e
-- deliberadamente independentes de effective_amount e de toda a facturação.
create table public.work_entry_expenses (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.law_firms(id) on delete restrict,
  work_entry_id uuid not null,
  amount numeric(14,2) not null check (amount > 0),
  currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  observations text check (observations is null or length(observations) <= 4000),
  status text not null default 'active' check (status in ('active','removed')),
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  updated_by uuid references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (firm_id,work_entry_id) references public.work_entries(firm_id,id) on delete restrict,
  unique (firm_id,id)
);

create index work_entry_expenses_entry_idx on public.work_entry_expenses(work_entry_id,created_at)
  where status='active';
create trigger work_entry_expenses_set_updated_at before update on public.work_entry_expenses
for each row execute function private.set_updated_at();
create trigger work_entry_expenses_audit after insert or update or delete on public.work_entry_expenses
for each row execute function private.audit_business_change();

alter table public.work_entry_expenses enable row level security;
revoke all on public.work_entry_expenses from public,anon,authenticated;
grant select on public.work_entry_expenses to authenticated;

create or replace function private.can_manage_work_expense(target_work_entry_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.work_entries w where w.id=target_work_entry_id
   and private.has_firm_role(w.firm_id,array['owner','admin','operator']));
$$;
revoke all on function private.can_manage_work_expense(uuid) from public,anon,authenticated;
grant execute on function private.can_manage_work_expense(uuid) to authenticated;

create policy work_entry_expenses_select_scoped on public.work_entry_expenses for select to authenticated
using (private.can_manage_work_expense(work_entry_id));

create table public.work_entry_expense_documents (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.law_firms(id) on delete restrict,
  expense_id uuid not null,
  original_filename text not null check (btrim(original_filename)<>''),
  storage_path text not null check (storage_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/expenses/[0-9a-f-]{36}/[0-9a-f-]{36}/[^/]+$'),
  mime_type text not null check (mime_type in ('application/pdf','image/jpeg','image/png','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')),
  size_bytes bigint not null check (size_bytes>0 and size_bytes<=20971520),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  status text not null default 'active' check (status in ('active','removed')),
  uploaded_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  updated_by uuid references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (firm_id,expense_id) references public.work_entry_expenses(firm_id,id) on delete restrict,
  unique (firm_id,storage_path)
);
create unique index work_entry_expense_documents_content_idx
  on public.work_entry_expense_documents(expense_id,sha256) where status='active';
create index work_entry_expense_documents_expense_idx
  on public.work_entry_expense_documents(expense_id,created_at) where status='active';
create trigger work_entry_expense_documents_set_updated_at before update on public.work_entry_expense_documents
for each row execute function private.set_updated_at();
create trigger work_entry_expense_documents_audit after insert or update or delete on public.work_entry_expense_documents
for each row execute function private.audit_business_change();
alter table public.work_entry_expense_documents enable row level security;
revoke all on public.work_entry_expense_documents from public,anon,authenticated;
grant select on public.work_entry_expense_documents to authenticated;
create policy work_entry_expense_documents_select_scoped on public.work_entry_expense_documents for select to authenticated
using (exists(select 1 from public.work_entry_expenses e where e.id=expense_id and private.can_manage_work_expense(e.work_entry_id)));

create or replace function public.create_work_entry_expense(p_work_entry_id uuid,p_amount numeric,p_observations text default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare target public.work_entries; expense_id uuid;
begin
 select * into target from public.work_entries where id=p_work_entry_id;
 if target.id is null or not private.can_manage_work_expense(p_work_entry_id) then raise exception 'not authorized'; end if;
 if p_amount is null or p_amount::text='NaN' or p_amount<=0 or length(coalesce(p_observations,''))>4000 then raise exception 'invalid expense'; end if;
 insert into public.work_entry_expenses(firm_id,work_entry_id,amount,currency,observations,created_by)
 values(target.firm_id,target.id,round(p_amount,2),coalesce(target.currency,'EUR'),nullif(btrim(coalesce(p_observations,'')),''),auth.uid()) returning id into expense_id;
 return expense_id;
end;$$;

create or replace function public.update_work_entry_expense(p_expense_id uuid,p_amount numeric,p_observations text default null,p_reason text default null)
returns void language plpgsql security definer set search_path='' as $$
declare expense public.work_entry_expenses; is_operator boolean;
begin
 select * into expense from public.work_entry_expenses where id=p_expense_id and status='active';
 if expense.id is null or not private.can_manage_work_expense(expense.work_entry_id) then raise exception 'not authorized'; end if;
 is_operator:=private.has_firm_role(expense.firm_id,array['operator']) and not private.has_firm_role(expense.firm_id,array['owner','admin']);
 if is_operator and btrim(coalesce(p_reason,''))='' then raise exception 'reason required'; end if;
 if p_amount is null or p_amount::text='NaN' or p_amount<=0 or length(coalesce(p_observations,''))>4000 then raise exception 'invalid expense'; end if;
 update public.work_entry_expenses set amount=round(p_amount,2),observations=nullif(btrim(coalesce(p_observations,'')),''),updated_by=auth.uid() where id=p_expense_id;
 if btrim(coalesce(p_reason,''))<>'' then
  insert into public.audit_log(firm_id,actor_user_id,action,entity_type,entity_id,previous_data,new_data)
  values(expense.firm_id,auth.uid(),'update','work_entry_expense_reason',expense.id,to_jsonb(expense),jsonb_build_object('reason',btrim(p_reason)));
 end if;
end;$$;

create or replace function public.remove_work_entry_expense(p_expense_id uuid,p_reason text default null)
returns void language plpgsql security definer set search_path='' as $$
declare expense public.work_entry_expenses; is_operator boolean;
begin
 select * into expense from public.work_entry_expenses where id=p_expense_id and status='active';
 if expense.id is null or not private.can_manage_work_expense(expense.work_entry_id) then raise exception 'not authorized'; end if;
 is_operator:=private.has_firm_role(expense.firm_id,array['operator']) and not private.has_firm_role(expense.firm_id,array['owner','admin']);
 if is_operator and btrim(coalesce(p_reason,''))='' then raise exception 'reason required'; end if;
 update public.work_entry_expenses set status='removed',updated_by=auth.uid() where id=p_expense_id;
 if btrim(coalesce(p_reason,''))<>'' then
  insert into public.audit_log(firm_id,actor_user_id,action,entity_type,entity_id,previous_data,new_data)
  values(expense.firm_id,auth.uid(),'update','work_entry_expense_reason',expense.id,to_jsonb(expense),jsonb_build_object('reason',btrim(p_reason)));
 end if;
end;$$;

create or replace function public.can_manage_work_entry_expense_document(target_expense_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.work_entry_expenses e where e.id=target_expense_id and e.status='active'
   and private.can_manage_work_expense(e.work_entry_id));
$$;

-- Cria o movimento e todas as despesas na mesma transacção. Os documentos são
-- carregados depois, porque o Storage não participa numa transacção PostgreSQL.
create or replace function public.create_work_entry_with_expenses(
  p_work_date date,p_client_profile_id uuid,p_matter_id uuid,p_professional_id uuid,
  p_billing_entity_id uuid,p_activity_description text,p_duration_minutes integer,
  p_observations text default null,p_hourly_rate numeric default null,p_expenses jsonb default '[]'::jsonb
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  new_work_entry_id uuid;
  item jsonb;
  new_expense_id uuid;
  result_expenses jsonb:='[]'::jsonb;
  item_amount numeric;
begin
  if jsonb_typeof(coalesce(p_expenses,'[]'::jsonb))<>'array' or jsonb_array_length(coalesce(p_expenses,'[]'::jsonb))>100 then
    raise exception 'invalid expenses';
  end if;
  new_work_entry_id:=public.create_work_entry(p_work_date,p_client_profile_id,p_matter_id,p_professional_id,p_billing_entity_id,p_activity_description,p_duration_minutes,p_observations,p_hourly_rate);
  for item in select value from jsonb_array_elements(coalesce(p_expenses,'[]'::jsonb)) loop
    if jsonb_typeof(item)<>'object' or btrim(coalesce(item->>'key',''))='' then raise exception 'invalid expense'; end if;
    begin item_amount:=(item->>'amount')::numeric; exception when others then raise exception 'invalid expense'; end;
    new_expense_id:=public.create_work_entry_expense(new_work_entry_id,item_amount,item->>'observations');
    result_expenses:=result_expenses||jsonb_build_array(jsonb_build_object('key',item->>'key','id',new_expense_id));
  end loop;
  return jsonb_build_object('workEntryId',new_work_entry_id,'expenses',result_expenses);
end;$$;

revoke all on function public.create_work_entry_expense(uuid,numeric,text) from public,anon;
revoke all on function public.update_work_entry_expense(uuid,numeric,text,text) from public,anon;
revoke all on function public.remove_work_entry_expense(uuid,text) from public,anon;
revoke all on function public.can_manage_work_entry_expense_document(uuid) from public,anon;
revoke all on function public.create_work_entry_with_expenses(date,uuid,uuid,uuid,uuid,text,integer,text,numeric,jsonb) from public,anon;
grant execute on function public.create_work_entry_expense(uuid,numeric,text) to authenticated;
grant execute on function public.update_work_entry_expense(uuid,numeric,text,text) to authenticated;
grant execute on function public.remove_work_entry_expense(uuid,text) to authenticated;
grant execute on function public.can_manage_work_entry_expense_document(uuid) to authenticated;
grant execute on function public.create_work_entry_with_expenses(date,uuid,uuid,uuid,uuid,text,integer,text,numeric,jsonb) to authenticated;

comment on table public.work_entry_expenses is 'Despesas informativas por movimento; não integram facturação, IVA ou totais financeiros.';
