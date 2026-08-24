create extension if not exists supabase_vault;

create table public.client_platform_credentials (
  id uuid primary key default gen_random_uuid(),firm_id uuid not null,client_id uuid not null,
  platform_name text not null check (btrim(platform_name)<>''),platform_url text,username text not null default '',
  current_secret_id uuid not null,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),created_by uuid not null default auth.uid(),
  foreign key(firm_id,client_id)references public.clients(firm_id,id)on delete cascade
);
create table public.client_platform_credential_versions (
  id uuid primary key default gen_random_uuid(),credential_id uuid not null references public.client_platform_credentials(id)on delete cascade,
  secret_id uuid not null,valid_from timestamptz not null default now(),valid_until timestamptz,changed_by uuid not null default auth.uid()
);
create table public.client_credential_access_audit (
  id uuid primary key default gen_random_uuid(),firm_id uuid not null,client_id uuid not null,credential_id uuid,
  action text not null check(action in('view','create','update','delete','history')),actor_id uuid not null default auth.uid(),occurred_at timestamptz not null default now()
);
alter table public.client_platform_credentials enable row level security;
alter table public.client_platform_credential_versions enable row level security;
alter table public.client_credential_access_audit enable row level security;
revoke all on public.client_platform_credentials,public.client_platform_credential_versions,public.client_credential_access_audit from anon,authenticated;

create or replace function private.can_access_client_credentials(target_firm uuid,target_client uuid,target_permission text)
returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and(private.has_firm_role(target_firm,array['owner','admin','operator'])or private.has_scope_access(target_firm,null,target_client,null,target_permission));
$$;
revoke all on function private.can_access_client_credentials(uuid,uuid,text)from public,anon,authenticated;

create or replace function public.list_client_platform_credentials(p_client_id uuid)
returns table(id uuid,platform_name text,platform_url text,username text,password text,version_count bigint,updated_at timestamptz)
language plpgsql security definer set search_path='' as $$
declare target_firm uuid;
begin select firm_id into target_firm from public.clients where clients.id=p_client_id;if not private.can_access_client_credentials(target_firm,p_client_id,'view')then raise exception 'not authorized'using errcode='42501';end if;
 insert into public.client_credential_access_audit(firm_id,client_id,action)values(target_firm,p_client_id,'view');
 return query select c.id,c.platform_name,c.platform_url,c.username,d.decrypted_secret,(select count(*)from public.client_platform_credential_versions v where v.credential_id=c.id),c.updated_at from public.client_platform_credentials c join vault.decrypted_secrets d on d.id=c.current_secret_id where c.client_id=p_client_id order by c.platform_name;
end;$$;
revoke all on function public.list_client_platform_credentials(uuid)from public,anon;grant execute on function public.list_client_platform_credentials(uuid)to authenticated;

create or replace function public.list_client_platform_credential_history(p_credential_id uuid)
returns table(version_id uuid,password text,valid_from timestamptz,valid_until timestamptz,changed_by uuid)
language plpgsql security definer set search_path='' as $$
declare item public.client_platform_credentials;
begin select * into item from public.client_platform_credentials where id=p_credential_id;if item.id is null or not private.can_access_client_credentials(item.firm_id,item.client_id,'view')then raise exception 'not authorized'using errcode='42501';end if;
 insert into public.client_credential_access_audit(firm_id,client_id,credential_id,action)values(item.firm_id,item.client_id,item.id,'history');
 return query select v.id,d.decrypted_secret,v.valid_from,v.valid_until,v.changed_by from public.client_platform_credential_versions v join vault.decrypted_secrets d on d.id=v.secret_id where v.credential_id=item.id order by v.valid_from desc;
end;$$;
revoke all on function public.list_client_platform_credential_history(uuid)from public,anon;grant execute on function public.list_client_platform_credential_history(uuid)to authenticated;

create or replace function public.save_client_platform_credential(p_client_id uuid,p_credential_id uuid,p_platform_name text,p_platform_url text,p_username text,p_password text)
returns uuid language plpgsql security definer set search_path='' as $$
declare target_firm uuid;target_id uuid;secret_id uuid;item public.client_platform_credentials;
begin select firm_id into target_firm from public.clients where id=p_client_id;if not private.can_access_client_credentials(target_firm,p_client_id,'edit')then raise exception 'not authorized'using errcode='42501';end if;
 if btrim(coalesce(p_platform_name,''))=''or coalesce(p_password,'')=''or(p_platform_url is not null and btrim(p_platform_url)<>''and p_platform_url!~'^https://')then raise exception 'invalid credential';end if;
 secret_id:=vault.create_secret(p_password,null,format('Credencial de Cliente %s',p_client_id));
 if p_credential_id is null then insert into public.client_platform_credentials(firm_id,client_id,platform_name,platform_url,username,current_secret_id)values(target_firm,p_client_id,btrim(p_platform_name),nullif(btrim(coalesce(p_platform_url,'')),''),coalesce(p_username,''),secret_id)returning id into target_id;
 else select * into item from public.client_platform_credentials where id=p_credential_id and client_id=p_client_id for update;if item.id is null then raise exception 'credential not found';end if;update public.client_platform_credential_versions set valid_until=now()where credential_id=item.id and valid_until is null;update public.client_platform_credentials set platform_name=btrim(p_platform_name),platform_url=nullif(btrim(coalesce(p_platform_url,'')),''),username=coalesce(p_username,''),current_secret_id=secret_id,updated_at=now()where id=item.id;target_id:=item.id;end if;
 insert into public.client_platform_credential_versions(credential_id,secret_id)values(target_id,secret_id);
 insert into public.client_credential_access_audit(firm_id,client_id,credential_id,action)values(target_firm,p_client_id,target_id,case when p_credential_id is null then'create'else'update'end);
 return target_id;
end;$$;
revoke all on function public.save_client_platform_credential(uuid,uuid,text,text,text,text)from public,anon;grant execute on function public.save_client_platform_credential(uuid,uuid,text,text,text,text)to authenticated;

create or replace function public.delete_client_platform_credential(p_credential_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare item public.client_platform_credentials;secret uuid;
begin select * into item from public.client_platform_credentials where id=p_credential_id for update;if item.id is null or not private.can_access_client_credentials(item.firm_id,item.client_id,'edit')then raise exception 'not authorized'using errcode='42501';end if;
 insert into public.client_credential_access_audit(firm_id,client_id,credential_id,action)values(item.firm_id,item.client_id,item.id,'delete');
 for secret in select secret_id from public.client_platform_credential_versions where credential_id=item.id loop delete from vault.secrets where id=secret;end loop;delete from public.client_platform_credentials where id=item.id;
end;$$;
revoke all on function public.delete_client_platform_credential(uuid)from public,anon;grant execute on function public.delete_client_platform_credential(uuid)to authenticated;
notify pgrst,'reload schema';
