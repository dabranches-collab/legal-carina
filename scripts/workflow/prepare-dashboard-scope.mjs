import {readFileSync,writeFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {createHash} from 'node:crypto'
const root=resolve(import.meta.dirname,'../..')
const overviewFile='supabase/migrations/20260928141755_align_overview_missing_price_with_attention.sql'
const professionalFile='supabase/migrations/20260818233000_align_entity_attention_with_drilldowns.sql'
const entityFile='supabase/migrations/20260928153000_distinguish_unpriced_recent_movements.sql'
const predicate=`
 and (p_scope_billing_entity_id is null or w.billing_entity_id=p_scope_billing_entity_id)
 and (p_scope_professional_id is null or w.professional_id=p_scope_professional_id)
 and (p_scope_client_type is null
  or (p_scope_client_type in ('individual','company') and exists(select 1 from public.client_profiles scope_cp where scope_cp.id=w.client_profile_id and scope_cp.firm_id=w.firm_id and scope_cp.active and scope_cp.client_type=p_scope_client_type))
  or (p_scope_client_type='mixed' and exists(select 1 from public.client_profiles scope_cp where scope_cp.client_id=w.client_id and scope_cp.firm_id=w.firm_id and scope_cp.active and scope_cp.client_type='individual')
   and exists(select 1 from public.client_profiles scope_cp where scope_cp.client_id=w.client_id and scope_cp.firm_id=w.firm_id and scope_cp.active and scope_cp.client_type='company')))`
const scopeSignature='p_scope_billing_entity_id uuid default null,p_scope_professional_id uuid default null,p_scope_client_type text default null'
const names=[['get_professional_landing_summaries',professionalFile,''],['get_dashboard_overview',overviewFile,''],['get_dashboard_metric_breakdowns',overviewFile,''],['get_client_category_dashboard',entityFile,'p_client_type text default null'],['get_entity_dashboard_rolling',entityFile,'p_kind text,p_entity_id uuid default null']]
const functions=names.map(([name,file,args])=>{
 const source=readFileSync(resolve(root,file),'utf8'),definition=source.match(new RegExp(`create or replace function public\\.${name}\\([\\s\\S]*?\\n\\$\\$;`,'i'))?.[0]
 if(!definition)throw new Error('Missing authoritative definition: '+name)
 let scoped=definition.replace(`public.${name}(${args})`,`public.get_workflow_${name.slice(4)}(${args?args+',':''}${scopeSignature})`)
 if(scoped===definition)throw new Error('Signature drift: '+name)
 const marker=(name.startsWith('get_dashboard_')||name==='get_professional_landing_summaries')?'where scope.can_view':name==='get_client_category_dashboard'?"where private.has_scope_access(w.firm_id,w.billing_entity_id,w.client_id,w.matter_id,'view')":"w.firm_id=viewer_firm_id and(viewer_role in('owner','admin','operator') or private.has_scope_access(w.firm_id,w.billing_entity_id,w.client_id,w.matter_id,'view'))"
 const occurrences=scoped.split(marker).length-1
 if(occurrences!==(name==='get_entity_dashboard_rolling'?5:1))throw new Error('ACL marker drift: '+name)
 scoped=scoped.replaceAll(marker,marker+predicate)
 if(name==='get_dashboard_metric_breakdowns')scoped=scoped.replace('select society,','select billing_entity_id as "billingEntityId",society,').replace('group by society order by society','group by billing_entity_id,society order by society,billing_entity_id')
 if(name==='get_professional_landing_summaries'){
  scoped=scoped.replace('where p.active order by','where p.active and private.is_firm_member(p.firm_id) and (p_scope_professional_id is null or p.id=p_scope_professional_id) order by')
  scoped=scoped.replace('coalesce(a.total,0)','case when a.professional_id is null then 0 else a.total end').replace('coalesce(a.invoiced,0)','case when a.professional_id is null then 0 else a.invoiced end')
 }
 const types=name==='get_entity_dashboard_rolling'?'text,uuid,uuid,uuid,text':name==='get_client_category_dashboard'?'text,uuid,uuid,text':'uuid,uuid,text'
 return `-- Source: ${file}; original function SHA256 ${createHash('sha256').update(definition).digest('hex')}\n${scoped}\nrevoke all on function public.get_workflow_${name.slice(4)}(${types}) from public,anon;\ngrant execute on function public.get_workflow_${name.slice(4)}(${types}) to authenticated;\nalter function public.get_workflow_${name.slice(4)}(${types}) set statement_timeout='30s';`
})
const proposed=`-- PROPOSTA; não é migration nem foi aplicada a serviços reais.
-- Mantém fórmulas e controlo de acesso das funções originais.
-- Subtotais distinguem sociedades por UUID; responsáveis preservam NULL financeiro.
-- Acrescenta intersecções ao trabalho autorizado.
-- Responsáveis: limita os nomes à entidade autorizada e conserva NULL financeiro.
-- importErrors conserva o âmbito global da entidade; não é filtrado por trabalho.
-- Gerado/revisto com scripts/workflow/prepare-dashboard-scope.mjs --write.
begin;
${functions.join('\n\n')}
commit;
`
const target=resolve(root,'docs/workflow/sql/workflow_dashboard_scope.sql')
if(process.argv.includes('--write'))writeFileSync(target,proposed)
else if(readFileSync(target,'utf8')!==proposed)throw new Error('Dashboard proposal drift; review authoritative sources before regenerating.')
console.log('Five scoped dashboard proposals verified against authoritative source bodies.')
