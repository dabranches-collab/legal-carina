import {test,expect,type Page} from '@playwright/test'
import {createQaAllocationData} from '../src/lib/qaAllocationData'

const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`
async function mock(page:Page){
 const fixture=createQaAllocationData(),requests:Array<Record<string,unknown>>=[]
 await page.route('**/rest/v1/**',async route=>{
  const request=route.request(),url=new URL(request.url()),rpc=url.pathname.match(/\/rpc\/([^/]+)/)?.[1],args=request.method()==='POST'?request.postDataJSON():{}
  let result=fixture(rpc,url.pathname.split('/').at(-1)??'',args,url,request.method(),request.headers().accept?.includes('vnd.pgrst.object')??false)
  if(rpc==='get_entity_dashboard_rolling'||rpc==='get_client_category_dashboard'){
   const base=fixture('get_entity_dashboard_rolling','',args,url,'POST',false) as Record<string,unknown>
   result={...base,selectedId:args.p_kind==='professional'?id(10):id(2),metrics:{...(base.metrics as object),uninvoicedCount:2,unpaidCount:1,uncollectibleCount:1,missingPrice:1}}
  }
  if(rpc==='get_attention_work_entries'||rpc==='get_uncollectible_work_entries'){
   requests.push(args)
   const base=fixture('search_work_entries','',args,url,'POST',false) as {items:Array<Record<string,unknown>>}
   result={...base,items:base.items.slice(0,1),total:1}
  }
  if(rpc==='get_client_category_summaries')result=[{category:'individual',clients:1,movements:4,minutes:600,total:2000,invoiced:1300}]
  if(rpc==='get_dashboard_overview')result={metrics:{minutes:600,worked:2000,invoiced:1300,paid:1000,receivable:300,uninvoicedCount:2,unpaidCount:1,uncollectibleCount:1,uncollectibleValue:100,averageRate:200,activeClients:2,missingPrice:1,missingBilling:1,overrides:0,importErrors:0},annual:[],monthly:[],monthlyByYear:[],billingAnnual:[],billingMonthly:[],byClient:[],byBilling:[],byProfessional:[],byArchive:[],clientTypes:[],latestYear:2026}
  await route.fulfill({contentType:'application/json',body:JSON.stringify(result)})
 })
 return requests
}

for(const entry of [
 {view:'billing&society=LEGALTEAM',scope:'p_billing_entity_id',value:id(2),landing:false},
 {view:'professionals&professional=Carina',scope:'p_professional_id',value:id(10),landing:false},
 {view:'clients&clientType=individual',scope:'p_client_type',value:'individual',landing:false},
 {view:'billing',scope:'p_billing_entity_id',value:id(2),landing:true},
 {view:'professionals',scope:'p_professional_id',value:id(10),landing:true},
 {view:'clients',scope:'p_client_type',value:'individual',landing:true},
])test(`acompanhamento no mesmo menu e âmbito: ${entry.view}`,async({page})=>{
 const requests=await mock(page)
 await page.goto(`/?qa-iphone=1&qa-role=admin&view=${entry.view}`)
 const origin=page.url()
 const link=entry.landing?page.getByRole('link',{name:'Abrir tabela →'}).first():page.getByRole('link',{name:/Abrir movimentos de Não Facturados/i})
 await link.click()
 const results=page.getByRole('region',{name:'Resultados do acompanhamento',exact:true})
 await expect(results.getByRole('table',{name:'Registos de trabalho'})).toContainText('Consulta e preparação de processo')
 await expect(page).toHaveURL(origin);await expect(results).toBeFocused()
 expect(requests.at(-1)?.[entry.scope]).toBe(entry.value)
 await results.getByRole('cell',{name:'Consulta e preparação de processo',exact:true}).dblclick()
 const dialog=page.getByRole('dialog',{name:'Editar movimento',exact:true})
 await expect(dialog.getByRole('textbox',{name:'Actividade',exact:true})).toBeVisible()
 expect((await dialog.getByRole('textbox',{name:'Actividade',exact:true}).boundingBox())!.height).toBe(192)
 expect((await dialog.getByRole('textbox',{name:'Observações',exact:true}).boundingBox())!.height).toBe(64)
 await dialog.getByRole('button',{name:'Fechar',exact:true}).click();await expect(page).toHaveURL(origin)
 await results.getByRole('button',{name:'Fechar resultados'}).click();await expect(results).toHaveCount(0);await expect(page).toHaveURL(origin)
})

test('Visão Geral mantém navegação para Registos',async({page})=>{
 await mock(page);await page.goto('/?qa-iphone=1&qa-role=admin&view=overview')
 await page.getByRole('link',{name:'Abrir movimentos de Não facturados',exact:true}).click()
 await expect(page).toHaveURL(/view=work/);await expect(page.getByRole('region',{name:'Resultados do acompanhamento'})).toHaveCount(0)
})

for(const width of [320,390,768,1440])test(`barra, resumos e caixas de escrita ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});await mock(page)
 await page.goto('/?qa-iphone=1&qa-role=admin&view=billing&society=LEGALTEAM')
 const pair=page.locator('.dashboard-summary-pair'),summary=pair.locator(':scope > section').first(),attention=pair.locator(':scope > section').last()
 await expect(summary).toBeVisible();await expect(attention).toBeVisible()
 await expect(page.getByRole('combobox',{name:'Seleccionar sociedade'})).toHaveCount(0)
 await expect(page.getByRole('heading',{name:'LEGALTEAM',exact:true})).toHaveCount(0)
 expect((await page.locator('.app-shell-header').boundingBox())!.height).toBeGreaterThanOrEqual(156)
 if(width===1440){expect(Math.abs((await summary.boundingBox())!.height-(await attention.boundingBox())!.height)).toBeLessThan(2)}
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
 await page.getByRole('button',{name:'Activar modo escuro'}).click()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
})

