create or replace function public.register_pin_login_failure(
  p_credential_id uuid,
  p_ip_hash text default null,
  p_user_agent text default null
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  credential public.user_login_credentials%rowtype;
  next_attempts integer;
  should_lock boolean;
  blocked_until timestamptz;
begin
  select * into credential from public.user_login_credentials where id=p_credential_id for update;
  if credential.id is null then raise exception 'credential not found' using errcode='22023'; end if;
  next_attempts:=least(coalesce(credential.failed_attempts,0)+1,20);
  should_lock:=next_attempts>=5;
  blocked_until:=case when should_lock then now()+interval '15 minutes' else null end;
  update public.user_login_credentials set failed_attempts=case when should_lock then 0 else next_attempts end,last_failed_at=now(),locked_until=blocked_until where id=credential.id;
  insert into public.security_events(user_id,event_type,ip_hash,user_agent,metadata)
  values(credential.user_id,'login_failed',left(p_ip_hash,64),left(p_user_agent,500),jsonb_build_object('auth_method','pin'));
  return jsonb_build_object('locked',should_lock,'lockedUntil',blocked_until,'attempts',case when should_lock then 0 else next_attempts end);
end;$$;

revoke all on function public.register_pin_login_failure(uuid,text,text) from public,anon,authenticated;
grant execute on function public.register_pin_login_failure(uuid,text,text) to service_role;

comment on function public.register_pin_login_failure(uuid,text,text) is
  'Atomically records a failed PIN attempt and applies the credential lock; service role only.';
