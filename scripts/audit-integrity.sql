-- Read-only audit of persisted business data; temporary results are rolled back.
begin;
set local statement_timeout='45s';
create temp table integrity_results(check_name text,violations bigint);
do $audit$
declare c record; predicate text; present text; failures bigint; expression text;
begin
 for c in select pc.* from pg_constraint pc join pg_class t on t.oid=pc.conrelid join pg_namespace n on n.oid=t.relnamespace where n.nspname='public' and pc.contype='f' loop
  select string_agg(format('child.%I=parent.%I',a.attname,b.attname),' and '),string_agg(format('child.%I is not null',a.attname),' and ')
   into predicate,present from unnest(c.conkey,c.confkey) as k(a,b)
   join pg_attribute a on a.attrelid=c.conrelid and a.attnum=k.a join pg_attribute b on b.attrelid=c.confrelid and b.attnum=k.b;
  execute format('select count(*) from %s child where %s and not exists(select 1 from %s parent where %s)',c.conrelid::regclass,present,c.confrelid::regclass,predicate) into failures;
  insert into integrity_results values('FK: '||c.conname,failures);
  if exists(select 1 from pg_attribute where attrelid=c.conrelid and attname='firm_id') and exists(select 1 from pg_attribute where attrelid=c.confrelid and attname='firm_id') then
   execute format('select count(*) from %s child join %s parent on %s where child.firm_id<>parent.firm_id',c.conrelid::regclass,c.confrelid::regclass,predicate) into failures;
   insert into integrity_results values('Firma: '||c.conname,failures);
  end if;
 end loop;
 for c in select pc.* from pg_constraint pc join pg_class t on t.oid=pc.conrelid join pg_namespace n on n.oid=t.relnamespace where n.nspname='public' and pc.contype='c' loop
  expression:=pg_get_expr(c.conbin,c.conrelid);
  execute format('select count(*) from %s where not (%s)',c.conrelid::regclass,expression) into failures;
  insert into integrity_results values('CHECK: '||c.conname,failures);
 end loop;
end $audit$;
insert into integrity_results
select 'Perfil de movimento pertence ao cliente',count(*) from work_entries w join client_profiles p on p.id=w.client_profile_id where w.client_id<>p.client_id
union all select 'Despesas na moeda do movimento',count(*) from work_entry_expenses e join work_entries w on w.id=e.work_entry_id where e.currency<>w.currency
union all select 'Mensalidade pertence ao cliente da avença',count(*) from retainer_charges c join client_retainers r on r.id=c.retainer_id where c.client_id<>r.client_id
union all select 'Nota pertence à conta do lançamento',count(*) from client_credit_movements m join provision_honorarium_notes n on n.id=m.note_id where n.account_id<>m.account_id
union all select 'Estorno na mesma conta e de montante inverso',count(*) from client_credit_movements m join client_credit_movements r on r.id=m.reverses_id where m.account_id<>r.account_id or m.amount<>-r.amount
union all select 'Saldo contabilístico não negativo',count(*) from (select account_id from client_credit_movements group by account_id having sum(amount)<0) x
union all select 'Total e dedução da nota',count(*) from provision_honorarium_notes where round(subtotal+vat,2)<>total or round(total-deducted,2)<>remaining or deducted<0 or deducted>total
union all select 'Estados pagos coerentes',count(*) from work_entries where is_paid and not is_invoiced and not has_historical_state_exception;
select count(*) checks,sum(violations) violations,coalesce(jsonb_agg(jsonb_build_object('check',check_name,'count',violations)) filter(where violations>0),'[]') findings from integrity_results;
rollback;
