// Isolated PostgreSQL test. Pass the local PGlite module path as argv[2]. No remote connection.
import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'
const {PGlite}=await import(pathToFileURL(resolve(process.argv[2]||'.tmp/provision-db/package/dist/index.js')).href)
const db=new PGlite()
const u='00000000-0000-4000-8000-000000000001',firm='00000000-0000-4000-8000-000000000010',client='00000000-0000-4000-8000-000000000020',society='00000000-0000-4000-8000-000000000030',work='00000000-0000-4000-8000-000000000040'
await db.exec(`create role anon;create role authenticated;create schema auth;create schema private;
 create table auth.users(id uuid primary key);insert into auth.users values('${u}');
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.user',true),'')::uuid$$;
 create function private.has_scope_access(uuid,uuid,uuid,uuid,text) returns boolean language sql stable as $$select auth.uid()='${u}'::uuid and current_setting('test.edit',true)<>'denied'$$;
 create function private.can_view_billing_financials(uuid,uuid) returns boolean language sql stable as $$select auth.uid()='${u}'::uuid and current_setting('test.financial',true)<>'denied'$$;
 grant usage on schema public,private,auth to authenticated;
 create table public.clients(id uuid primary key,firm_id uuid not null,display_name text,unique(firm_id,id));
 create table public.billing_entities(id uuid primary key,firm_id uuid not null,name text,unique(firm_id,id));
 create table public.work_entries(id uuid primary key,firm_id uuid,client_id uuid,billing_entity_id uuid,matter_id uuid,currency text default 'EUR',effective_amount numeric(14,2),work_date date,activity_description text,duration_minutes integer,billing_scope text default 'standard',is_billable boolean default true,is_paid boolean default false,is_invoiced boolean default false,status text default 'draft');
 grant select on public.clients,public.billing_entities,public.work_entries to authenticated;
 insert into public.clients values('${client}','${firm}','Cliente Sintético');insert into public.billing_entities values('${society}','${firm}','Sociedade Sintética');
 insert into public.work_entries(id,firm_id,client_id,billing_entity_id,effective_amount,work_date,activity_description,duration_minutes) values('${work}','${firm}','${client}','${society}',100,'2026-01-01','Análise sintética',60);
 select set_config('test.user','${u}',false),set_config('test.edit','allowed',false),set_config('test.financial','allowed',false);`)
await db.exec(await readFile('supabase/migrations/20260902180905_add_client_credit_ledger.sql','utf8'))
await db.exec('set role authenticated')
const scalar=async(sql,args=[])=>Object.values((await db.query(sql,args)).rows[0])[0]
const uuid=()=>crypto.randomUUID()
let tests=0
async function rejects(sql,args,pattern){await assert.rejects(()=>db.query(sql,args),pattern);tests++}
const paymentSql='select public.record_client_credit_payment($1,$2,$3,$4,current_date,$5,$6)'
const paymentId=uuid(),paymentArgs=[client,society,'EUR',1000,'Saldo inicial',paymentId]
const payment=await scalar(paymentSql,paymentArgs);assert.equal(await scalar(paymentSql,paymentArgs),payment);tests++
await rejects(paymentSql,[client,society,'EUR',-1,'Inválido',uuid()],/montante positivo/)
await rejects(paymentSql,[client,society,'EUR',1.001,'Inválido',uuid()],/montante positivo/)
await rejects(paymentSql,[client,society,'EUR',1,'Inválido',paymentId],/dados diferentes/)
const account=(await scalar('select public.get_client_credit_accounts()'))[0];assert.equal(account.balance,1000);tests++
const issueSql='select public.issue_provision_honorarium_note($1,$2,$3,$4,$5,$6,$7)'
const noteRequest=uuid(),args=[account.id,[work],23,123,123,{},noteRequest]
const note=await scalar(issueSql,args);assert.equal(note.deducted,123);assert.equal(note.balance_after,877);assert.equal(note.remaining,0);assert.equal(note.items[0].activity_description,'Análise sintética');tests++
assert.equal((await scalar(issueSql,args)).id,note.id);tests++
assert.deepEqual((await scalar('select public.get_client_credit_accounts()'))[0].noted_work_ids,[work]);tests++
await rejects(issueSql,[account.id,[work],0,100,100,{},noteRequest],/dados diferentes/)
await rejects(issueSql,[...args.slice(0,6),uuid()],/já consta/)
await rejects('update public.client_credit_movements set amount=999',[],/permission denied/)
await rejects('delete from public.client_credit_movements',[],/permission denied/)
await db.exec('reset role');await rejects('update public.work_entries set effective_amount=200 where id=$1',[work],/Estorne a nota/);await db.exec('set role authenticated')
await rejects('select public.reverse_client_credit($1,$2,$3)',[payment,'Pagamento incorrecto',uuid()],/saldo não pode/)
const detail=await scalar('select public.get_client_credit_detail($1)',[account.id]);assert.equal(detail.movements.length,2);assert.equal(detail.movements[1].note.id,note.id);tests++
await scalar('select public.reverse_client_credit($1,$2,$3)',[detail.movements[1].id,'Nota anulada',uuid()]);assert.equal((await scalar('select public.get_client_credit_accounts()'))[0].balance,1000);tests++
await db.exec('reset role');await db.query('update public.work_entries set effective_amount=1000 where id=$1',[work]);await db.exec('set role authenticated')
await rejects(issueSql,[account.id,[work],23,1230,999,{},uuid()],/mudou/)
const partial=await scalar(issueSql,[account.id,[work],23,1230,1000,{},uuid()]);assert.equal(partial.deducted,1000);assert.equal(partial.remaining,230);assert.equal(partial.balance_after,0);tests++
await scalar("select set_config('test.financial','denied',false)");assert.equal((await scalar('select public.get_client_credit_accounts()')).length,0);tests++
await rejects('select public.get_client_credit_detail($1)',[account.id],/sem permissão/)
await rejects(paymentSql,[client,society,'EUR',1,'Recusado',uuid()],/Sem permissão/)
await scalar("select set_config('test.financial','allowed',false)");await scalar("select set_config('test.user','00000000-0000-4000-8000-000000000099',false)")
assert.equal((await scalar('select public.get_client_credit_accounts()')).length,0);tests++
await rejects(issueSql,[account.id,[work],23,1230,1,{},uuid()],/Sem permissão/)
await db.exec('reset role;set role anon');await rejects('select public.get_client_credit_accounts()',[],/permission denied/)
console.log(`${tests} assertions passed: local PostgreSQL, balances, VAT, partial deduction, retries, duplicate notes, snapshots, reversals and access controls.`)
await db.close()
