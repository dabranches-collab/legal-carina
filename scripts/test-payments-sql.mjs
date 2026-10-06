import fs from 'node:fs'
import assert from 'node:assert/strict'
import {PGlite} from '@electric-sql/pglite'
import {fileURLToPath} from 'node:url'
const root=fileURLToPath(new URL('../',import.meta.url))
const db=new PGlite()
const sql=s=>db.exec(s)
const one=async(s,p=[])=> (await db.query(s,p)).rows[0]
let checks=0
async function check(label,fn){await fn();checks++;console.log('PASS '+label)}
const uid=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0')
const firm=uid(1),client=uid(2),society=uid(3),user=uid(4),note=uid(10),work=uid(20),legacy=uid(11)
await sql(`create schema auth; create schema private; create role anon; create role authenticated;
 create table auth.users(id uuid primary key); insert into auth.users values('${user}');
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
 select set_config('test.uid','${user}',false);
 create table public.law_firms(id uuid primary key);
 create table public.clients(id uuid primary key,firm_id uuid,display_name text,unique(firm_id,id));
 create table public.billing_entities(id uuid primary key,firm_id uuid,name text,unique(firm_id,id));
 insert into law_firms values('${firm}');insert into clients values('${client}','${firm}','Cliente sintético');insert into billing_entities values('${society}','${firm}','Sociedade sintética');
 create table public.work_entries(id uuid primary key,firm_id uuid,client_id uuid,billing_entity_id uuid,matter_id uuid,currency text default 'EUR',effective_amount numeric default 100,
 work_date date default '2026-10-01',activity_description text default 'Trabalho sintético',billing_scope text default 'standard',is_billable boolean default true,is_invoiced boolean default false,is_paid boolean default false,invoice_date date,status text default 'approved');
 create table public.client_credit_accounts(id uuid primary key,firm_id uuid,client_id uuid,billing_entity_id uuid,currency text default 'EUR');
 create table public.client_credit_movements(id uuid primary key default gen_random_uuid(),account_id uuid,note_id uuid,kind text,reverses_id uuid,amount numeric);
 create table public.provision_honorarium_notes(id uuid primary key,account_id uuid,number text,issued_at timestamptz default now(),created_by uuid,subtotal numeric,vat_rate numeric,vat numeric,total numeric,deducted numeric,remaining numeric,balance_after numeric,items jsonb,document_options jsonb default '{}',request_id uuid default gen_random_uuid());
 create table public.fixed_fee_jobs(id uuid primary key,firm_id uuid,client_id uuid,billing_entity_id uuid,agreed_amount numeric,vat_rate numeric,currency text default 'EUR',is_invoiced boolean default false,invoice_date date,is_paid boolean default false,status text default 'open',updated_at timestamptz);
 create table public.fixed_fee_provision_applications(job_id uuid,gross_amount numeric,consumption_id uuid);
 create table public.retainer_charges(id uuid primary key,firm_id uuid,client_id uuid,billing_entity_id uuid,period_start date default '2026-10-01',amount numeric,currency text default 'EUR',status text default 'pending',invoice_date date,paid_on date,updated_at timestamptz,invoice_reference text,due_on date,notes text);
 create table public.audit_log(id uuid default gen_random_uuid(),firm_id uuid,actor_user_id uuid,action text,entity_type text,entity_id uuid,previous_data jsonb,new_data jsonb);
 create function private.has_scope_access(uuid,uuid,uuid,uuid,text) returns boolean language sql stable as $$select auth.uid() is not null and coalesce(current_setting('test.deny',true),'')<>'1'$$;
 create function private.can_view_billing_financials(uuid,uuid) returns boolean language sql stable as $$select coalesce(current_setting('test.deny_financial',true),'')<>'1'$$;
 create function private.has_firm_role(uuid,text[]) returns boolean language sql stable as $$select coalesce(nullif(current_setting('test.role',true),''),'owner')=any($2)$$;
 -- Contract stub: the existing audited work RPC is separately covered by repository tests.
 create function public.update_work_entry_inline_audited(p_work_entry_id uuid,p_field text,p_value text,p_reason text) returns void language sql as $$update public.work_entries set is_paid=p_value::boolean,status='paid' where id=p_work_entry_id$$;`)
