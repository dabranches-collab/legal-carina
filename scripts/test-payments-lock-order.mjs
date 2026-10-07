import assert from 'node:assert/strict';import {spawnSync,spawn} from 'node:child_process';import {randomUUID} from 'node:crypto';
const container='carina-payments-qa-20261006';
const inspection=spawnSync('docker',['inspect',container,'--format','{{index .Config.Labels "purpose"}}|{{.HostConfig.NetworkMode}}'],{encoding:'utf8'});
assert.equal(inspection.status,0,'Dedicated QA container is required');assert.equal(inspection.stdout.trim(),'carina-payments-local-validation|none','Refusing a non-QA or networked container');
const args=['exec','-i',container,'psql','-U','postgres','-d','payments_lock_order_20261006','-X','-Atq','-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose'];
const actor=randomUUID(),firm=randomUUID(),client=randomUUID(),society=randomUUID(),profile=randomUUID(),professional=randomUUID();
const prefix=`set request.jwt.claim.sub='${actor}';set role authenticated;set statement_timeout='15s';`;
function query(s,auth=true){const r=spawnSync('docker',args,{input:(auth?prefix:'')+s,encoding:'utf8'});if(r.status)throw Error(r.stderr.trim());return r.stdout.trim();}
const json=s=>JSON.parse(query(s));
const qstr=s=>"'"+s.replaceAll("'","''")+"'";
let checks=0;async function check(label,fn){await fn();console.log('PASS '+label);checks++;}
query(`set request.jwt.claim.sub='${actor}';insert into auth.users(id,email)values('${actor}','${actor}@example.test');insert into law_firms(id,name)values('${firm}','Synthetic payment integration');insert into firm_members(firm_id,user_id,role)values('${firm}','${actor}','owner');insert into billing_entities(id,firm_id,name)values('${society}','${firm}','Synthetic society');insert into clients(id,firm_id,client_code,client_type,display_name)values('${client}','${firm}','QA-${client}','individual','Synthetic payment client');insert into client_profiles(id,firm_id,client_id,client_type,client_code)values('${profile}','${firm}','${client}','individual','QA-${client}');insert into professionals(id,firm_id,display_name)values('${professional}','${firm}','Synthetic professional');`,false);
function concurrent(sql,name){const p=spawn('docker',args,{stdio:['pipe','pipe','pipe']});let out='',err='';p.stdout.on('data',x=>out+=x);p.stderr.on('data',x=>err+=x);const result=new Promise(resolve=>p.on('close',code=>resolve({code,out,err})));p.stdin.end(prefix+`set application_name='${name}';`+sql);return result;}
async function withClientBarrier(first,second,lock=`select id from clients where id='${client}' for update;`){const p=spawn('docker',args,{stdio:['pipe','pipe','pipe']});let out='',err='';p.stderr.on('data',x=>err+=x);const ready=new Promise((resolve,reject)=>{p.stdout.on('data',x=>{out+=x;if(out.includes('LOCKED'))resolve();});p.on('error',reject);p.on('close',code=>{if(!out.includes('LOCKED'))reject(Error('Barrier failed '+code+' '+err));});});const finished=new Promise(resolve=>p.on('close',code=>resolve({code,out,err})));p.stdin.write(prefix+`begin;reset role;${lock}set role authenticated;select 'LOCKED';\n`);await ready;const name='payments-race-'+randomUUID();const other=concurrent(second,name);let blocked=false;for(let n=0;n<15;n++){blocked=query(`select exists(select 1 from pg_stat_activity where application_name='${name}' and wait_event_type='Lock');`,false)==='t';if(blocked)break;await new Promise(r=>setTimeout(r,30));}if(!blocked){p.stdin.end('rollback;');await finished;await other;throw Error('Competing connection did not reach database lock barrier');}p.stdin.end(first+'commit;\n');return [await finished,await other];}

const work=()=>{const id=json(`select create_work_entry_with_allocation(current_date,'${profile}',null,'${professional}','${society}','Synthetic lock-order work',60,null,100);`).workEntryId;query(`select update_work_entry_inline_audited('${id}','invoice_date',current_date::text,'Synthetic invoice');select update_work_entry_inline_audited('${id}','is_invoiced','true','Synthetic invoice');`);return id;};
const item=id=>json('select get_payment_queue();').find(i=>i.id===id);
const paySql=(i,key)=>`select record_pending_payment('work','${i.id}',${i.remaining},current_date,'Synthetic transfer','${i.token}','${key}');`;
const editSql=id=>{const values=JSON.parse(query(`select to_jsonb(w) from work_entries w where id='${id}';`));return `select private.update_work_entry_full('${id}',${qstr(JSON.stringify({...values,effective_hourly_rate:120,effective_amount:120}))}::jsonb,'Synthetic full financial edit');`;};
const row=id=>JSON.parse(query(`select to_jsonb(w) from work_entries w where id='${id}';`));
const receiptCount=key=>query(`select count(*) from pending_payment_receipts where request_id='${key}';`,false);
const auditCount=id=>query(`select count(*) from audit_log where entity_id='${id}';`,false);
const lock=id=>`select id from work_entries where id='${id}' for update;`;

