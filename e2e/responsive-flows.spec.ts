// Import the full workflow contracts and their isolated synthetic fixture.
import {syntheticCorsHeaders,settleReads} from './workflow-integration.spec'
import {test,expect,type Locator} from '@playwright/test'
import packageJson from '../package.json' with {type:'json'}
import {createQaAllocationData} from '../src/lib/qaAllocationData'

async function usable(control:Locator){
 await expect(async()=>{
  // A partially visible control can still sit under the floating scrollbar.
  // Centre it by ordinary scrolling before checking whether a user can tap it.
  await control.evaluate(e=>e.scrollIntoView({block:'center',inline:'center',behavior:'instant'}))
  await expect(control).toBeInViewport()
  expect(await control.evaluate(e=>{const r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return !!hit&&(hit===e||e.contains(hit))}),'Acção acessível por clique/toque, sem sobreposição').toBe(true)
 }).toPass({timeout:8000,intervals:[100,250,500]})
}
async function activate(control:Locator){
 await usable(control)
 if(test.info().project.use.hasTouch)await control.tap()
 else await control.click()
}

test('recebimento parcial mantém o saldo e abre a ficha em todas as resoluções',async({page})=>{
 let item={id:'00000000-0000-4000-8000-000000000080',category:'note',client_id:'00000000-0000-4000-8000-000000000020',client_name:'Cliente Demonstração Alfa',society_name:'LEGALTEAM',date:'2026-10-01',currency:'EUR',total:123,received:10,deducted:20,remaining:93,token:'synthetic-v1',can_pay:true,can_edit:false,status:'Por receber',title:'NH-QA',revision:1}
 const calls:Record<string,unknown>[]=[]
 await page.route('**/rest/v1/rpc/*',async route=>{
  const rpc=new URL(route.request().url()).pathname.split('/').at(-1)
  if(!['get_payment_queue','get_workflow_payment_queue','get_payment_detail','record_pending_payment'].includes(rpc??''))return route.fallback()
  let data:unknown=[item]
  if(rpc==='get_payment_detail')data={item,receipts:[],items:[]}
  if(rpc==='record_pending_payment'){const args=route.request().postDataJSON();calls.push(args);item={...item,received:30,remaining:73,token:'synthetic-v2'};data={id:'synthetic-receipt'}}
  await route.fulfill({headers:syntheticCorsHeaders,contentType:'application/json',body:JSON.stringify(data)})
 })
 await settleReads(page);await page.goto('/?qa-iphone=1&qa-role=admin&workflow=preview&view=payments')
 await page.getByRole('button',{name:/Notas de honorários não pagas/}).click()
 const region=page.getByRole('region',{name:'Notas de honorários não pagas'})
 await expect(region).toContainText('93,00')
 await region.getByRole('button',{name:'Abrir detalhe de NH-QA',exact:true}).click()
 const dialog=page.getByRole('dialog',{name:'NH-QA'})
 await dialog.getByLabel('Valor recebido',{exact:true}).fill('20,00')
 await dialog.getByLabel('Referência / motivo').fill('Recebimento exclusivamente sintético')
 await dialog.getByRole('checkbox',{name:/Confirmo/}).check()
 const save=dialog.getByRole('button',{name:'Registar pagamento',exact:true})
 await activate(save)
 await expect(dialog).toHaveCount(0);await expect(region).toContainText('73,00')
 expect(calls).toHaveLength(1);expect(calls[0]).toMatchObject({p_amount:20})
 await region.getByRole('button',{name:'Abrir detalhe de NH-QA',exact:true}).click()
 await expect(dialog.getByLabel('Valor recebido',{exact:true})).toHaveValue('73')
 await activate(dialog.getByRole('button',{name:'Cancelar',exact:true}))
 expect(calls).toHaveLength(1)
})