const original=fs.readFileSync(root+'supabase/migrations/20260903140910_add_revisable_honorarium_documents.sql','utf8')
await sql(original.match(/create table public.honorarium_document_versions \([\s\S]*?\n\);/)[0])
await sql('alter table public.honorarium_document_versions add column fixed_fee_job_id uuid;')
await sql(original.match(/create function public.get_client_honorarium_documents[\s\S]*?\$function\$;/)[0])
const core=fs.readFileSync(root+'supabase/migrations/20260805113851_create_legal_carina_data_model.sql','utf8')
await sql(core.match(/create or replace function private.audit_business_change\(\)[\s\S]*?\$\$;/)[0])
await sql(fs.readFileSync(root+'supabase/migrations/20261006114804_add_payments_workspace.sql','utf8'))
const queue=async()=> (await one('select public.get_payment_queue() q')).q
const find=async id=>(await queue()).find(x=>x.id===id)
const pay=(i,amount,request=uid(100+checks))=>one('select public.record_pending_payment($1,$2,$3,$4,$5,$6,$7) r',[i.category,i.id,amount,'2026-10-06','Transferência sintética',i.token,request])
const insertNote=async(id,items,options={},extra='')=>sql(`insert into honorarium_document_versions(id,document_id,revision,number,firm_id,client_id,billing_entity_id,created_by,subtotal,vat_rate,vat,total,deducted,remaining,balance_after,currency,items,document_options,request_id,request_payload${extra?',fixed_fee_job_id':''}) values('${id}','${id}',1,'NH-TESTE','${firm}','${client}','${society}','${user}',100,23,23,123,20,93,0,'EUR','${JSON.stringify(items)}','${JSON.stringify(options)}',gen_random_uuid(),'{}'${extra?`, '${extra}'`:''});`)
await sql(`insert into work_entries(id,firm_id,client_id,billing_entity_id) values('${work}','${firm}','${client}','${society}');`)
await insertNote(note,[{id:work,activity_description:'Associado',effective_amount:100}],{direct_payment:{amount:10}})
await check('unbilled note work retains invoicing but not separate payment',async()=>{let w=await find(work);assert.equal(w.category,'unbilled');assert.equal(w.note_associated,true);assert.equal(w.can_pay,false);await sql(`update work_entries set is_invoiced=true,invoice_date='2026-10-01' where id='${work}';`);assert.equal(await find(work),undefined)})
await check('direct work payment and reassociation blocked for noted work',async()=>{await assert.rejects(sql(`update work_entries set is_paid=true where id='${work}'`),/nota vigente/);await assert.rejects(sql(`delete from work_entries where id='${work}'`),/nota vigente/)})
const initial=await find(note),req=uid(500)
await check('partial receipt preserves provision, number and revision',async()=>{await pay(initial,20,req);const n=await one(`select revision,remaining,deducted,document_options from honorarium_document_versions where id='${note}'`);assert.equal(n.revision,1);assert.equal(Number(n.remaining),73);assert.equal(Number(n.deducted),20);assert.equal(n.document_options.direct_payment.amount,30);assert.equal((await one('select count(*)::int n from client_credit_movements')).n,0)})
await check('lost response retry is idempotent',async()=>{assert.equal((await pay(initial,20,req)).r.replayed,true);assert.equal((await one('select count(*)::int n from pending_payment_receipts')).n,1);await assert.rejects(pay(initial,21,req),/Pedido já utilizado/)})
await check('stale balance and excess rejected atomically',async()=>{await assert.rejects(pay(initial,20,uid(501)),/saldo mudaram/);await assert.rejects(pay(await find(note),74,uid(502)),/saldo a liquidar/);assert.equal((await find(note)).remaining,73)})
await check('receipt audited with balance before',async()=>{const a=await one("select new_data from audit_log where entity_type='pending_payment_receipts'");assert.equal(a.new_data.balance_before,93);assert.equal(a.new_data.received_before,10)})
async function revision(options,revision=2,voided=false,items=[{id:work}]){return sql(`insert into honorarium_document_versions(id,document_id,revision,number,firm_id,client_id,billing_entity_id,created_by,subtotal,vat_rate,vat,total,deducted,remaining,balance_after,currency,items,document_options,request_id,request_payload,voided) values(gen_random_uuid(),'${note}',${revision},'NH-TESTE','${firm}','${client}','${society}','${user}',100,23,23,123,20,73,0,'EUR','${JSON.stringify(items)}','${JSON.stringify(options)}',gen_random_uuid(),'{}',${voided})`)}
await check('stale revision cannot discard a receipt',async()=>{await assert.rejects(revision({direct_payment:{amount:10}}),/novos recebimentos/)})
await check('paid note cannot be voided or lose items',async()=>{await assert.rejects(revision({payment_revision:1,direct_payment:{amount:30}},2,true),/recebimentos/);await assert.rejects(revision({payment_revision:1,direct_payment:{amount:30}},2,false,[]),/recebimentos/)})
await check('current revision preserves received total, counts once',async()=>{await revision({payment_revision:1,direct_payment:{amount:30}});assert.equal((await queue()).filter(x=>x.id===note).length,1);assert.equal((await find(note)).revision,2)})
await check('full settlement clears queue without invoice side effect',async()=>{await pay(await find(note),73,uid(503));assert.equal(await find(note),undefined);assert.equal((await one(`select is_paid from work_entries where id='${work}'`)).is_paid,false);assert.equal((await one('select count(*)::int n from honorarium_document_versions')).n,2)})
await check('legacy provision note partial and reversal protection',async()=>{await sql(`insert into client_credit_accounts values('${uid(30)}','${firm}','${client}','${society}','EUR');insert into provision_honorarium_notes(id,account_id,number,created_by,total,deducted,remaining,items) values('${legacy}','${uid(30)}','NH-LEGACY','${user}',100,30,70,'[]');insert into client_credit_movements(id,account_id,note_id,kind,amount) values('${uid(31)}','${uid(30)}','${legacy}','consumption',-30);`);await pay(await find(legacy),20,uid(504));assert.equal((await find(legacy)).remaining,50);await assert.rejects(sql(`insert into client_credit_movements(kind,reverses_id) values('reversal','${uid(31)}')`),/recebimentos/)})
await check('unbilled retainer cannot auto-invoice; partial rejected; total accepted',async()=>{await sql(`insert into retainer_charges(id,firm_id,client_id,billing_entity_id,amount) values('${uid(40)}','${firm}','${client}','${society}',100);`);let r=await find(uid(40));assert.equal(r.can_pay,false);await assert.rejects(pay(r,100,uid(505)),/pagamento indisponível/);await sql(`update retainer_charges set status='invoiced',invoice_date='2026-10-01' where id='${uid(40)}'`);r=await find(uid(40));await assert.rejects(pay(r,50,uid(506)),/saldo a liquidar/);await pay(r,100,uid(507));assert.equal(await find(uid(40)),undefined)})
await check('work receipt requires invoice evidence and preserves invoice',async()=>{await sql(`insert into work_entries(id,firm_id,client_id,billing_entity_id,is_invoiced) values('${uid(41)}','${firm}','${client}','${society}',true)`);let w=await find(uid(41));assert.equal(w.can_pay,false);await sql(`update work_entries set invoice_date='2026-10-02' where id='${uid(41)}'`);w=await find(uid(41));await pay(w,100,uid(508));assert.equal((await one(`select invoice_date::text d from work_entries where id='${uid(41)}'`)).d,'2026-10-02')})
await check('financial and scope denials return no payment data',async()=>{await sql("select set_config('test.deny_financial','1',false)");assert.equal((await queue()).length,0);await assert.rejects(pay(initial,20,req),/sem permissão/);await sql("select set_config('test.deny_financial','',false);select set_config('test.deny','1',false);select set_config('test.role','viewer',false)");assert.equal((await queue()).length,0);await sql("select set_config('test.deny','',false);select set_config('test.role','owner',false)")})
await check('API surface grants no direct receipt mutation or private helper execution',async()=>{assert.equal((await one("select has_table_privilege('authenticated','pending_payment_receipts','INSERT') p")).p,false);assert.equal((await one("select has_function_privilege('anon','public.record_pending_payment(text,uuid,numeric,date,text,text,uuid)','EXECUTE') p")).p,false);assert.equal((await one("select has_function_privilege('authenticated','private.payment_items()','EXECUTE') p")).p,false)})
await check('subsequent editors cannot undo audited work or retainer receipt',async()=>{await assert.rejects(sql(`update work_entries set is_paid=false where id='${uid(41)}'`),/recebimento auditado/);await assert.rejects(sql(`update retainer_charges set status='pending',paid_on=null,invoice_date=null where id='${uid(40)}'`),/recebimento auditado/)})
await check('explicit retainer invoicing requires date, detects stale data and never receives',async()=>{
 await sql(`insert into retainer_charges(id,firm_id,client_id,billing_entity_id,amount) values('${uid(42)}','${firm}','${client}','${society}',100)`)
 const r=await find(uid(42));const invoice=(date,token=r.token)=>one('select public.invoice_pending_retainer($1,$2,$3,$4,$5,$6)',[r.id,token,date,'FT-SINTETICA',null,null])
 await assert.rejects(invoice(null),/data/);await assert.rejects(invoice('2026-10-06','old'),/mudou/)
 await invoice('2026-10-06');const row=await one(`select status,paid_on from retainer_charges where id='${r.id}'`);assert.equal(row.status,'invoiced');assert.equal(row.paid_on,null)
 assert.equal((await one(`select count(*)::int n from audit_log where entity_type='retainer_charges' and entity_id='${r.id}'`)).n,1)
})
await check('duplicate current note associations rejected',async()=>{await assert.rejects(insertNote(uid(60),[{id:work}],{}),/outra nota vigente/)})
await check('fixed fee receipt respects role, invoice and existing provision, no reissue',async()=>{
 const job=uid(70),doc=uid(71)
 await sql(`insert into fixed_fee_jobs(id,firm_id,client_id,billing_entity_id,agreed_amount,vat_rate) values('${job}','${firm}','${client}','${society}',100,23);insert into fixed_fee_provision_applications values('${job}',20,'${uid(72)}');`)
 await insertNote(doc,[],{fixed_fee_payment:{provision:20,external:0}},job)
 assert.equal((await find(doc)).can_pay,false)
 await sql(`update fixed_fee_jobs set is_invoiced=true,invoice_date='2026-10-01' where id='${job}';select set_config('test.role','operator',false)`)
 assert.equal((await find(doc)).can_pay,false)
 await sql("select set_config('test.role','billing',false)")
 let i=await find(doc);assert.equal(i.remaining,103);assert.equal(i.can_pay,true)
 await assert.rejects(pay(i,50,uid(510)),/saldo a liquidar/)
 await pay(i,103,uid(511));assert.equal(await find(doc),undefined)
 assert.equal((await one(`select is_paid from fixed_fee_jobs where id='${job}'`)).is_paid,true)
 assert.equal((await one(`select revision from honorarium_document_versions where id='${doc}'`)).revision,1)
 await assert.rejects(sql(`update fixed_fee_jobs set is_paid=false where id='${job}'`),/recebimento auditado/)
 await assert.rejects(sql(`insert into client_credit_movements(kind,reverses_id) values('reversal','${uid(72)}')`),/recebimentos/)
 await sql("select set_config('test.role','owner',false)")
})

