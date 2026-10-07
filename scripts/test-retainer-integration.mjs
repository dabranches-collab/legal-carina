import assert from 'node:assert/strict';import {spawnSync,spawn} from 'node:child_process';import {randomUUID} from 'node:crypto';
const container='carina-payments-qa-20261006';
const inspection=spawnSync('docker',['inspect',container,'--format','{{index .Config.Labels "purpose"}}|{{.HostConfig.NetworkMode}}'],{encoding:'utf8'});
assert.equal(inspection.status,0,'Dedicated QA container is required');assert.equal(inspection.stdout.trim(),'carina-payments-local-validation|none','Refusing a non-QA or networked container');
const args=['exec','-i',container,'psql','-U','postgres','-d','postgres','-X','-Atq','-v','ON_ERROR_STOP=1'];
const actor=randomUUID(),firm=randomUUID(),client=randomUUID(),society=randomUUID(),profile=randomUUID(),professional=randomUUID();
const prefix=`set request.jwt.claim.sub='${actor}';set role authenticated;set statement_timeout='15s';`;
function query(s,auth=true){const r=spawnSync('docker',args,{input:(auth?prefix:'')+s,encoding:'utf8'});if(r.status)throw Error(r.stderr.trim());return r.stdout.trim();}
const json=s=>JSON.parse(query(s));
let checks=0;async function check(label,fn){await fn();console.log('PASS '+label);checks++;}
query(`set request.jwt.claim.sub='${actor}';insert into auth.users(id,email)values('${actor}','${actor}@example.test');insert into law_firms(id,name)values('${firm}','Synthetic payment integration');insert into firm_members(firm_id,user_id,role)values('${firm}','${actor}','owner');insert into billing_entities(id,firm_id,name)values('${society}','${firm}','Synthetic society');insert into clients(id,firm_id,client_code,client_type,display_name)values('${client}','${firm}','QA-${client}','individual','Synthetic payment client');insert into client_profiles(id,firm_id,client_id,client_type,client_code)values('${profile}','${firm}','${client}','individual','QA-${client}');insert into professionals(id,firm_id,display_name)values('${professional}','${firm}','Synthetic professional');`,false);

