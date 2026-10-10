import {test,expect} from '@playwright/test'
import {createQaAllocationData} from '../src/lib/qaAllocationData'
import packageJson from '../package.json' with {type:'json'}
test.skip(process.env.WORKFLOW_ISOLATED_E2E!=='1','Requer playwright.workflow.config.ts para bloquear serviços reais.')
let forbidden:string[]
let searchCalls: Record<string,unknown>[]
let scopeCalls: Array<{rpc:string;args:Record<string,unknown>}>
let writes:string[]
let browserErrors:string[]
type WorkFixture={id:string;professional_id:string;professional_name:string;billing_entity_id:string;client_type:string;client_id:string;client_name:string;activity_description:string;duration_minutes:number;effective_amount:number;effective_hourly_rate:number|null;is_invoiced:boolean;is_paid:boolean;billing_scope:string;work_date:string;status:string}
function overviewFixture(items:WorkFixture[]){
 const total=items.reduce((sum,item)=>sum+item.effective_amount,0),minutes=items.reduce((sum,item)=>sum+item.duration_minutes,0),invoiced=items.filter(item=>item.is_invoiced).reduce((sum,item)=>sum+item.effective_amount,0),paid=items.filter(item=>item.is_paid).reduce((sum,item)=>sum+item.effective_amount,0)
 const grouped=(key:'client_name'|'professional_name')=>[...new Set(items.map(item=>item[key]))].map(label=>({label,value:items.filter(item=>item[key]===label).reduce((sum,item)=>sum+item.effective_amount,0)}))
 return {metrics:{minutes,worked:total,invoiced,paid,receivable:invoiced-paid,uninvoicedCount:items.filter(item=>!item.is_invoiced).length,unpaidCount:items.filter(item=>item.is_invoiced&&!item.is_paid).length,uncollectibleCount:0,uncollectibleValue:0,averageRate:minutes?total*60/minutes:null,activeClients:new Set(items.map(item=>item.client_id)).size,missingPrice:items.filter(item=>item.effective_hourly_rate===null).length,missingBilling:0,overrides:0,importErrors:0},annual:[{label:2026,value:total,minutes,societies:{LEGALTEAM:total}}],monthly:[{label:'2026-09',value:total,societies:{LEGALTEAM:total}}],monthlyByYear:[{year:2026,month:9,value:total}],billingAnnual:[{society:'LEGALTEAM',year:2026,value:total}],billingMonthly:[{society:'LEGALTEAM',period:'2026-09',value:total}],latestYear:2026,byClient:grouped('client_name'),byBilling:[{label:'LEGALTEAM',value:total}],byProfessional:grouped('professional_name'),byArchive:[],clientTypes:[]}
}
test.beforeEach(async({context,request,page})=>{
 for(const path of ['/supabase-api/auth/v1/user','/supabase-functions/v1/test','/api/document-translation']){const response=await request.get(path);expect(response.status()).toBe(403);expect(await response.text()).toBe('Blocked by isolated setup')}
 forbidden=[];searchCalls=[];scopeCalls=[];writes=[];browserErrors=[];page.on('pageerror',error=>browserErrors.push(error.message));const fixture=createQaAllocationData()
 await context.addInitScript(version=>localStorage.setItem('carina-release-notes-seen',version),packageJson.version)
 await context.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url())
  if(url.origin==='http://127.0.0.1:54321'&&url.pathname.startsWith('/rest/v1/')){
   const rpc=url.pathname.match(/\/rpc\/([^/]+)/)?.[1],table=url.pathname.split('/').at(-1)??'',args=request.method()==='POST'?request.postDataJSON():{}
   let result=fixture(rpc,table,args,url,request.method(),request.headers().accept?.includes('vnd.pgrst.object')??false)
   if(!rpc&&request.method()!=='GET')writes.push(request.method()+' '+table)
   if(rpc?.startsWith('get_workflow_')){
    scopeCalls.push({rpc,args})
    const all=fixture('search_work_entries','',{},url,'POST',false) as {items:WorkFixture[]}
    const scoped=all.items.filter(item=>(!args.p_scope_professional_id||item.professional_id===args.p_scope_professional_id)&&(!args.p_scope_billing_entity_id||item.billing_entity_id===args.p_scope_billing_entity_id)&&(!args.p_scope_client_type||item.client_type===args.p_scope_client_type))
    const clients=[...new Set(scoped.map(item=>item.client_id))]
    if(rpc==='get_workflow_client_ids')result=clients
    if(rpc==='get_workflow_dashboard_overview')result=overviewFixture(scoped)
    if(rpc==='get_workflow_dashboard_metric_breakdowns')result=[{society:'LEGALTEAM',billingEntityId:'00000000-0000-4000-8000-000000000002',...overviewFixture(scoped).metrics}]
    if(rpc==='get_workflow_professional_landing_summaries')result=[...new Set(scoped.map(item=>item.professional_id))].map(id=>{const subset=scoped.filter(item=>item.professional_id===id),metrics=overviewFixture(subset).metrics;return {id,name:subset[0].professional_name,minutes:metrics.minutes,total:metrics.worked,invoiced:metrics.invoiced,clients:metrics.activeClients,uninvoiced:metrics.uninvoicedCount,unpaid:metrics.unpaidCount,missingPrice:metrics.missingPrice}})
    if(rpc==='get_workflow_entity_dashboard_rolling'||rpc==='get_workflow_client_category_dashboard'){
     const kind=args.p_kind??'client',selected=String(args.p_entity_id??(kind==='billing'?'00000000-0000-4000-8000-000000000002':kind==='professional'?scoped[0]?.professional_id:args.p_client_type??'all'))
     const subset=scoped.filter(item=>rpc==='get_workflow_client_category_dashboard'?!args.p_client_type||item.client_type===args.p_client_type:kind==='billing'?item.billing_entity_id===selected:kind==='professional'?item.professional_id===selected:item.client_id===selected),data=overviewFixture(subset),title=kind==='billing'?'LEGALTEAM':kind==='professional'?subset[0]?.professional_name??'Responsável':'PARTICULARES'
     result={selectedId:selected,identity:{title,subtitle:String(kind),code:''},options:[{id:selected,label:title}],metrics:{...data.metrics,total:data.metrics.worked,pending:data.metrics.receivable,movements:subset.length,clients:data.metrics.activeClients,professionals:new Set(subset.map(item=>item.professional_id)).size,billingEntities:new Set(subset.map(item=>item.billing_entity_id)).size},annual:data.annual,monthly:data.monthly,recent:subset}
    }
    if(rpc==='get_workflow_payment_queue')result=[...scoped.filter(item=>item.is_invoiced&&!item.is_paid).map(item=>({id:item.id,category:'work',client_id:item.client_id,client_name:item.client_name,society_name:'LEGALTEAM',title:item.activity_description,date:'2026-09-01',currency:'EUR',total:200.12,received:30,deducted:20,remaining:150.12,token:'synthetic-token-unchanged',can_pay:true,can_edit:true,status:'invoiced'})),...(clients.includes('00000000-0000-4000-8000-000000000020')?[{id:'00000000-0000-4000-8000-000000000070',category:'note',client_id:clients[0],client_name:'Cliente Demonstração Alfa',society_name:'LEGALTEAM',title:'Nota integral simulada',date:'2026-09-01',currency:'EUR',total:1500,received:200,deducted:300.01,remaining:999.99,token:'synthetic-revision-2',revision:2,can_pay:true,can_edit:false,status:'invoiced'}]:[])]
    if(rpc==='get_workflow_retainer_management')result=[]
    if(rpc==='get_workflow_client_credit_accounts')result=[]
   }
   if(rpc==='get_dashboard_overview'){const all=fixture('search_work_entries','',{},url,'POST',false) as {items:WorkFixture[]};result=overviewFixture(all.items)}
   if(rpc==='get_dashboard_metric_breakdowns')result=[]
   if(rpc==='search_work_entries'){
    searchCalls.push(args)
    const base=result as {items:Array<{professional_id:string;billing_entity_id:string;client_type:string;client_id:string}>;total:number}
    const items=base.items.filter(item=>(!args.p_professional_id||item.professional_id===args.p_professional_id)&&(!args.p_billing_entity_id||item.billing_entity_id===args.p_billing_entity_id)&&(!args.p_client_type||item.client_type===args.p_client_type)&&(!args.p_client_id||item.client_id===args.p_client_id))
    result={...base,items,total:items.length}
   }
   if(rpc==='get_attention_work_entries'){
    const base=fixture('search_work_entries',table,args,url,'POST',false) as {items:Array<{client_id:string;is_invoiced:boolean;is_paid:boolean}>;total:number}
    const items=base.items.filter(item=>(!args.p_client_id||item.client_id===args.p_client_id)&&(!args.p_professional_id||(item as WorkFixture).professional_id===args.p_professional_id)&&(!args.p_billing_entity_id||(item as WorkFixture).billing_entity_id===args.p_billing_entity_id)&&(!args.p_client_type||(item as WorkFixture).client_type===args.p_client_type)&&(args.p_kind==='uninvoiced'?!item.is_invoiced:args.p_kind==='unpaid'?item.is_invoiced&&!item.is_paid:false))
    result={...base,items,total:items.length}
   }
   return route.fulfill({contentType:'application/json',body:JSON.stringify(result)})
  }
  if(url.origin==='http://127.0.0.1:5173'&&!/^\/(supabase-api|supabase-functions|api\/document-translation)/.test(url.pathname))return route.continue()
  forbidden.push(url.origin+url.pathname);return route.abort('blockedbyclient')
 })
 await context.routeWebSocket(/.*/,socket=>socket.close())
})
test.afterEach(()=>{expect(forbidden,'Nenhum serviço real ou pedido sem mock').toEqual([]);expect(browserErrors,'Sem erros não tratados no browser').toEqual([])})
async function openFromList(page:import('@playwright/test').Page){
 if((page.viewportSize()?.width??1440)<900){await page.getByRole('button',{name:'Caixas',exact:true}).click();await page.getByRole('list',{name:'Lista de PARTICULARES em caixas'}).getByRole('button',{name:'Ficha',exact:true}).first().click()}
 else await page.getByRole('cell',{name:'Cliente Demonstração Alfa',exact:true}).first().dblclick()
}
async function open(page:import('@playwright/test').Page,preview=true){await page.goto('/?qa-iphone=1&qa-role=admin&view=clients&clientType=individual&clientMode=list'+(preview?'&workflow=preview':''));await openFromList(page);return page.getByRole('dialog',{name:'Cliente Demonstração Alfa',exact:true})}
test('cinco grupos reutilizam dados, registos, contratos e documentos',async({page},info)=>{
 const dialog=await open(page),nav=dialog.getByRole('navigation',{name:'Grupos da ficha do cliente'})
 await expect(nav.getByRole('button')).toHaveCount(5);await expect(dialog.getByRole('region',{name:'Resumo da ficha'})).toBeVisible()
 await nav.getByRole('button',{name:'Dados',exact:true}).click();await expect(dialog.getByLabel('Nome',{exact:true})).toBeVisible()
 const pages=dialog.getByRole('navigation',{name:'Páginas da ficha do cliente'})
 await expect(pages.getByRole('button')).toHaveCount(3);await pages.getByRole('button',{name:'Contactos',exact:true}).click();await expect(dialog.getByLabel('Nome',{exact:true})).not.toBeVisible()
 await nav.getByRole('button',{name:'Trabalho',exact:true}).click();await expect(dialog.getByRole('table',{name:'Registos de trabalho'})).toBeVisible()
 await nav.getByRole('button',{name:'Contratos',exact:true}).click();await expect(pages.getByRole('button')).toHaveCount(2);await pages.getByRole('button',{name:'Preço fixo',exact:true}).click()
 await nav.getByRole('button',{name:'Financeiro e documentos',exact:true}).click();await expect(pages.getByRole('button')).toHaveCount(5)
 for(const name of ['Documentos','Credenciais','Facturas','Notas de Honorários','Provisões']){await pages.getByRole('button',{name,exact:true}).click();await expect(pages.getByRole('button',{name,exact:true})).toHaveAttribute('aria-current','page')}
 await nav.getByRole('button',{name:'Resumo',exact:true}).click();await expect(dialog.getByRole('region',{name:'Resumo da ficha'})).toBeVisible();await expect(dialog.getByText('Provisões para honorários',{exact:true})).not.toBeVisible()
 await nav.getByRole('button',{name:'Financeiro e documentos',exact:true}).click()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
 await page.screenshot({path:`output/workflow-integration/${info.project.name}-finance-light.png`})
 await dialog.locator('[data-close-record]').first().click()
 await page.getByRole('button',{name:'Activar modo escuro',exact:true}).click()
 await openFromList(page)
 await nav.getByRole('button',{name:'Financeiro e documentos',exact:true}).click()
 await expect(nav).toBeVisible();await page.screenshot({path:`output/workflow-integration/${info.project.name}-finance-dark.png`})
})

