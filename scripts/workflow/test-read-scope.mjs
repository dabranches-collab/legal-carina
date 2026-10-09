import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {PGlite} from '@electric-sql/pglite'
const db=new PGlite(),id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`
const sql=s=>db.exec(s),checks=[]
async function check(label,run){await run();checks.push(label);console.log('PASS '+label)}
try{
 await sql(`create role anon;create role authenticated;grant usage on schema public to authenticated;
 create table clients(id uuid,firm_id uuid,client_type text,primary_billing_entity_id uuid);
 create table client_profiles(id uuid,client_id uuid,client_type text,active boolean);
 create table work_entries(id uuid,client_id uuid,professional_id uuid,billing_entity_id uuid,status text,client_profile_id uuid);
 create table client_retainers(client_id uuid,billing_entity_id uuid,active boolean);
 create table client_credit_accounts(id uuid,client_id uuid,billing_entity_id uuid);
 create table retainer_charges(id uuid,client_id uuid,billing_entity_id uuid);
 create table honorarium_document_versions(document_id uuid,credit_note_id uuid,billing_entity_id uuid,revision integer);
 create table provision_honorarium_notes(id uuid,account_id uuid);
 create table fixture_items(payload jsonb);
 create table fixture_accounts(payload jsonb);
 create table fixture_retainers(client_id uuid,client_name text,pending_amount numeric);
 insert into clients values('${id(20)}','${id(1)}','mixed','${id(2)}'),('${id(21)}','${id(1)}','company','${id(3)}'),('${id(22)}','${id(99)}','individual','${id(2)}');
 insert into client_profiles values('${id(30)}','${id(20)}','individual',true),('${id(31)}','${id(20)}','company',true),('${id(32)}','${id(21)}','company',true);
 insert into work_entries values('${id(40)}','${id(20)}','${id(10)}','${id(2)}','active','${id(30)}'),('${id(41)}','${id(20)}','${id(11)}','${id(3)}','active','${id(31)}'),('${id(42)}','${id(21)}','${id(11)}','${id(3)}','active','${id(32)}'),('${id(43)}','${id(21)}','${id(10)}','${id(2)}','cancelled','${id(32)}');
 insert into client_credit_accounts values('${id(50)}','${id(20)}','${id(2)}'),('${id(51)}','${id(20)}','${id(3)}');
 insert into client_retainers values('${id(20)}','${id(2)}',true),('${id(20)}','${id(3)}',true);
 insert into retainer_charges values('${id(60)}','${id(20)}','${id(2)}');
 insert into honorarium_document_versions values('${id(70)}',null,'${id(3)}',1),('${id(70)}',null,'${id(2)}',2);
 insert into provision_honorarium_notes values('${id(71)}','${id(50)}');
 insert into fixture_retainers values('${id(20)}','Mixed',1234.56),('${id(21)}','Company',456.78);
 alter table clients enable row level security;create policy fixture_firm on clients to authenticated using(firm_id='${id(1)}');
 grant select on all tables in schema public to authenticated;
 create function get_payment_queue()returns jsonb language sql security invoker as $$select coalesce(jsonb_agg(payload),'[]')from public.fixture_items i where exists(select 1 from public.clients c where c.id=(i.payload->>'client_id')::uuid)$$;
 create function get_client_credit_accounts()returns jsonb language sql security invoker as $$select coalesce(jsonb_agg(payload),'[]')from public.fixture_accounts$$;
 create function get_retainer_management()returns setof public.fixture_retainers language sql security invoker as $$select * from public.fixture_retainers$$;`)
 const items=[
  {id:id(40),client_id:id(20),category:'work',remaining:150.12,total:200.12,received:30,deducted:20,token:'unchanged-work',can_pay:true},
  {id:id(41),client_id:id(20),category:'unbilled',remaining:null,total:null,token:'masked',can_pay:false},
  {id:id(42),client_id:id(21),category:'work',remaining:100,token:'other-client'},
  {id:id(60),client_id:id(20),category:'retainer',remaining:1234.56,token:'retainer'},
  {id:id(70),client_id:id(20),category:'note',remaining:999.99,total:1500,received:200,deducted:300.01,token:'revision-2',revision:2},
  {id:id(71),client_id:id(20),category:'note',remaining:75.25,token:'legacy-note'},
 ]
 for(const item of items)await db.query('insert into fixture_items values($1)',[JSON.stringify(item)])
 const accounts=[{id:id(50),client_id:id(20),billing_entity_id:id(2),balance:987.65,received:1200,consumed:212.35},{id:id(51),client_id:id(20),billing_entity_id:id(3),balance:200}]
 for(const a of accounts)await db.query('insert into fixture_accounts values($1)',[JSON.stringify(a)])
 const snapshot=JSON.stringify((await db.query('select payload from fixture_items order by payload::text')).rows)
 await sql(await readFile(new URL('../../docs/workflow/sql/workflow_read_scope.sql',import.meta.url),'utf8'))
 await sql('set role authenticated')
 const read=async(name,society=null,professional=null,type=null)=>(await db.query(`select public.${name}($1,$2,$3) result`,[society,professional,type])).rows[0].result
 await check('RLS excludes the other firm even with no scope',async()=>assert.deepEqual(await read('get_workflow_client_ids'),[id(20),id(21)]))
 await check('mixed belongs to both inclusive client categories',async()=>{assert.deepEqual(await read('get_workflow_client_ids',null,null,'individual'),[id(20)]);assert.deepEqual(await read('get_workflow_client_ids',null,null,'company'),[id(20),id(21)]);assert.deepEqual(await read('get_workflow_client_ids',null,null,'mixed'),[id(20)])})
 await check('cancelled work does not add a client to a professional portfolio',async()=>assert.deepEqual(await read('get_workflow_client_ids',null,id(10)),[id(20)]))
 await check('empty intersection returns no clients',async()=>assert.deepEqual(await read('get_workflow_client_ids',id(98),id(10),'individual'),[]))
 await check('payments intersect real society and professional IDs',async()=>assert.deepEqual((await read('get_workflow_payment_queue',id(2),id(10),'individual')).map(x=>x.id).sort(),[id(40),id(60),id(70),id(71)].sort()))
 await check('mixed client company filter selects company work but whole client notes',async()=>{const rows=await read('get_workflow_payment_queue',null,null,'company');assert.ok(!rows.some(x=>x.id===id(40)));assert.ok(rows.some(x=>x.id===id(41)));assert.ok(rows.some(x=>x.id===id(70)));})
 await check('payment filtering preserves amounts, tokens, permissions and revision',async()=>{const filtered=await read('get_workflow_payment_queue',id(2),id(10));for(const row of filtered)assert.deepEqual(row,items.find(x=>x.id===row.id))})
 await check('queue retains the original relative order after filtering',async()=>{const filtered=await read('get_workflow_payment_queue',id(2),id(10));const ids=new Set(filtered.map(x=>x.id));assert.deepEqual(filtered.map(x=>x.id),items.filter(x=>ids.has(x.id)).map(x=>x.id))})
 await check('masked amount remains NULL rather than zero',async()=>assert.equal((await read('get_workflow_payment_queue',id(3),id(11))).find(x=>x.id===id(41)).remaining,null))
 await check('latest note revision determines society; legacy note keeps its account society',async()=>assert.ok(!(await read('get_workflow_payment_queue',id(3))).some(x=>x.id===id(70)||x.id===id(71))))
 await check('credit scope keeps the whole ledger balance for the selected account',async()=>assert.deepEqual(await read('get_workflow_client_credit_accounts',id(2),id(10)),[accounts[0]]))
 await check('contracts keep the full client aggregate, including more than one society',async()=>{const rows=await read('get_workflow_retainer_management',id(2),id(10));assert.equal(rows.length,1);assert.equal(Number(rows[0].pending_amount),1234.56)})
 await check('new read contracts use invoker rights',async()=>{const rows=(await db.query("select prosecdef from pg_proc where proname like 'get_workflow_%'")).rows;assert.equal(rows.length,4);assert.ok(rows.every(x=>x.prosecdef===false))})
 await sql('reset role;set role anon')
 await check('anonymous role cannot execute scope RPC',async()=>assert.rejects(read('get_workflow_client_ids'),/permission denied/))
 await sql('reset role')
 await check('scope reads never alter source financial rows',async()=>assert.equal(JSON.stringify((await db.query('select payload from fixture_items order by payload::text')).rows),snapshot))
 // Actual dashboard bodies, with synthetic tables and controllable ACL helpers.
 await sql(`create schema private;create schema auth;
 alter table clients add display_name text default 'Synthetic',add client_code text default 'QA';
 alter table client_profiles add firm_id uuid default '${id(1)}';
 alter table work_entries add firm_id uuid default '${id(1)}',add matter_id uuid,add work_date date default '2026-09-01',add created_at timestamptz default now(),add duration_minutes integer default 60,add is_invoiced boolean default true,add is_paid boolean default false,add archive_status text,add has_manual_override boolean default false,add billing_scope text default 'standard',add effective_hourly_rate numeric default 100,add effective_amount numeric default 100,add activity_description text default 'Synthetic work';
 update work_entries set effective_amount=200,duration_minutes=120 where id='${id(40)}';
 update work_entries set effective_amount=400,duration_minutes=240 where id='${id(41)}';
 update work_entries set effective_amount=null,duration_minutes=0 where id='${id(43)}';
 insert into work_entries(id,client_id,professional_id,billing_entity_id,firm_id,status,effective_amount)values('${id(44)}','${id(22)}','${id(10)}','${id(2)}','${id(99)}','active',100000);
 create table professionals(id uuid,display_name text,firm_id uuid default '${id(1)}',active boolean default true);insert into professionals(id,display_name) values('${id(10)}','Pro A'),('${id(11)}','Pro B');insert into professionals(id,display_name,firm_id)values('${id(12)}','Other firm professional','${id(99)}');
 create table billing_entities(id uuid,name text);insert into billing_entities values('${id(2)}','Society A'),('${id(3)}','Society B');
 create table imports(firm_id uuid,invalid_rows integer);insert into imports values('${id(1)}',7),('${id(99)}',9);
 create table firm_members(firm_id uuid,user_id uuid,role text,active boolean);insert into firm_members values('${id(1)}','${id(90)}','owner',true);
 create table billing_entity_financial_permissions(firm_id uuid,user_id uuid,billing_entity_id uuid,can_view_financials boolean);
 create function auth.uid()returns uuid language sql as $$select '${id(90)}'::uuid$$;
 create function private.has_completed_pin_setup(uuid)returns boolean language sql as $$select coalesce(current_setting('test.pin',true),'ready')<>'blocked'$$;
 create function private.has_scope_access(uuid,uuid,uuid,uuid,text)returns boolean language sql as $$select $1='${id(1)}'::uuid and coalesce(current_setting('test.scope',true),'allowed')<>'denied' and private.has_completed_pin_setup(auth.uid())$$;
 create function private.can_view_billing_financials(uuid,uuid)returns boolean language sql as $$select $1='${id(1)}'::uuid and coalesce(current_setting('test.financial',true),'allowed')<>'denied'$$;
 create function private.visible_financial_value(uuid,uuid,numeric)returns numeric language sql as $$select case when private.can_view_billing_financials($1,$2)then $3 end$$;
 create function private.is_firm_member(uuid)returns boolean language sql as $$select $1='${id(1)}'::uuid and private.has_completed_pin_setup(auth.uid())$$;`)
 for(const [file,names] of [
  ['20260818233000_align_entity_attention_with_drilldowns.sql',['get_professional_landing_summaries']],
  ['20260928141755_align_overview_missing_price_with_attention.sql',['get_dashboard_overview','get_dashboard_metric_breakdowns']],
  ['20260928153000_distinguish_unpriced_recent_movements.sql',['get_client_category_dashboard','get_entity_dashboard_rolling']],
 ]){
  const source=await readFile(new URL('../../supabase/migrations/'+file,import.meta.url),'utf8')
  for(const name of names){const body=source.match(new RegExp(`create or replace function public\\.${name}\\([\\s\\S]*?\\n\\$\\$;`,'i'))?.[0];assert.ok(body);await sql(body)}
 }
 await sql(await readFile(new URL('../../docs/workflow/sql/workflow_dashboard_scope.sql',import.meta.url),'utf8'))
 await sql('set role authenticated')
 const dashboard=async(name,args=[])=>(await db.query(`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) result`,args)).rows[0].result
 await check('unscoped dashboard proposal exactly matches original totals and series',async()=>{
  assert.deepEqual(await dashboard('get_workflow_dashboard_overview',[null,null,null]),await dashboard('get_dashboard_overview'))
  const scoped=await dashboard('get_workflow_dashboard_metric_breakdowns',[null,null,null]);assert.deepEqual(scoped.map(({billingEntityId:_billingEntityId,...row})=>row),await dashboard('get_dashboard_metric_breakdowns'))
 })
 await check('overview and society subtotals intersect all work dimensions',async()=>{
  const args=[id(2),id(10),'individual'],overview=await dashboard('get_workflow_dashboard_overview',args),breakdowns=await dashboard('get_workflow_dashboard_metric_breakdowns',args)
  assert.equal(overview.metrics.worked,200);assert.equal(overview.metrics.minutes,120);assert.equal(overview.metrics.activeClients,1)
  assert.equal(overview.annual[0].value,200);assert.equal(overview.byProfessional[0].label,'Pro A');assert.equal(breakdowns.length,1);assert.equal(breakdowns[0].worked,200)
 })
 await check('mixed category intersects with company profile without duplication',async()=>{
  const result=await dashboard('get_workflow_client_category_dashboard',['mixed',null,null,'company'])
  assert.equal(result.metrics.total,400);assert.equal(result.metrics.movements,1)
 })
 await check('entity selection and shared scope intersect, including automatic choice',async()=>{
  const result=await dashboard('get_workflow_entity_dashboard_rolling',['billing',id(3),id(3),id(11),'company'])
  assert.equal(result.metrics.total,500);assert.equal(result.metrics.movements,2);assert.equal(result.annual[0].value,500)
  const selected=await dashboard('get_workflow_entity_dashboard_rolling',['professional',null,id(3),id(11),'company'])
  assert.equal(selected.selectedId,id(11));assert.equal(selected.options.length,1)
 })
 await check('scoped dashboard cannot broaden the authorized firm',async()=>{
  const result=await dashboard('get_workflow_dashboard_overview',[null,id(10),'individual'])
  assert.equal(result.metrics.worked,200);assert.ok(result.metrics.worked<100000)
 })
 await check('financial masking stays NULL in scoped overview and breakdowns',async()=>{
  await db.query("select set_config('test.financial','denied',false)")
  const result=await dashboard('get_workflow_dashboard_overview',[id(2),id(10),'individual'])
  assert.equal(result.metrics.worked,null);assert.equal(result.metrics.averageRate,null)
  assert.equal((await dashboard('get_workflow_dashboard_metric_breakdowns',[id(2),id(10),'individual']))[0].worked,null)
  await db.query("select set_config('test.financial','allowed',false)")
 })
 await check('professional landing retains masking and excludes names outside the authorized firm',async()=>{
  await db.query("select set_config('test.financial','denied',false)")
  const rows=(await db.query('select * from get_workflow_professional_landing_summaries($1,$2,$3)',[id(2),id(10),'individual'])).rows
  assert.equal(rows.length,1);assert.equal(rows[0].name,'Pro A');assert.equal(rows[0].total,null)
  await db.query("select set_config('test.financial','allowed',false)")
 })
 await check('society subtotals do not duplicate money when labels are identical',async()=>{
  await sql("reset role;update billing_entities set name='Same label';set role authenticated")
  const rows=await dashboard('get_workflow_dashboard_metric_breakdowns',[null,id(11),'company'])
  assert.equal(rows.length,1);assert.equal(rows[0].billingEntityId,id(3));assert.equal(rows[0].worked,500)
  await sql(`reset role;insert into work_entries(id,client_id,professional_id,billing_entity_id,client_profile_id,status,effective_amount)values('${id(45)}','${id(20)}','${id(11)}','${id(2)}','${id(31)}','active',25);set role authenticated`)
  const both=await dashboard('get_workflow_dashboard_metric_breakdowns',[null,id(11),'company'])
  assert.equal(both.length,2);assert.equal(both.reduce((sum,row)=>sum+row.worked,0),525);assert.equal(new Set(both.map(row=>row.billingEntityId)).size,2)
 })
 await sql("reset role;update firm_members set role='viewer';set role authenticated")
 await check('entity viewer cannot acquire financial access through scope',async()=>{
  const result=await dashboard('get_workflow_entity_dashboard_rolling',['billing',id(2),id(2),id(10),'individual'])
  assert.equal(result.metrics.total,null);assert.equal(result.recent[0].effective_amount,null)
 })
 await check('PIN and scope denial are preserved by actual entity dashboard body',async()=>{
  await db.query("select set_config('test.pin','blocked',false)")
  await assert.rejects(dashboard('get_workflow_entity_dashboard_rolling',['billing',id(2),null,null,null]),/not authorized/)
  await db.query("select set_config('test.pin','ready',false)")
  await db.query("select set_config('test.scope','denied',false)")
  assert.equal((await dashboard('get_workflow_entity_dashboard_rolling',['billing',id(2),null,null,null])).metrics.movements,0)
 })
 await sql('reset role;set role anon')
 await check('anonymous role cannot call scoped dashboard definers',async()=>assert.rejects(dashboard('get_workflow_dashboard_overview',[null,null,null]),/permission denied/))
 await sql('reset role')
 await check('scoped dashboard reads leave payment source rows unchanged',async()=>assert.equal(JSON.stringify((await db.query('select payload from fixture_items order by payload::text')).rows),snapshot))
 console.log(`${checks.length} scope SQL checks passed. Synthetic RLS; not full production schema or real Auth.`)
}finally{await db.close()}
