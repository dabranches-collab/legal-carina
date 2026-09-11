-- Synthetic fixtures only; always execute inside BEGIN / ROLLBACK.
do $audit$
declare
  actor uuid := gen_random_uuid(); firm uuid := gen_random_uuid();
  client uuid := gen_random_uuid(); profile uuid := gen_random_uuid();
  professional uuid := gen_random_uuid(); entry uuid; result jsonb;
begin
  insert into auth.users(id,email) values(actor,actor::text||'@example.test');
  insert into public.law_firms(id,name) values(firm,'Hourly preference synthetic');
  insert into public.firm_members(firm_id,user_id,role) values(firm,actor,'owner');
  insert into public.clients(id,firm_id,client_code,client_type,display_name)
    values(client,firm,'02.1','individual','Hourly preference synthetic');
  insert into public.client_profiles(id,firm_id,client_id,client_type,client_code)
    values(profile,firm,client,'individual','02.1');
  insert into public.professionals(id,firm_id,display_name) values(professional,firm,'Synthetic professional');
  perform set_config('request.jwt.claim.sub',actor::text,true);
  execute 'set local role authenticated';
  if (select default_hourly_rate from public.clients where id=client) is not null then
    raise exception 'New clients must start without a default';
  end if;
  update public.clients set default_hourly_rate=125.50 where id=client;
  if (select default_hourly_rate from public.clients where id=client) is distinct from 125.50 then
    raise exception 'Authenticated owner cannot persist hourly preference';
  end if;
  result:=public.create_work_entry_with_allocation(current_date,profile,null,professional,null,
    'Synthetic default rate',90,null,(select default_hourly_rate from public.clients where id=client));
  entry:=(result->>'workEntryId')::uuid;
  if entry is null or (select effective_amount from public.work_entries where id=entry) is distinct from 188.25 then
    raise exception 'Prefilled rate must calculate 90 minutes as 188.25';
  end if;
  perform public.create_work_entry_with_allocation(current_date,profile,null,professional,null,
    'Synthetic overridden rate',60,null,80);
  if (select default_hourly_rate from public.clients where id=client) is distinct from 125.50 then
    raise exception 'Entry override changed the client preference';
  end if;
  update public.clients set default_hourly_rate=200 where id=client;
  if (select effective_amount from public.work_entries where id=entry) is distinct from 188.25 then
    raise exception 'Changing preference repriced an existing entry';
  end if;
  begin
    update public.clients set default_hourly_rate=-1 where id=client;
    raise exception 'Negative rate accepted';
  exception when check_violation then null;
  end;
  begin
    update public.clients set default_hourly_rate='NaN'::numeric where id=client;
    raise exception 'NaN rate accepted';
  exception when check_violation then null;
  end;
  update public.clients set default_hourly_rate=0 where id=client;
  if (select default_hourly_rate from public.clients where id=client) is distinct from 0 then
    raise exception 'Zero rate lost';
  end if;
  update public.clients set default_hourly_rate=null where id=client;
  if (select default_hourly_rate from public.clients where id=client) is not null then
    raise exception 'Cannot remove preference';
  end if;
  execute 'reset role';
end;
$audit$;
select 'PASS: default, save, calculation, override, historical stability, negative/NaN rejection, zero and removal' as result;