test('Nova despesa mostra sugestões ao escrever e permite escolher directamente por toque',async({page})=>{
 await page.goto('/?qa-iphone=1&qa-demo=1&qa-allocation=1&qa-role=admin&workflow=preview&view=overview')
 await page.getByRole('button',{name:'Criar nova despesa'}).click()
 const dialog=page.getByRole('dialog',{name:'Nova despesa'}),client=dialog.getByRole('combobox',{name:'Cliente e vertente'})
 await client.fill('Alfa')
 const suggestion=dialog.getByRole('option',{name:/Cliente Demonstração Alfa/})
 await expect(suggestion).toBeVisible()
 const size=await suggestion.boundingBox();expect(size&&size.height>=44).toBeTruthy()
 await suggestion.click()
 await expect(dialog.getByRole('listbox')).toHaveCount(0)
 await expect(dialog.getByLabel('Registo deste cliente')).toBeVisible()
 await expect(client).toHaveValue(/Cliente Demonstração Alfa/)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
})

test('novo registo fecha sugestões vazias ou incompletas ao preencher outros campos',async({page})=>{
 await page.goto('/?qa-iphone=1&qa-demo=1&qa-allocation=1&qa-role=admin&workflow=preview&view=work')
 await page.getByRole('button',{name:'Criar novo registo'}).click()
 const dialog=page.getByRole('dialog',{name:'Criar movimento'}),client=dialog.getByRole('combobox',{name:'Cliente e vertente'})
 await client.click();await expect(dialog.getByRole('listbox')).toBeVisible()
 await dialog.getByRole('textbox',{name:/^Data/}).click();await expect(dialog.getByRole('listbox')).toHaveCount(0)
 await client.fill('Alfa');await expect(dialog.getByRole('listbox')).toBeVisible()
 await dialog.getByRole('heading',{name:'Criar movimento'}).click();await expect(dialog.getByRole('listbox')).toHaveCount(0)
 await dialog.getByLabel('Actividade',{exact:true}).fill('Preencher primeiro a actividade')
 await expect(client).toHaveValue('Alfa')
 await expect(dialog.getByRole('button',{name:'Guardar movimento'})).toBeDisabled()
})
test('URL conserva grupo, página e lista de origem',async({page})=>{
 const dialog=await open(page);await dialog.getByRole('navigation',{name:'Grupos da ficha do cliente'}).getByRole('button',{name:'Financeiro e documentos',exact:true}).click();await dialog.getByRole('button',{name:'Documentos',exact:true}).click()
 await expect.poll(()=>new URL(page.url()).searchParams.get('clientGroup')).toBe('finance');await page.reload();await expect(dialog.getByRole('button',{name:'Documentos',exact:true})).toHaveAttribute('aria-current','page')
 await dialog.locator('[data-close-record]').first().click();await expect(dialog).toHaveCount(0);expect(new URL(page.url()).searchParams.get('workflow')).toBe('preview');expect(new URL(page.url()).searchParams.has('clientGroup')).toBe(false)
})
test('sem preview conserva a ficha habitual',async({page})=>{
 const dialog=await open(page,false);await expect(dialog.getByRole('navigation',{name:'Grupos da ficha do cliente'})).toHaveCount(0);await expect(dialog.getByRole('navigation',{name:'Páginas da ficha do cliente'}).getByRole('button')).toHaveCount(10);await expect(dialog.getByLabel('Nome',{exact:true})).toBeVisible()
})

