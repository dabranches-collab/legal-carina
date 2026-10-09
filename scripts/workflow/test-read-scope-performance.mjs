import assert from 'node:assert/strict'
import {spawnSync} from 'node:child_process'

const container='carina-payments-qa-20261006'
const inspection=spawnSync('docker',['inspect',container,'--format','{{index .Config.Labels "purpose"}}|{{.HostConfig.NetworkMode}}'],{encoding:'utf8'})
assert.equal(inspection.status,0)
assert.equal(inspection.stdout.trim(),'carina-payments-local-validation|none')
const args=['exec','-i',container,'psql','-U','postgres','-d','postgres','-X','-Atq','-v','ON_ERROR_STOP=1']
function query(sql){const r=spawnSync('docker',args,{input:sql,encoding:'utf8'});assert.equal(r.status,0,r.stderr);return r.stdout.trim()}
const fixture=JSON.parse(query(`select jsonb_build_object('actor',fm.user_id,'society',b.id,'professional',p.id) from law_firms f join firm_members fm on fm.firm_id=f.id and fm.role='owner' join billing_entities b on b.firm_id=f.id and b.name='Same synthetic name' join professionals p on p.firm_id=f.id and p.display_name='Synthetic first' where f.name='Synthetic scope QA' order by f.created_at desc limit 1;`))
for(const name of ['get_workflow_payment_queue','get_workflow_client_credit_accounts','get_workflow_retainer_management']){
 const counter=()=>Number(query(`select calls from pg_stat_user_functions where funcid='public.get_workflow_client_ids(uuid,uuid,text)'::regprocedure;`))
 const before=counter()
 query(`set track_functions='all'; set request.jwt.claim.sub='${fixture.actor}'; set role authenticated; set statement_timeout='30s'; select jsonb_array_length(public.${name}('${fixture.society}','${fixture.professional}',null));`)
 const calls=counter()-before
 assert.equal(calls,1,`${name}: client portfolio should be computed once per request`)
 console.log(`PASS ${name}: client portfolio computed once`)
}
console.log('3 full-PostgreSQL read-scope performance checks passed; isolated synthetic QA only.')