await check('receipt/audit failure rolls back settlement atomically',async()=>{
 const before=await find(legacy);
 await sql("create function private.test_fail_audit() returns trigger language plpgsql as $$begin raise exception 'synthetic audit failure';end;$$; create trigger z_test_fail_audit before insert on audit_log for each row execute function private.test_fail_audit();");
 await assert.rejects(pay(before,5,uid(800)),/synthetic audit failure/);
 assert.equal((await find(legacy)).remaining,before.remaining);
 assert.equal((await one("select count(*)::int n from pending_payment_receipts where request_id=$1",[uid(800)])).n,0);
 await sql('drop trigger z_test_fail_audit on audit_log; drop function private.test_fail_audit();');
});
// Replace permission stubs with the actual latest repository helpers and synthetic ACL rows.
await sql(`create table firm_members(firm_id uuid,user_id uuid,role text,active boolean);
 create table user_login_credentials(user_id uuid,must_change_pin boolean);
 create table access_grants(firm_id uuid,active boolean,valid_from timestamptz,valid_until timestamptz,permission text,principal_type text,user_id uuid,team_id uuid,resource_type text,billing_entity_id uuid,client_id uuid,matter_id uuid);
 create table team_members(team_id uuid,user_id uuid,firm_id uuid);
 create table billing_entity_financial_permissions(firm_id uuid,user_id uuid,billing_entity_id uuid,can_view_financials boolean);
 insert into firm_members values('${firm}','${user}','owner',true);
 insert into user_login_credentials values('${user}',false);
 grant usage on schema public,auth to authenticated;`);