test('filtro de trabalho restaura após contratos e recarregamento',async({page})=>{
 const dialog=await open(page),nav=dialog.getByRole('navigation',{name:'Grupos da ficha do cliente'})
 await nav.getByRole('button',{name:'Contratos',exact:true}).click();await dialog.getByRole('button',{name:'Preço fixo',exact:true}).click();await nav.getByRole('button',{name:'Trabalho',exact:true}).click()
 await dialog.getByRole('button',{name:/Não facturados/}).click();await expect(dialog.getByRole('table',{name:'Registos de trabalho'})).toBeVisible()
 await expect.poll(()=>new URL(page.url()).searchParams.get('recordFilter')).toBe('uninvoiced');await page.reload()
 await expect(nav.getByRole('button',{name:'Trabalho',exact:true})).toHaveAttribute('aria-current','page');await expect(dialog.getByRole('table',{name:'Registos de trabalho'})).toBeVisible()
})

test('sociedade, responsável e categoria chegam juntos à consulta e não removem dados',async({page})=>{
 const professional='00000000-0000-4000-8000-000000000010',society='00000000-0000-4000-8000-000000000002'
 await page.goto(`/?qa-iphone=1&qa-role=admin&workflow=preview&view=work&professionalId=${professional}&billingEntityId=${society}&clientType=individual`)
 const table=page.getByRole('table',{name:'Registos de trabalho'})
 await expect(table).toContainText('Consulta e preparação de processo')
 await expect(table).not.toContainText('Reunião de acompanhamento')
 await expect.poll(()=>searchCalls.some(args=>args.p_professional_id===professional&&args.p_billing_entity_id===society&&args.p_client_type==='individual')).toBe(true)
 await page.reload();await expect(table).toContainText('Consulta e preparação de processo')
 await page.getByRole('group',{name:'Responsável',exact:true}).getByRole('combobox').selectOption('00000000-0000-4000-8000-000000000011')
 await expect(table).toContainText('Análise documental');await expect(table).not.toContainText('Consulta e preparação de processo')
 await page.goto('/?qa-iphone=1&qa-role=admin&workflow=preview&view=work')
 await expect(table).toContainText('Consulta e preparação de processo');await expect(table).toContainText('Reunião de acompanhamento')
})