test('formulários de registo, despesa, cliente e nota mantêm fecho acessível',async({page})=>{
 await settleReads(page);await page.goto('/?qa-iphone=1&qa-demo=1&qa-allocation=1&qa-role=admin&workflow=preview&view=work')
 for(const [name,title] of [['Criar novo registo','Criar movimento'],['Criar nova despesa','Nova despesa'],['Criar novo cliente','Criar cliente']]){
  await page.getByRole('button',{name,exact:true}).click()
  const dialog=page.getByRole('dialog',{name:title,exact:true})
  await expect(dialog).toBeVisible()
  const close=dialog.getByRole('button',{name:/^(Cancelar|Fechar)$/}).first()
  await usable(close);await close.click();await expect(dialog).toHaveCount(0)
 }
 await settleReads(page);await page.goto('/?qa-iphone=1&qa-demo=1&qa-role=admin&workflow=preview&view=notes')
 await page.getByRole('button',{name:'+ Nova nota',exact:true}).click()
 const dialog=page.getByRole('dialog',{name:'Criar nota'})
 await dialog.getByRole('button',{name:'+ Adicionar item'}).click()
 await expect(dialog.getByLabel('Item 1',{exact:true})).toBeVisible()
 await usable(dialog.getByRole('button',{name:'Cancelar',exact:true}));await dialog.getByRole('button',{name:'Cancelar',exact:true}).click()
 await expect(dialog).toHaveCount(0)
})

test('avença anual conserva 32 horas e preço do excedente na edição',async({page})=>{
 const terms={id:'synthetic-annual-retainer',firm_id:'synthetic-firm',client_id:'00000000-0000-4000-8000-000000000020',billing_entity_id:'00000000-0000-4000-8000-000000000002',active:true,monthly_amount:100,currency:'EUR',starts_on:'2026-01-01',ends_on:null,reference_hourly_rate:null,included_hours:32,billing_interval_months:1,hours_interval_months:12,billing_mode:'retainer',excess_hourly_rate:null,notes:null}
 const changes:Record<string,unknown>[]=[]
 await page.route('**/rest/v1/**',async route=>{
  const request=route.request(),table=new URL(request.url()).pathname.split('/').at(-1)
  if(table==='client_retainers'){
   if(request.method()==='PATCH'){const args=request.postDataJSON();changes.push(args);Object.assign(terms,args)}
   return route.fulfill({headers:syntheticCorsHeaders,json:[terms]})
  }
  if(table==='get_client_retainer_summary')return route.fulfill({headers:syntheticCorsHeaders,json:{minutes:1905,movements:50,chargesTotal:0,invoiced:0,paid:0,periods:0,pendingPeriods:0,unpaidPeriods:0,effectiveHourlyRate:null}})
  return route.fallback()
 })
 await settleReads(page);await page.goto('/?qa-iphone=1&qa-role=admin&workflow=preview&view=clients&clientType=individual&clientMode=list&clientLayout=table')
 if(test.info().project.use.hasTouch)await activate(page.getByRole('button',{name:'Abrir ficha',exact:true}).first())
 else await page.getByRole('cell',{name:'Cliente Demonstração Alfa',exact:true}).dblclick()
 const dialog=page.getByRole('dialog',{name:'Cliente Demonstração Alfa',exact:true})
 await dialog.getByRole('button',{name:'Contratos',exact:true}).click()
 await dialog.getByRole('button',{name:'Avença',exact:true}).click()
 await dialog.getByText('Abrir condições e edição da avença',{exact:true}).click()
 await dialog.getByLabel('Modalidade da avença').selectOption('retainer_plus_hours')
 await dialog.getByLabel('Preço/hora do excedente').fill('150')
 await expect(dialog.getByLabel('Período de controlo das horas')).toHaveValue('12')
 await expect(dialog.getByLabel('Horas incluídas por período (opcional)')).toHaveValue('32')
 const save=dialog.getByRole('button',{name:'Guardar esta condição da avença'})
 await activate(save)
 await expect.poll(()=>changes.length).toBe(1)
 expect(changes[0]).toMatchObject({billing_mode:'retainer_plus_hours',included_hours:32,hours_interval_months:12,excess_hourly_rate:150})
})

test('aviso da versão pode ser fechado antes de usar os formulários',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('carina-release-notes-seen','0.16.0'))
 await settleReads(page);await page.goto('/?qa-iphone=1&qa-role=admin&workflow=preview&view=overview')
 const notice=page.getByRole('status',{name:'Alterações da versão instalada'})
 await expect(notice).toContainText(packageJson.version)
 const close=notice.getByRole('button',{name:'Fechar alterações',exact:true})
 await usable(close);await close.click();await expect(notice).toHaveCount(0)
 await usable(page.getByRole('button',{name:'Criar nova despesa',exact:true}))
 await page.getByRole('button',{name:'Criar nova despesa',exact:true}).click()
 await expect(page.getByRole('dialog',{name:'Nova despesa'})).toBeVisible()
})

