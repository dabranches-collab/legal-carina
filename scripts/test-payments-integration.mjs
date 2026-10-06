import fs from 'node:fs';import {fileURLToPath} from 'node:url';import assert from 'node:assert/strict';import {spawnSync,spawn} from 'node:child_process';import {randomUUID} from 'node:crypto';
const container='carina-payments-qa-20261006',root=fileURLToPath(new URL('../',import.meta.url));
const inspection=spawnSync('docker',['inspect',container,'--format','{{index .Config.Labels "purpose"}}|{{.HostConfig.NetworkMode}}'],{encoding:'utf8'});
assert.equal(inspection.status,0,'Dedicated QA container is required');assert.equal(inspection.stdout.trim(),'carina-payments-local-validation|none','Refusing a non-QA or networked container');
const args=['exec','-i',container,'psql','-U','postgres','-d','postgres','-X','-Atq','-v','ON_ERROR_STOP=1'];
const actor=randomUUID(),firm=randomUUID(),client=randomUUID(),society=randomUUID(),profile=randomUUID(),professional=randomUUID();
const prefix=`set request.jwt.claim.sub='${actor}';set role authenticated;set statement_timeout='15s';`;
function query(s,auth=true){const r=spawnSync('docker',args,{input:(auth?prefix:'')+s,encoding:'utf8'});if(r.status)throw Error(r.stderr.trim());return r.stdout.trim();}
const json=s=>JSON.parse(query(s));
const qstr=s=>"'"+s.replaceAll("'","''")+"'";
let checks=0;async function check(label,fn){await fn();console.log('PASS '+label);checks++;}
query(`set request.jwt.claim.sub='${actor}';insert into auth.users(id,email)values('${actor}','${actor}@example.test');insert into law_firms(id,name)values('${firm}','Synthetic payment integration');insert into firm_members(firm_id,user_id,role)values('${firm}','${actor}','owner');insert into billing_entities(id,firm_id,name)values('${society}','${firm}','Synthetic society');insert into clients(id,firm_id,client_code,client_type,display_name)values('${client}','${firm}','QA-${client}','individual','Synthetic payment client');insert into client_profiles(id,firm_id,client_id,client_type,client_code)values('${profile}','${firm}','${client}','individual','QA-${client}');insert into professionals(id,firm_id,display_name)values('${professional}','${firm}','Synthetic professional');`,false);
const work=()=>json(`select create_work_entry_with_allocation(current_date,'${profile}',null,'${professional}','${society}','Synthetic payable work',60,null,100);`).workEntryId;
const queue=()=>json('select get_payment_queue();');const item=id=>queue().find(i=>i.id===id);
const paySql=(i,amount,key=randomUUID())=>`select record_pending_payment('${i.category}','${i.id}',${amount},current_date,'Synthetic transfer','${i.token}','${key}');`;
const issue=(w,provision=true)=>json(`select save_honorarium_document('${client}','${society}',array['${w}'::uuid],0,'{}',null,null,${provision},100,${provision?20:0},'${randomUUID()}');`);
query(`select record_client_credit_payment('${client}','${society}','EUR',20,current_date,'Synthetic provision','${randomUUID()}');`);
const w=work(),note=issue(w);let initial=item(note.document_id);
await check('real issuance + provision + unbilled association',()=>{assert.equal(initial.remaining,80);assert.equal(item(w).category,'unbilled');assert.equal(item(w).can_pay,false);});
await check('real work edit invoices without receiving; excludes duplicate debt',()=>{query(`select update_work_entry_inline_audited('${w}','invoice_date',current_date::text,'Synthetic invoice');select update_work_entry_inline_audited('${w}','is_invoiced','true','Synthetic invoice');`);assert.equal(item(w),undefined);});
const key=randomUUID();
await check('real partial receipt + replay without reissue/provision consumption',()=>{query(paySql(initial,10,key));assert.equal(item(note.document_id).remaining,70);assert.equal(json(paySql(initial,10,key)).replayed,true);assert.equal(query(`select count(*) from honorarium_document_versions where document_id='${note.document_id}';`),'1');});
function concurrent(sql,name){const p=spawn('docker',args,{stdio:['pipe','pipe','pipe']});let out='',err='';p.stdout.on('data',x=>out+=x);p.stderr.on('data',x=>err+=x);const result=new Promise(resolve=>p.on('close',code=>resolve({code,out,err})));p.stdin.end(prefix+`set application_name='${name}';`+sql);return result;}
async function withClientBarrier(first,second,lock=`select id from clients where id='${client}' for update;`){const p=spawn('docker',args,{stdio:['pipe','pipe','pipe']});let out='',err='';p.stderr.on('data',x=>err+=x);const ready=new Promise((resolve,reject)=>{p.stdout.on('data',x=>{out+=x;if(out.includes('LOCKED'))resolve();});p.on('error',reject);p.on('close',code=>{if(!out.includes('LOCKED'))reject(Error('Barrier failed '+code+' '+err));});});const finished=new Promise(resolve=>p.on('close',code=>resolve({code,out,err})));p.stdin.write(prefix+`begin;reset role;${lock}set role authenticated;select 'LOCKED';\n`);await ready;const name='payments-race-'+randomUUID();const other=concurrent(second,name);let blocked=false;for(let n=0;n<15;n++){blocked=query(`select exists(select 1 from pg_stat_activity where application_name='${name}' and wait_event_type='Lock');`,false)==='t';if(blocked)break;await new Promise(r=>setTimeout(r,30));}if(!blocked){p.stdin.end('rollback;');await finished;await other;throw Error('Competing connection did not reach database lock barrier');}p.stdin.end(first+'commit;\n');return [await finished,await other];}
await check('two connections same request => one receipt, replay on loser',async()=>{const i=item(note.document_id),k=randomUUID();const r=await withClientBarrier(paySql(i,10,k),paySql(i,10,k));assert.ok(r.every(x=>x.code===0),JSON.stringify(r));assert.equal(query(`select count(*) from pending_payment_receipts where request_id='${k}';`,false),'1');assert.equal(item(note.document_id).remaining,60);});
await check('two different requests stale token => exactly one commit',async()=>{const i=item(note.document_id);const r=await withClientBarrier(paySql(i,10),paySql(i,10));assert.equal(r.filter(x=>x.code===0).length,1,JSON.stringify(r));assert.match(r.find(x=>x.code!==0).err,/saldo mudaram/);assert.equal(item(note.document_id).remaining,50);});
await check('receipt versus stale revision rejects version without losing receipt',async()=>{const i=item(note.document_id);const options=query(`select document_options from honorarium_document_versions where document_id='${note.document_id}' order by revision desc limit 1;`);const revision=`select save_honorarium_document('${client}','${society}',array['${w}'::uuid],0,${qstr(options)},'${note.document_id}',1,true,100,20,'${randomUUID()}');`;const r=await withClientBarrier(paySql(i,10),revision);assert.equal(r[0].code,0,JSON.stringify(r));assert.notEqual(r[1].code,0);assert.match(r[1].err,/recebimentos/);assert.equal(item(note.document_id).remaining,40);});
await check('actual authenticated RLS denies ledger access and outsider queue',()=>{assert.throws(()=>query('select * from pending_payment_receipts;'),/permission denied/);const outsider=randomUUID();query(`insert into auth.users(id)values('${outsider}');`,false);assert.equal(query(`set request.jwt.claim.sub='${outsider}';select get_payment_queue();`),'[]');});
await check('void unpaid current note restores legitimate independent pending work',()=>{const other=work(),n=issue(other,false);query(`select update_work_entry_inline_audited('${other}','invoice_date',current_date::text,'Synthetic invoice');select update_work_entry_inline_audited('${other}','is_invoiced','true','Synthetic invoice');`);assert.equal(item(other),undefined);query(`select void_honorarium_document('${n.document_id}',1,'${randomUUID()}');`);assert.equal(item(other).category,'work');});
await check('receipt versus provision reversal commits receipt and rejects reversal',async()=>{
query(`select record_client_credit_payment('${client}','${society}','EUR',20,current_date,'Synthetic provision','${randomUUID()}');`);
const entry=work(),n=issue(entry),i=item(n.document_id);
const movement=query(`select id from client_credit_movements where note_id='${n.credit_note_id}' and kind='consumption';`);
const lock=`select id from client_credit_accounts where client_id='${client}' for update;`;
const r=await withClientBarrier(paySql(i,10),`select reverse_client_credit('${movement}','Synthetic reversal','${randomUUID()}');`,lock);
assert.equal(r[0].code,0,JSON.stringify(r));assert.notEqual(r[1].code,0);assert.match(r[1].err,/recebimentos/);assert.equal(item(n.document_id).remaining,70);
});
await check('provision reversal first invalidates concurrent stale receipt',async()=>{
query(`select record_client_credit_payment('${client}','${society}','EUR',20,current_date,'Synthetic provision','${randomUUID()}');`);
const entry=work(),n=issue(entry),i=item(n.document_id);
const movement=query(`select id from client_credit_movements where note_id='${n.credit_note_id}' and kind='consumption';`);
const lock=`select id from client_credit_accounts where client_id='${client}' for update;`;
const r=await withClientBarrier(`select reverse_client_credit('${movement}','Synthetic reversal','${randomUUID()}');`,paySql(i,10),lock);
assert.equal(r[0].code,0,JSON.stringify(r));assert.notEqual(r[1].code,0);assert.equal(item(n.document_id),undefined);assert.equal(item(entry).category,'unbilled');
});
await check('PIN, membership, financial visibility and real role matrix',()=>{
for(const role of ['admin','operator','billing','professional','viewer','auditor']){
const u=randomUUID();query(`set request.jwt.claim.sub='${actor}';insert into auth.users(id)values('${u}');insert into firm_members(firm_id,user_id,role)values('${firm}','${u}','${role}');`,false);
const read=()=>JSON.parse(query(`set request.jwt.claim.sub='${u}';select get_payment_queue();`));
if(role==='admin'){assert.ok(read().length>0);continue;}
assert.equal(read().length,0);
query(`set request.jwt.claim.sub='${actor}';insert into billing_entity_financial_permissions(firm_id,user_id,billing_entity_id,can_view_financials,created_by)values('${firm}','${u}','${society}',true,'${actor}');insert into access_grants(firm_id,principal_type,user_id,resource_type,client_id,permission,created_by)values('${firm}','user','${u}','client','${client}','view','${actor}');`,false);
const items=read();assert.ok(items.length>0);if(role!=='operator')assert.ok(items.every(i=>!i.can_pay&&!i.can_edit));
query(`set request.jwt.claim.sub='${actor}';insert into user_login_credentials(firm_id,user_id,username,auth_email,created_by,display_name,must_change_pin)values('${firm}','${u}','qa${u.slice(0,8)}','${u}@example.test','${actor}','Synthetic user',true);`,false);assert.equal(read().length,0);
query(`update user_login_credentials set must_change_pin=false where user_id='${u}';update firm_members set active=false where user_id='${u}';`,false);assert.equal(read().length,0);
}
});
await check('real audited individual payment is integral and cannot be undone silently',()=>{
const entry=work();query(`select update_work_entry_inline_audited('${entry}','invoice_date',current_date::text,'Synthetic invoice');select update_work_entry_inline_audited('${entry}','is_invoiced','true','Synthetic invoice');`);
const i=item(entry);assert.throws(()=>query(paySql(i,50)),/saldo a liquidar/);query(paySql(i,100));assert.equal(item(entry),undefined);assert.throws(()=>query(`select update_work_entry_inline_audited('${entry}','is_paid','false','Synthetic undo');`),/recebimento auditado/);
});
await check('real retainer invoices explicitly, receives once and audits update',async()=>{
const retainer=query(`insert into client_retainers(firm_id,client_id,billing_entity_id,monthly_amount,starts_on)values('${firm}','${client}','${society}',100,'2026-01-01')returning id;`);
const charge=query(`insert into retainer_charges(firm_id,retainer_id,client_id,billing_entity_id,period_start,amount)values('${firm}','${retainer}','${client}','${society}','2026-10-01',100)returning id;`);
let i=item(charge);assert.equal(i.can_pay,false);assert.throws(()=>query(paySql(i,100)),/pagamento indispon/);
query(`select invoice_pending_retainer('${charge}','${i.token}',current_date,'QA-INVOICE',null,null);`);i=item(charge);assert.equal(i.can_pay,true);
const k=randomUUID();const r=await withClientBarrier(paySql(i,100,k),paySql(i,100,k));assert.ok(r.every(x=>x.code===0),JSON.stringify(r));assert.equal(item(charge),undefined);
assert.ok(Number(query(`select count(*) from audit_log where entity_type='retainer_charges' and entity_id='${charge}';`,false))>=2);
});
await check('real fixed fee document receives without reissue or a fiscal receipt',()=>{
const job=query(`insert into fixed_fee_jobs(firm_id,client_id,billing_entity_id,title,agreed_amount,created_by)values('${firm}','${client}','${society}','Synthetic fixed job',100,'${actor}')returning id;`);
const n=json(`select issue_fixed_fee_honorarium_note('${job}','{"fixed_fee_paid":false}',123,0,null,'${randomUUID()}');`);
assert.equal(item(n.document_id).can_pay,false);query(`update fixed_fee_jobs set is_invoiced=true,invoice_date=current_date where id='${job}';`);
const i=item(n.document_id);assert.equal(i.remaining,123);query(paySql(i,123));assert.equal(item(n.document_id),undefined);
assert.equal(query(`select count(*) from honorarium_document_versions where document_id='${n.document_id}';`),'1');
assert.throws(()=>query(`update fixed_fee_jobs set is_paid=false where id='${job}';`),/recebimento auditado/);
});
await check('matter and team grants stay scoped; expired grants are excluded',()=>{
const u=randomUUID(),matter=randomUUID(),team=randomUUID(),entry=work();
query(`set request.jwt.claim.sub='${actor}';insert into auth.users(id)values('${u}');insert into firm_members(firm_id,user_id,role)values('${firm}','${u}','professional');insert into billing_entity_financial_permissions(firm_id,user_id,billing_entity_id,can_view_financials,created_by)values('${firm}','${u}','${society}',true,'${actor}');insert into matters(id,firm_id,client_id,matter_code,title,billing_entity_id)values('${matter}','${firm}','${client}','QA-${matter}','Synthetic matter','${society}');update work_entries set matter_id='${matter}' where id='${entry}';insert into access_grants(firm_id,principal_type,user_id,resource_type,matter_id,permission,created_by)values('${firm}','user','${u}','matter','${matter}','edit','${actor}');`,false);
const read=()=>JSON.parse(query(`set request.jwt.claim.sub='${u}';select get_payment_queue();`));assert.deepEqual(read().map(i=>i.id),[entry]);
query(`set request.jwt.claim.sub='${actor}';insert into teams(id,firm_id,name,created_by)values('${team}','${firm}','Synthetic team','${actor}');insert into team_members(firm_id,team_id,user_id,created_by)values('${firm}','${team}','${u}','${actor}');insert into access_grants(firm_id,principal_type,team_id,resource_type,client_id,permission,created_by)values('${firm}','team','${team}','client','${client}','view','${actor}');`,false);assert.ok(read().length>1);
query(`update access_grants set valid_from=now()-interval '2 days',valid_until=now()-interval '1 day' where team_id='${team}';`,false);assert.deepEqual(read().map(i=>i.id),[entry]);
});
await check('anonymous cannot execute payment APIs',()=>{assert.throws(()=>query('set role anon;select get_payment_queue();',false),/permission denied/);});
fs.writeFileSync(root+'output/payments-integration-fixture.json',JSON.stringify({actor,firm,client,society,profile,professional,w,note:note.document_id},null,2));
console.log(checks+' full application schema PostgreSQL checks passed; real Auth helpers/RLS and separate connections; no HTTP Auth/Storage service test.');