test('mudar categoria e recarregar conserva a ficha nova',async({page})=>{
 await page.goto('/?qa-iphone=1&qa-role=admin&workflow=preview&view=clients')
 await page.getByRole('button',{name:'PARTICULARES',exact:true}).click()
 expect(new URL(page.url()).searchParams.get('workflow')).toBe('preview')
 // The category navigation deliberately clears test identity parameters.
 // Restore the synthetic test identity without changing application Auth.
 await page.evaluate(()=>{const url=new URL(location.href);url.searchParams.set('qa-iphone','1');url.searchParams.set('qa-role','admin');history.replaceState({},'',url)})
 await page.reload();const dialog=await (async()=>{await openFromList(page);return page.getByRole('dialog',{name:'Cliente Demonstração Alfa',exact:true})})()
 await expect(dialog.getByRole('navigation',{name:'Grupos da ficha do cliente'}).getByRole('button')).toHaveCount(5)
})

test('a primeira linha da tabela abre a ficha sem sobreposição em horizontal',async({page})=>{
 const landscape=(page.viewportSize()?.height??900)<500
 await page.goto('/?qa-iphone=1&qa-role=admin&workflow=preview&view=clients&clientType=individual&clientMode=list&clientLayout=table'+(landscape?'&safe-left=59&safe-right=59&safe-bottom=21':''))
 if(landscape){
  const controls=await page.locator('.app-shell-header button').evaluateAll(elements=>elements.filter(e=>e.checkVisibility()).map(e=>{const r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return{label:e.getAttribute('aria-label'),safe:r.x>=59&&r.right<=innerWidth-59&&r.bottom<=innerHeight-21,hit:!!hit&&(hit===e||e.contains(hit))}}))
  for(const control of controls){expect(control.safe,control.label??'Controlo').toBe(true);expect(control.hit,control.label??'Controlo').toBe(true)}
 }
 await page.getByRole('cell',{name:'Cliente Demonstração Alfa',exact:true}).first().dblclick()
 await expect(page.getByRole('dialog',{name:'Cliente Demonstração Alfa',exact:true})).toBeVisible()
})