async function realHelper(file,name){const source=fs.readFileSync(root+'supabase/migrations/'+file,'utf8');const match=source.match(new RegExp('create or replace function private\\.'+name+'\\([\\s\\S]*?\\$\\$;'));assert.ok(match,name);await sql(match[0]);}
// Drop stubs because PostgreSQL cannot rename their anonymous arguments with CREATE OR REPLACE.
await sql('drop function private.has_scope_access(uuid,uuid,uuid,uuid,text) cascade; drop function private.can_view_billing_financials(uuid,uuid) cascade; drop function private.has_firm_role(uuid,text[]) cascade;');
await realHelper('20260805113907_add_auth_terms_and_access_control.sql','permission_rank');
await realHelper('20260816132003_require_initial_pin_change.sql','has_completed_pin_setup');
await realHelper('20260816192000_align_auditor_and_security_policies.sql','has_firm_role');
await realHelper('20260819002500_allow_operator_all_work_management.sql','has_scope_access');
await realHelper('20260816110033_reconcile_username_pin_access.sql','can_view_billing_financials');
const authQueue=async()=>{await sql('set role authenticated');try{return await queue()}finally{await sql('reset role')}};
await check('actual ACL: owner sees queue, incomplete PIN and inactive membership see none',async()=>{
 assert.ok((await authQueue()).length>0);
 await sql('update user_login_credentials set must_change_pin=true');assert.equal((await authQueue()).length,0);
 await sql('update user_login_credentials set must_change_pin=false;update firm_members set active=false');assert.equal((await authQueue()).length,0);
 await sql('update firm_members set active=true');
});
await check('actual ACL: operator requires financial permission',async()=>{
 await sql("update firm_members set role='operator'");assert.equal((await authQueue()).length,0);
 await sql(`insert into billing_entity_financial_permissions values('${firm}','${user}','${society}',true)`);assert.ok((await authQueue()).length>0);
});
await check('actual ACL: viewer gets scoped read only; expired grants hide items',async()=>{
 await sql("update firm_members set role='viewer'");assert.equal((await authQueue()).length,0);
 await sql(`insert into access_grants values('${firm}',true,now()-interval '1 day',null,'view','user','${user}',null,'client',null,'${client}',null)`);
 const items=await authQueue();assert.ok(items.length>0);assert.ok(items.every(i=>!i.can_pay&&!i.can_edit));
 await sql("update access_grants set valid_until=now()-interval '1 minute'");assert.equal((await authQueue()).length,0);
 await sql('update access_grants set valid_until=null');
});
await check('actual ACL: unscoped foreign client hidden and receipt table denies direct read/write',async()=>{
 await sql(`insert into clients values('${uid(901)}','${firm}','Outra ficha');insert into work_entries(id,firm_id,client_id,billing_entity_id) values('${uid(902)}','${firm}','${uid(901)}','${society}')`);
 assert.ok(!(await authQueue()).some(i=>i.id===uid(902)));
 await sql('set role authenticated');try{
 await assert.rejects(sql('select * from pending_payment_receipts'),/permission denied/);
 await assert.rejects(sql('delete from pending_payment_receipts'),/permission denied/);
 await assert.rejects(pay(await find(legacy),1,uid(810)),/Sem permiss/);
 }finally{await sql('reset role')}
});
console.log(checks+' PostgreSQL contract checks passed. Real repository ACL helpers tested with synthetic ACL tables; core schema/work RPC still partial, not full Supabase or multi-connection concurrency validation.')
await db.close()
