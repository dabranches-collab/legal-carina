import {test,expect} from '@playwright/test'
import {createQaAllocationData} from '../src/lib/qaAllocationData'
test.skip(process.env.WORKFLOW_ISOLATED_E2E!=='1','Requer playwright.workflow.config.ts para bloquear serviços reais.')
let forbidden:string[]
let searchCalls: Record<string,unknown>[]
test.beforeEach(async({context,request})=>{
 for(const path of ['/supabase-api/auth/v1/user','/supabase-functions/v1/test','/api/document-translation']){const response=await request.get(path);expect(response.status()).toBe(403);expect(await response.text()).toBe('Blocked by isolated setup')}
 forbidden=[];searchCalls=[];const fixture=createQaAllocationData()
 await context.addInitScript(()=>localStorage.setItem('carina-release-notes-seen','0.16.0'))
 await context.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url())
  if(url.origin==='http://127.0.0.1:54321'&&url.pathname.startsWith('/rest/v1/')){
   const rpc=url.pathname.match(/\/rpc\/([^/]+)/)?.[1],table=url.pathname.split('/').at(-1)??'',args=request.method()==='POST'?request.postDataJSON():{}
   let result=fixture(rpc,table,args,url,request.method(),request.headers().accept?.includes('vnd.pgrst.object')??false)
   if(rpc==='search_work_entries'){
    searchCalls.push(args)
    const base=result as {items:Array<{professional_id:string;billing_entity_id:string;client_type:string;client_id:string}>;total:number}
    const items=base.items.filter(item=>(!args.p_professional_id||item.professional_id===args.p_professional_id)&&(!args.p_billing_entity_id||item.billing_entity_id===args.p_billing_entity_id)&&(!args.p_client_type||item.client_type===args.p_client_type)&&(!args.p_client_id||item.client_id===args.p_client_id))
    result={...base,items,total:items.length}
   }
   if(rpc==='get_attention_work_entries'){
    const base=fixture('search_work_entries',table,args,url,'POST',false) as {items:Array<{client_id:string;is_invoiced:boolean;is_paid:boolean}>;total:number}
    const items=base.items.filter(item=>(!args.p_client_id||item.client_id===args.p_client_id)&&(args.p_kind==='uninvoiced'?!item.is_invoiced:args.p_kind==='unpaid'?item.is_invoiced&&!item.is_paid:false))
    result={...base,items,total:items.length}
   }
   return route.fulfill({contentType:'application/json',body:JSON.stringify(result)})
  }
  if(url.origin==='http://127.0.0.1:5173'&&!/^\/(supabase-api|supabase-functions|api\/document-translation)/.test(url.pathname))return route.continue()
  forbidden.push(url.origin+url.pathname);return route.abort('blockedbyclient')
 })
 await context.routeWebSocket(/.*/,socket=>socket.close())
})
test.afterEach(()=>expect(forbidden,'Nenhum serviço real ou pedido sem mock').toEqual([]))
async function openFromList(page:import('@playwright/test').Page){
 if((page.viewportSize()?.width??1440)<900){await page.getByRole('button',{name:'Caixas',exact:true}).click();await page.getByRole('list',{name:'Lista de Particulares em caixas'}).getByRole('button',{name:'Ficha',exact:true}).first().click()}
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
 await page.getByRole('button',{name:'Particulares',exact:true}).click()
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