const terms=query(`insert into client_retainers(firm_id,client_id,billing_entity_id,monthly_amount,starts_on,included_hours,hours_interval_months,billing_interval_months,billing_mode,excess_hourly_rate)values('${firm}','${client}','${society}',100,'2026-01-01',32,12,1,'retainer_plus_hours',150)returning id;`);
const work=(date,minutes)=>json(`select create_work_entry_with_allocation('${date}','${profile}',null,'${professional}','${society}','Synthetic annual retainer',${minutes},null,null,'retainer','[]','retainer');`).workEntryId;
const row=id=>json(`select to_jsonb(w)from work_entries w where id='${id}';`);
const edit=(id,values)=>query(`select update_work_entry_with_allocation('${id}',(select to_jsonb(w)from work_entries w where id='${id}')||'${JSON.stringify(values)}'::jsonb,'');`);
await check('clearing financial fields succeeds without a manual audit record',()=>{
 const normal=json(`select create_work_entry_with_allocation('2025-01-02','${profile}',null,'${professional}','${society}','Synthetic nullable correction',60,null,150);`).workEntryId;
 edit(normal,{effective_amount:null,effective_hourly_rate:null,effective_discount_amount:null});
 assert.equal(row(normal).effective_amount,null);
 assert.equal(query(`select count(*)from manual_overrides where work_entry_id='${normal}';`),'0');
});
await check('failed retainer association rolls back the whole correction',()=>{
 const normal=json(`select create_work_entry_with_allocation('2025-02-02','${profile}',null,'${professional}','${society}','Synthetic atomic correction',60,null,150);`).workEntryId;
 assert.throws(()=>edit(normal,{billing_scope:'retainer',effective_hourly_rate:null,effective_amount:null}),/active retainer/);
 assert.equal(row(normal).effective_amount,150);assert.equal(row(normal).billing_scope,'standard');
});
const first=work('2026-01-05',1905);
await check('32 annual hours: 31h45 included without financial value',()=>{const r=row(first);assert.equal(r.billing_scope,'retainer');assert.equal(r.retainer_covered_minutes,1905);assert.equal(r.effective_amount,null);});
const second=work('2026-10-07',60);
await check('boundary record: 15 included + 45 excess at 150 = 112.50',()=>{const r=row(second);assert.equal(r.duration_minutes,60);assert.equal(r.retainer_covered_minutes,15);assert.equal(r.retainer_excess_minutes,45);assert.equal(r.effective_amount,112.5);assert.equal(r.billing_scope,'standard');assert.equal(r.is_billable,true);});
const third=work('2026-10-08',30);
await check('exhausted annual package: next 30 minutes cost 75',()=>assert.equal(row(third).effective_amount,75));
await check('ordinary correction needs no manual override or reason',()=>{const before=query(`select count(*)from manual_overrides where work_entry_id='${first}';`);edit(first,{duration_minutes:1875,activity_description:'Synthetic correction'});assert.equal(query(`select count(*)from manual_overrides where work_entry_id='${first}';`),before);assert.equal(row(second).retainer_covered_minutes,45);assert.equal(row(second).effective_amount,37.5);});
await check('editing excess keeps charging only excess, never full duration',()=>{edit(second,{activity_description:'Synthetic excess correction'});assert.equal(row(second).effective_amount,37.5);});
const nextYear=work('2027-01-02',60);
await check('annual package renews without rollover',()=>{assert.equal(row(nextYear).effective_amount,null);assert.equal(row(nextYear).retainer_covered_minutes,60);});
await check('overage enters existing payment queue without double billing included time',()=>{const q=json('select get_payment_queue();');assert.equal(q.find(i=>i.id===second).total,37.5);assert.equal(q.find(i=>i.id===first),undefined);});
await check('cancelled work releases annual included hours',()=>{edit(first,{status:'cancelled'});assert.equal(row(first).status,'cancelled');assert.equal(row(second).effective_amount,null);assert.equal(row(third).effective_amount,null);});
await check('retainer duration maps include mixed records',()=>{const summary=json(`select get_client_retainer_summary('${client}');`);assert.ok(summary.minutes>=150);});
await check('manual retainer consumption metadata cannot be forged',()=>{
 const previous=row(second).retainer_excess_minutes;
 try{query(`update work_entries set retainer_excess_minutes=999 where id='${second}';`)}catch(error){assert.match(error.message,/calculado automaticamente|permission denied/)}
 assert.equal(row(second).retainer_excess_minutes,previous);
 assert.throws(()=>query(`update work_entries set retainer_excess_minutes=999 where id='${second}';`,false),/calculado automaticamente/);
});
await check('concurrent annual consumption rolls back cleanly and is safe to retry',async()=>{
 work('2028-01-02',1920);
 const held=spawn('docker',args,{stdio:['pipe','pipe','pipe']});let output='',errors='';held.stderr.on('data',value=>errors+=value);
 const ready=new Promise((resolve,reject)=>{held.stdout.on('data',value=>{output+=value;if(output.includes('LOCKED'))resolve()});held.on('close',()=>{if(!output.includes('LOCKED'))reject(Error(errors))});held.on('error',reject)});
 const finished=new Promise(resolve=>held.on('close',resolve));
 held.stdin.write(`begin;select pg_advisory_xact_lock(hashtextextended('${terms}',0));select 'LOCKED';\n`);
 await ready;
 try{
  assert.throws(()=>work('2028-01-03',60),/a ser actualizado/);
  assert.equal(query(`select count(*)from work_entries where client_id='${client}'and work_date='2028-01-03';`),'0');
 }finally{held.stdin.end('rollback;\n');await finished}
 const retried=work('2028-01-03',60);assert.equal(row(retried).effective_amount,150);
});
await check('fixed fee assignment releases retainer hours and preserves fixed fee treatment',()=>{
 const included=work('2029-01-02',1920),overage=work('2029-01-03',60);
 assert.equal(row(overage).effective_amount,150);
 const job=query(`insert into fixed_fee_jobs(firm_id,client_id,billing_entity_id,title,agreed_amount,created_by)values('${firm}','${client}','${society}','Synthetic fixed job',100,'${actor}')returning id;`);
 query(`select assign_work_entry_fixed_fee('${included}','${job}');`);
 const fixed=row(included);assert.equal(fixed.billing_scope,'fixed_fee');assert.equal(fixed.fixed_fee_job_id,job);assert.equal(fixed.retainer_id,null);assert.equal(fixed.retainer_covered_minutes,null);assert.equal(fixed.effective_amount,null);
 assert.equal(row(overage).effective_amount,null);assert.equal(row(overage).retainer_covered_minutes,60);
});
await check('returning to simple retainer removes unbilled excess',()=>{
 query(`update client_retainers set billing_mode='retainer' where id='${terms}';`);
 assert.equal(row(second).effective_amount,null);assert.equal(row(second).retainer_id,null);
});
await check('private repricing cannot be called by authenticated or anon',()=>{assert.throws(()=>query(`select private.reprice_retainer_work('${terms}');`),/permission denied/);assert.throws(()=>query(`set role anon;select private.reprice_retainer_work('${terms}');`,false),/permission denied/);});
console.log(checks+' annual retainer PostgreSQL checks passed; synthetic data only.');