test('âmbito partilhado combina dimensões, restaura histórico e conserva notas integrais',async({page},info)=>{
 await page.goto('/?qa-iphone=1&qa-role=admin&workflow=preview&view=work')
 const scope=page.getByRole('region',{name:'Filtros partilhados'}),table=page.getByRole('table',{name:'Registos de trabalho'})
 await scope.getByLabel('Filtrar sociedade').selectOption('00000000-0000-4000-8000-000000000002')
 await scope.getByLabel('Filtrar responsável').selectOption('00000000-0000-4000-8000-000000000010')
 const clientType=scope.getByLabel('Filtrar tipo de cliente')
 await expect(clientType.locator('option')).toHaveText(['Todos','PARTICULARES','EMPRESAS','MISTOS'])
 await clientType.selectOption('individual')
 await expect(clientType.locator('option:checked')).toHaveText('PARTICULARES')
 await expect(table).toContainText('Consulta e preparação de processo');await expect(table).not.toContainText('Reunião de acompanhamento')
 await expect.poll(()=>searchCalls.some(args=>args.p_professional_id==='00000000-0000-4000-8000-000000000010'&&args.p_billing_entity_id==='00000000-0000-4000-8000-000000000002'&&args.p_client_type==='individual')).toBe(true)
 await page.reload();await expect(table).toContainText('Consulta e preparação de processo')
 await scope.getByLabel('Filtrar responsável').selectOption('00000000-0000-4000-8000-000000000011');await expect(table).toContainText('Análise documental');await expect(table).not.toContainText('Consulta e preparação de processo')
 await page.goBack();await expect(table).toContainText('Consulta e preparação de processo')
 const url=new URL(page.url());url.searchParams.set('view','payments');await page.goto(url.toString())
 await expect.poll(()=>scopeCalls.some(call=>call.rpc==='get_workflow_payment_queue'&&call.args.p_scope_client_type==='individual')).toBe(true)
 await page.getByRole('button',{name:/Notas de honorários não pagas/}).click()
 await expect(page.getByRole('table',{name:'Notas de honorários não pagas'})).toContainText('Nota integral simulada')
 await expect(page.getByRole('table',{name:'Notas de honorários não pagas'})).toContainText('999,99')
 expect(writes).toEqual([])
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
 await page.screenshot({path:`output/workflow-integration/${info.project.name}-shared-scope.png`})
 await scope.getByRole('button',{name:'Limpar âmbito'}).click();expect(new URL(page.url()).searchParams.has('scopeSociety')).toBe(false)
 url.searchParams.set('view','work');url.searchParams.delete('scopeSociety');url.searchParams.delete('scopeProfessional');url.searchParams.delete('scopeClientType');await page.goto(url.toString())
 await expect(table).toContainText('Consulta e preparação de processo');await expect(table).toContainText('Reunião de acompanhamento')
})