await check(process.argv.includes('--expect-baseline-deadlock')?'released function reproduces work/client deadlock':'full financial edit first: stale receipt, no deadlock; retry and replay audit once',async()=>{
 const id=work(),before=item(id),key=randomUUID(),beforeAudit=Number(auditCount(id));
 const r=await withClientBarrier(editSql(id),paySql(before,key),lock(id));
 if(process.argv.includes('--expect-baseline-deadlock')){
  assert.ok(r.some(x=>/40P01/.test(x.err)),JSON.stringify(r));console.log('REPRODUCED PostgreSQL SQLSTATE 40P01 with the released function');return;
 }
 assert.ok(r.every(x=>!/40P01/.test(x.err)),JSON.stringify(r));assert.equal(r[0].code,0,JSON.stringify(r));assert.notEqual(r[1].code,0);assert.match(r[1].err,/40001/);
 assert.equal(receiptCount(key),'0');assert.equal(row(id).is_paid,false);assert.equal(item(id).remaining,120);assert.ok(Number(auditCount(id))>beforeAudit);
 const fresh=item(id);const paid=json(paySql(fresh,key));assert.equal(json(paySql(fresh,key)).replayed,true);assert.equal(receiptCount(key),'1');assert.equal(row(id).is_paid,true);assert.equal(item(id),undefined);assert.equal(auditCount(paid.id),'1');
 const afterAudit=auditCount(id);assert.throws(()=>query(paySql(before,key)),/42501/);assert.equal(auditCount(id),afterAudit);assert.equal(receiptCount(key),'1');
});
if(process.argv.includes('--expect-baseline-deadlock'))process.exit(0);

await check('receipt first: concurrent full edit rolls back without losing payment or audit',async()=>{
 const id=work(),before=item(id),key=randomUUID(),edit=editSql(id);
 const overridesBefore=Number(query(`select count(*) from manual_overrides where work_entry_id='${id}' and reason='Synthetic full financial edit';`,false));
 const r=await withClientBarrier(paySql(before,key),edit,lock(id));
 assert.ok(r.every(x=>!/40P01/.test(x.err)),JSON.stringify(r));assert.equal(r[0].code,0,JSON.stringify(r));assert.notEqual(r[1].code,0);assert.match(r[1].err,/recebimento auditado/);
 assert.equal(row(id).effective_amount,100);assert.equal(row(id).is_paid,true);assert.equal(receiptCount(key),'1');assert.equal(item(id),undefined);
 assert.equal(Number(query(`select count(*) from manual_overrides where work_entry_id='${id}' and reason='Synthetic full financial edit';`,false)),overridesBefore);
 const receipt=JSON.parse(query(`select to_jsonb(r) from pending_payment_receipts r where request_id='${key}';`,false));assert.equal(receipt.amount,100);assert.equal(receipt.balance_before,100);assert.equal(auditCount(receipt.id),'1');
 const audit=auditCount(id);assert.equal(json(paySql(before,key)).replayed,true);assert.equal(auditCount(id),audit);
});

await check('two work receipts with same request serialize and audit exactly once',async()=>{
 const id=work(),before=item(id),key=randomUUID();const r=await withClientBarrier(paySql(before,key),paySql(before,key),lock(id));assert.ok(r.every(x=>x.code===0),JSON.stringify(r));assert.equal(receiptCount(key),'1');const receipt=json(paySql(before,key));assert.equal(receipt.replayed,true);assert.equal(auditCount(receipt.id),'1');
});

await check('explicit transaction rollback restores work, ledger and audit; retry succeeds',()=>{
 const id=work(),before=item(id),key=randomUUID(),audit=auditCount(id),original=row(id);
 query('begin;'+paySql(before,key)+'rollback;');assert.deepEqual(row(id),original);assert.equal(receiptCount(key),'0');assert.equal(auditCount(id),audit);
 const receipt=json(paySql(before,key));assert.equal(receiptCount(key),'1');assert.equal(auditCount(receipt.id),'1');assert.equal(row(id).is_paid,true);
});
console.log(checks+' work/edit PostgreSQL concurrency checks passed in isolated synthetic database.');
