import {readFile} from 'node:fs/promises'
import {pathToFileURL} from 'node:url'
import assert from 'node:assert/strict'
const {PGlite}=await import(process.argv[2]?pathToFileURL(process.argv[2]).href:new URL('../.tmp/provision-db/package/dist/index.js',import.meta.url).href)
const db=new PGlite(),id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0')
const [u,firm,soc,client,pro,legacy]=[1,2,3,4,5,6].map(id)
await db.exec(`create role anon;create role authenticated;create schema auth;create schema private;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.user',true),'')::uuid$$;
create function private.has_scope_access(uuid,uuid,uuid,uuid,text) returns boolean language sql stable as $$select auth.uid()='${u}' and current_setting('test.scope',true)<>'denied'$$;
create function private.can_view_billing_financials(uuid,uuid) returns boolean language sql stable as $$select current_setting('test.financial',true)<>'denied'$$;
create table public.clients(id uuid primary key,firm_id uuid,display_name text);
create table public.professionals(id uuid primary key,firm_id uuid,display_name text);
create table public.billing_entities(id uuid primary key,firm_id uuid,name text);
create table public.work_entries(id uuid primary key default gen_random_uuid(),firm_id uuid,client_id uuid,billing_entity_id uuid,matter_id uuid,professional_id uuid,activity_description text,work_date date,duration_minutes int,effective_amount numeric,currency text default 'EUR',billing_scope text default 'standard',is_billable boolean default true,is_paid boolean default false,status text default 'approved');
insert into public.clients values('${client}','${firm}','Cliente Sintético');insert into public.professionals values('${pro}','${firm}','Carina');insert into public.billing_entities values('${soc}','${firm}','LEGALTEAM');
insert into public.work_entries(id,firm_id,client_id,billing_entity_id,professional_id,work_date,duration_minutes,effective_amount) values('${legacy}','${firm}','${client}','${soc}','${pro}','2026-01-01',60,100);
create function public.create_work_entry_with_treatment(date,uuid,uuid,uuid,uuid,text,integer,text,numeric,text,jsonb,text,date) returns jsonb language plpgsql security definer as $$declare result uuid;begin insert into public.work_entries(firm_id,client_id,billing_entity_id,professional_id,work_date,activity_description,duration_minutes,effective_amount) values('${firm}', $2,$5,$4,$1,$6,$7,100) returning id into result;return jsonb_build_object('workEntryId',result,'expenses','[]'::jsonb);end;$$;
create function public.update_work_entry_full(uuid,jsonb,text) returns void language sql as $$update public.work_entries set activity_description=$2->>'activity_description' where id=$1$$;
select set_config('test.user','${u}',false),set_config('test.scope','allowed',false),set_config('test.financial','allowed',false);`)
await db.exec(await readFile('supabase/migrations/20260902235343_add_legalteam_allocation.sql','utf8'))
await db.exec(await readFile('supabase/migrations/20260903033000_expand_allocation_read_page.sql','utf8'))
await db.exec(`create table public.law_firms(id uuid primary key);insert into law_firms values('${firm}');
create function private.has_firm_role(uuid,text[]) returns boolean language sql stable as $$select auth.uid()='${u}'$$;
grant select on public.clients to authenticated;`)
await db.exec(await readFile('supabase/migrations/20260903034500_add_client_referrer_directory.sql','utf8'))
let passed=0
const scalar=async(sql,args=[])=>Object.values((await db.query(sql,args)).rows[0])[0]
const rejects=async(sql,args,pattern)=>{await assert.rejects(()=>db.query(sql,args),pattern);passed++}
assert.equal(await scalar('select task_referrer from work_entries where id=$1',[legacy]),null);passed++
await db.query('update work_entries set activity_description=$1 where id=$2',['Legacy edit',legacy]);passed++
await db.exec('begin');await db.query('insert into work_entries(firm_id,client_id,billing_entity_id) values($1,$2,$3)',[firm,client,soc]);await db.exec('rollback');passed++
await rejects('update work_entries set task_referrer_other=$1 where id=$2',['Incomplete',legacy],/check constraint/)
await db.exec('set role authenticated')
const create='select public.create_work_entry_with_allocation($1,$2,null,$3,$4,$5,60,p_task_referrer=>$6,p_task_referrer_other=>$7)'
const args=['2026-01-02',client,pro,soc,'Actividade sintética','carina',null]
const created=await scalar(create,args);assert.ok(created.workEntryId);passed++
await rejects(create,[...args.slice(0,5),null,null],/angariador/)
await rejects(create,[...args.slice(0,5),'other',' '],/check constraint/)
await rejects(create,[...args.slice(0,5),'invalid',null],/check constraint/)
const other=await scalar(create,[...args.slice(0,5),'other','Parceiro Sintético']);assert.ok(other.workEntryId);passed++
const report='select public.get_legalteam_allocation_work($1,$2,$3,$4,$5)'
let result=await scalar(report,[soc,'2026-01-01','2026-01-02',0,1]);assert.equal(result.total,3);assert.equal(result.items.length,1);passed++
result=await scalar(report,[soc,'2026-01-02','2026-01-02',1,500]);assert.equal(result.total,2);assert.equal(result.items.length,1);passed++
result=await scalar(report,[soc,null,null,0,500]);assert.equal(result.total,3);assert.ok(result.items.every(row=>row.client_id===client));passed++
result=await scalar(report,[soc,null,null,0,5000]);assert.equal(result.total,3);assert.equal(result.items.length,3);passed++
await rejects(report,[soc,null,null,0,5001],/inválidos/)
await rejects(report,[soc,null,'2026-01-02',0,500],/inválidos/)
await rejects(report,[soc,'2026-02-01','2026-01-01',0,500],/inválidos/)
const update='select public.update_work_entry_with_allocation($1,$2,$3)'
await rejects(update,[legacy,{billing_entity_id:soc,task_referrer:null},''],/angariador/)
await scalar(update,[legacy,{billing_entity_id:soc,task_referrer:'hugo',activity_description:'Revisão'},'']);passed++
await scalar("select set_config('test.financial','denied',false)");await rejects(report,[soc,'2026-01-01','2026-01-02',0,500],/permissão/)
await scalar("select set_config('test.financial','allowed',false)");await scalar("select set_config('test.scope','denied',false)");await rejects(report,[soc,'2026-01-01','2026-01-02',0,500],/permissão/);await rejects(update,[legacy,{billing_entity_id:soc,task_referrer:'carina'},''],/authorized/)
await rejects(create,args,/authorized/)
await db.exec('reset role;set role anon');await rejects(report,[soc,'2026-01-01','2026-01-02',0,500],/permission denied/)
await db.exec('reset role');assert.equal(await scalar('select count(*)::int from work_entries'),3);passed++
await db.exec(`update clients set client_referrer='other',client_referrer_other='  Parceiro   Sintético  ',primary_billing_entity_id='${soc}' where id='${client}'`)
assert.equal(await scalar('select name from client_referrers'),'Parceiro Sintético');passed++
assert.ok(await scalar('select client_referrer_id from clients'));passed++
await db.exec(`update clients set client_referrer_other='parceiro sintético' where id='${client}'`)
assert.equal(await scalar('select count(*)::int from client_referrers'),1);passed++
await rejects(`update clients set client_referrer_other='' where id='${client}'`,[],/nome do angariador/)
await scalar("select set_config('test.scope','allowed',false)");
const named=await scalar(report,[soc,null,null,0,5000]);assert.equal(named.items[0].client_referrer_other,'Parceiro Sintético');passed++
console.log(passed+' PostgreSQL assertions passed: validation, atomic rollback, historical gaps, pagination, period boundaries and access controls.');await db.close()