test('falta da consulta financeira filtrada apresenta erro sem resultados globais',async({page})=>{
 let globalCalls=0
 await page.route('**/rest/v1/rpc/*',async route=>{
  const rpc=new URL(route.request().url()).pathname.split('/').at(-1)
  if(rpc==='get_payment_queue')globalCalls++
  if(rpc==='get_workflow_payment_queue')return route.fulfill({status:404,contentType:'application/json',body:JSON.stringify({code:'PGRST202',message:'Missing synthetic scope RPC'})})
  return route.fallback()
 })
 await page.goto('/?qa-iphone=1&qa-role=admin&workflow=preview&view=payments&scopeClientType=company')
 await expect(page.getByRole('alert')).toContainText('Não foram apresentados resultados globais')
 expect(globalCalls).toBe(0);expect(writes).toEqual([])
})

test('parâmetros inválidos e falta da consulta do resumo são bloqueados',async({page})=>{
 await page.goto('/?qa-iphone=1&qa-role=admin&workflow=preview&view=work&scopeSociety=LEGALTEAM')
 await expect(page.getByRole('alert')).toContainText('inválido');expect(searchCalls).toEqual([])
 await page.getByRole('button',{name:'Limpar âmbito'}).click();await expect(page.getByRole('table',{name:'Registos de trabalho'})).toBeVisible()
 await page.route('**/rest/v1/rpc/get_workflow_dashboard_overview',route=>route.fulfill({status:404,contentType:'application/json',body:JSON.stringify({code:'PGRST202',message:'Missing synthetic dashboard scope'})}))
 await page.goto('/?qa-iphone=1&qa-role=admin&workflow=preview&view=overview&scopeClientType=individual')
 await expect(page.getByRole('alert')).toContainText('Não foram apresentados resultados globais')
 await expect(page.getByRole('heading',{name:'Visão Geral',exact:true})).toHaveCount(0)
})