test('pré-visualização de honorários em PT, EN e FR cabe no ecrã sem emissão',async({page})=>{
 test.setTimeout(90000)
 await page.addInitScript(()=>localStorage.setItem('legal-carina-auth',JSON.stringify({access_token:'synthetic-token',refresh_token:'synthetic-refresh',expires_at:4102444800,token_type:'bearer',user:{id:'00000000-0000-4000-8000-000000000090'}})))
 let saves=0
 const languages:string[]=[]
 page.on('request',request=>{if(request.url().includes('/rpc/save_honorarium_document'))saves++})
 await page.route('**/rest/v1/rpc/get_client_document_action_flags',route=>route.fulfill({headers:syntheticCorsHeaders,json:[{client_id:'00000000-0000-4000-8000-000000000020',has_uninvoiced:true,has_unpaid:true}]}))
 await page.route('**/api/document-translation',route=>{
  const input=route.request().postDataJSON();languages.push(input.language??input.targetLanguage??input.target)
  return route.fulfill({headers:syntheticCorsHeaders,json:{items:input.items.map((item:Record<string,unknown>)=>({...item,text:'Tradução sintética para QA'}))}})
 })
 await settleReads(page);await page.goto('/?qa-iphone=1&qa-role=admin&workflow=preview&view=clients&clientType=individual&clientMode=list&clientLayout=table')
 await activate(page.getByTitle('Preparar, consultar ou rever notas de honorários deste cliente.').first())
 const dialog=page.locator('[role="dialog"][aria-labelledby="honorarium-title"]')
 await expect(dialog).toBeVisible({timeout:10000})
 await dialog.getByLabel(/Seleccionar todos os/).check()
 for(const language of ['pt','en','fr']){
  await dialog.getByLabel('Idioma do documento').selectOption(language)
  const previewButton=dialog.getByRole('button',{name:'Pré-visualizar sem guardar',exact:true})
  await activate(previewButton)
  const preview=page.getByRole('dialog',{name:'Pré-visualização da nota de honorários'})
  await expect(preview).toContainText('Rascunho sem gravação',{timeout:20000})
  await expect(preview.getByRole('img',{name:'Página 1 da Nota de Honorários'})).toBeVisible({timeout:20000})
  const close=preview.getByRole('button',{name:/Fechar/}).first()
  await activate(close);await expect(preview).toHaveCount(0)
 }
 expect(saves).toBe(0);expect(languages).toEqual(['en','fr'])
})

test('scroll liberta filtros e conserva linhas e cabeçalho da tabela',async({page})=>{
 const fixture=createQaAllocationData(100)
 await page.route('**/rest/v1/rpc/search_work_entries',route=>route.fulfill({headers:syntheticCorsHeaders,json:fixture('search_work_entries','',{},new URL(route.request().url()),'POST',false)}))
 await settleReads(page);await page.goto('/?qa-iphone=1&qa-role=admin&workflow=preview&view=work')
 const region=page.getByRole('region',{name:'Registos de trabalho',exact:true}),header=region.locator('thead')
 await expect(region.getByText('100 registos de 100',{exact:true})).toBeVisible()
 const filters=page.getByRole('region',{name:'Filtros dos registos',exact:true})
 const filterBounds=(await filters.boundingBox())!
 const headerHeight=await page.locator('.app-shell-header').evaluate(e=>e.getBoundingClientRect().height)
 await page.evaluate(top=>window.scrollTo({top,behavior:'instant'}),filterBounds.y+filterBounds.height+headerHeight+150)
 await expect(filters).not.toBeInViewport()
 expect(await region.locator('tbody tr:not([aria-hidden="true"])').evaluateAll((rows,top)=>rows.filter(row=>{const r=row.getBoundingClientRect();return r.top>=top&&r.bottom<=innerHeight-34}).length,headerHeight),'Pelo menos duas linhas completas realmente visíveis').toBeGreaterThanOrEqual(2)
 if((page.viewportSize()?.width??0)<768||(page.viewportSize()?.height??900)<=500){
  const bounds=(await header.boundingBox())!
  await page.evaluate(({y,top})=>window.scrollTo({top:Math.max(0,scrollY+y-top-8),behavior:'instant'}),{y:bounds.y,top:headerHeight})
 }
 const sort=header.getByRole('button',{name:'Data',exact:true})
 await usable(sort);await sort.click()
 await expect(header.locator('th').first()).toHaveAttribute('aria-sort',/ascending|descending/)
 const horizontal=region.locator('.scrollbar-thin.overflow-x-auto')
 await horizontal.evaluate(e=>{e.scrollLeft=500})
 await expect(header).toBeInViewport()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
})