test('categoria da lista preserva âmbito e os clientes excluídos regressam ao limpar',async({page})=>{
 await page.goto('/?qa-iphone=1&qa-role=admin&workflow=preview&view=clients&scopeClientType=individual')
 await expect(page.getByText('Cliente Demonstração Alfa',{exact:true}).first()).toBeVisible();await expect(page.getByText('Cliente Demonstração Beta',{exact:true})).toHaveCount(0)
 await page.getByRole('button',{name:'PARTICULARES',exact:true}).click();expect(new URL(page.url()).searchParams.get('scopeClientType')).toBe('individual')
 await page.getByRole('region',{name:'Filtros partilhados'}).getByRole('button',{name:'Limpar âmbito'}).click()
 const url=new URL(page.url());url.searchParams.delete('clientType');url.searchParams.set('qa-iphone','1');url.searchParams.set('qa-role','admin');await page.goto(url.toString())
 await expect(page.getByText('Cliente Demonstração Beta',{exact:true}).first()).toBeVisible();expect(writes).toEqual([])
})

test('cliente misto intersecta vertente, pagina todos os registos e conserva cliente explícito',async({page})=>{
 const fixture=createQaAllocationData(),base=fixture('search_work_entries','',{},new URL('http://127.0.0.1'),'POST',false) as {items:Array<Record<string,unknown>>;professionals:unknown[];billingEntities:unknown[]}
 const alpha='00000000-0000-4000-8000-000000000020',beta='00000000-0000-4000-8000-000000000021'
 const items=base.items.map((item,index)=>index===1?{...item,client_type:'company'}:item)
 const scoped=(args:Record<string,unknown>)=>items.filter(item=>(!args.p_client_id||item.client_id===args.p_client_id)&&(!args.p_client_type||item.client_type===args.p_client_type))
 await page.route('**/rest/v1/client_profiles?*',route=>route.fulfill({contentType:'application/json',body:JSON.stringify([{client_id:alpha,client_type:'individual'},{client_id:alpha,client_type:'company'},{client_id:beta,client_type:'company'}])}))
 await page.route('**/rest/v1/rpc/*',async route=>{
  const rpc=new URL(route.request().url()).pathname.split('/').at(-1),args=route.request().postDataJSON()
  if(rpc==='search_work_entries'){
   searchCalls.push(args);const all=scoped(args),offset=Number(args.p_page??1)-1
   return route.fulfill({contentType:'application/json',body:JSON.stringify({...base,items:all.slice(offset,offset+1),total:all.length,pageSize:1})})
  }
  if(rpc==='get_work_attention_counts')return route.fulfill({contentType:'application/json',body:JSON.stringify({uninvoiced:scoped(args).length,unpaid:0})})
  if(rpc==='get_work_attention_summaries')return route.fulfill({contentType:'application/json',body:JSON.stringify({uninvoiced:{count:scoped(args).length,minutes:scoped(args).reduce((sum,item)=>sum+Number(item.duration_minutes),0),priced:scoped(args).length,amount:scoped(args).reduce((sum,item)=>sum+Number(item.effective_amount),0)}})})
  return route.fallback()
 })
 await page.goto('/?qa-iphone=1&qa-role=admin&workflow=preview&view=work&scopeClientType=mixed&clientType=individual')
 const table=page.getByRole('table',{name:'Registos de trabalho'})
 await expect(table).toContainText('Consulta e preparação de processo');await expect(table).toContainText('Preparação de requerimento');await expect(table).not.toContainText('Análise documental');await expect(table).not.toContainText('Reunião de acompanhamento')
 await expect.poll(()=>searchCalls.some(args=>args.p_client_id===alpha&&args.p_client_type==='individual'&&args.p_page===2)).toBe(true)
 await page.reload();await expect(table).toContainText('Preparação de requerimento')
 await page.goto('/?qa-iphone=1&qa-role=admin&workflow=preview&view=work&scopeClientType=mixed&clientId='+beta)
 await expect(table).not.toContainText('Consulta e preparação de processo');await expect(table).not.toContainText('Reunião de acompanhamento');expect(writes).toEqual([])
})

test('gráficos e dashboards partilham filtros e abrem os movimentos correspondentes',async({page},info)=>{
 const params='qa-iphone=1&qa-role=admin&workflow=preview&scopeSociety=00000000-0000-4000-8000-000000000002&scopeProfessional=00000000-0000-4000-8000-000000000012&scopeClientType=individual'
 await page.goto('/?view=overview&'+params)
 await expect(page.locator('article').filter({hasText:'Valor trabalhado'})).toContainText('500,00')
 await page.getByRole('button',{name:'Abrir LEGALTEAM · Valor por sociedade',exact:true}).click()
 await expect.poll(()=>scopeCalls.some(call=>call.rpc==='get_workflow_entity_dashboard_rolling'&&call.args.p_scope_professional_id==='00000000-0000-4000-8000-000000000012'&&call.args.p_kind==='billing')).toBe(true)
 await expect(page.locator('article').filter({hasText:'Valor Trabalhado'}).first()).toContainText('500,00')
 await page.getByRole('link',{name:'Abrir movimentos de Não Facturados',exact:true}).click()
 const table=page.getByRole('region',{name:'Resultados do acompanhamento',exact:true}).getByRole('table',{name:'Registos de trabalho'})
 await expect(table).toContainText('Preparação de requerimento');await expect(table).not.toContainText('Reunião de acompanhamento');await expect(table).not.toContainText('Consulta e preparação de processo')
 await page.goto('/?view=clients&clientType=individual&clientMode=dashboard&'+params)
 await expect.poll(()=>scopeCalls.some(call=>call.rpc==='get_workflow_client_category_dashboard'&&call.args.p_client_type==='individual')).toBe(true)
 await expect(page.locator('article').filter({hasText:'Valor total'}).first()).toContainText('500,00')
 await page.goto('/?view=professionals&'+params)
 await expect.poll(()=>scopeCalls.some(call=>call.rpc==='get_workflow_professional_landing_summaries')).toBe(true)
 await expect(page.getByRole('heading',{name:'Paula Chaves',exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'Carina Santos',exact:true})).toHaveCount(0)
 expect(writes).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
 await page.screenshot({path:`output/workflow-integration/${info.project.name}-scoped-dashboard.png`})
})

test('dívida e ficha conservam os valores e movimentos integrais do cliente seleccionado',async({page})=>{
 const debtor=(id:string,name:string,retainerAmount:number,uninvoicedAmount:number)=>({id,name,code:'QA',unpaidCount:0,unpaidMinutes:0,unpaidAmount:0,unpaidPartial:false,uninvoicedCount:1,uninvoicedMinutes:150,uninvoicedAmount,uninvoicedPartial:false,retainerCount:1,retainerAmount,retainerPendingCount:0,retainerPendingAmount:0,oldestDate:'2026-08-01',oldestKind:'avença',oldestInvoiceDate:null})
 await page.route('**/rest/v1/rpc/get_receivable_client_summary',route=>route.fulfill({contentType:'application/json',body:JSON.stringify([debtor('00000000-0000-4000-8000-000000000020','Cliente Demonstração Alfa',1200,500),debtor('00000000-0000-4000-8000-000000000021','Cliente Demonstração Beta',900,200)])}))
 const params='qa-iphone=1&qa-role=admin&workflow=preview&scopeProfessional=00000000-0000-4000-8000-000000000010&scopeClientType=individual'
 await page.goto('/?view=debtors&'+params)
 await expect(page.getByText('Cliente Demonstração Alfa',{exact:true})).toBeVisible();await expect(page.getByText('Cliente Demonstração Beta',{exact:true})).toHaveCount(0)
 await expect(page.getByText(/1[.\s]?200,00/).first()).toBeVisible();await expect(page.getByText('500,00',{exact:false}).first()).toBeVisible()
 await page.goto('/?view=overview&'+params)
 await expect(page.locator('article').filter({hasText:'Total por receber'})).toContainText(/1[.\s]?700,00/)
 await expect(page.locator('article').filter({hasText:'Valor trabalhado'})).toContainText('600,00')
 await page.goto('/?view=clients&clientType=individual&clientMode=list&'+params)
 await openFromList(page)
 const dialog=page.getByRole('dialog',{name:'Cliente Demonstração Alfa',exact:true})
 await expect(page.getByRole('region',{name:'Filtros partilhados'}).getByLabel('Filtrar responsável')).toBeDisabled()
 await dialog.getByRole('navigation',{name:'Grupos da ficha do cliente'}).getByRole('button',{name:'Trabalho',exact:true}).click()
 const table=dialog.getByRole('table',{name:'Registos de trabalho'})
 for(const text of ['Consulta e preparação de processo','Análise documental','Preparação de requerimento'])await expect(table).toContainText(text)
 await expect(dialog.getByText('A ficha conserva todos os dados e movimentos deste cliente.',{exact:false})).toBeVisible()
 await dialog.locator('[data-close-record]').first().click()
 await expect(page.getByRole('region',{name:'Filtros partilhados'}).getByLabel('Filtrar responsável')).toBeEnabled()
 expect(writes).toEqual([])
})
