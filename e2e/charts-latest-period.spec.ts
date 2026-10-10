import { expect, test } from '@playwright/test'
import { createQaAllocationData } from '../src/lib/qaAllocationData'

for (const viewport of [{width:320,height:568},{width:390,height:844},{width:844,height:390},{width:1280,height:720}]) {
 for (const theme of ['light','dark']) test(`último período ${viewport.width}×${viewport.height} ${theme}`, async ({page}) => {
  await page.setViewportSize(viewport)
  const fixture=createQaAllocationData()
  const annual=Array.from({length:9},(_,i)=>({label:2018+i,value:100+i*10,minutes:60}))
  const monthly=Array.from({length:12},(_,i)=>({label:`2026-${String(i+1).padStart(2,'0')}`,value:100+i*10}))
  await page.route('**/rest/v1/**',async route=>{
   const request=route.request(),url=new URL(request.url())
   const rpc=url.pathname.match(/\/rpc\/([^/]+)/)?.[1]?.replace('get_workflow_','get_')
   const table=url.pathname.split('/').at(-1)??''
   const single=request.headers().accept?.includes('vnd.pgrst.object')??false
   const args=request.method()==='POST'?request.postDataJSON():{}
   let result:unknown=fixture(rpc,table,args,url,request.method(),single)
   if(table==='firm_members')result=single?{firm_id:'00000000-0000-4000-8000-000000000001',role:'owner'}:[{firm_id:'00000000-0000-4000-8000-000000000001',role:'owner'}]
   if(rpc==='get_dashboard_overview')result={metrics:{minutes:600,worked:2000,invoiced:1300,paid:1000,receivable:300,uninvoicedCount:2,unpaidCount:1,uncollectibleCount:0,uncollectibleValue:0,averageRate:200,activeClients:2,missingPrice:0,missingBilling:0,overrides:0,importErrors:0},annual,monthly,monthlyByYear:[],billingAnnual:annual.map(p=>({society:'LEGALTEAM',year:p.label,value:p.value})),billingMonthly:[],byClient:[],byBilling:[],byProfessional:[],byArchive:[],clientTypes:[],latestYear:2026}
   if(rpc==='get_entity_dashboard_rolling'||rpc==='get_client_category_dashboard')result={...fixture('get_entity_dashboard_rolling','',args,url,'POST',false),annual,monthly}
   await route.fulfill({contentType:'application/json',body:JSON.stringify(result)})
  })
  for(const view of ['overview','billing&society=LEGALTEAM','professionals&professional=Carina','clients&clientType=individual']){
   await page.goto(`/?qa-iphone=1&qa-role=owner&theme=${theme}&view=${view}`)
   const monthlyScroll=page.locator('[data-chart-title="Valor por mês"] [data-chart-period-scroll]')
   await expect(monthlyScroll).toHaveCount(1)
   for(const scroller of await page.locator('[data-chart-period-scroll]').all()){
    if(await scroller.evaluate(e=>getComputedStyle(e).overflowX==='auto'))await expect.poll(()=>scroller.evaluate(e=>Math.abs(e.scrollWidth-e.clientWidth-e.scrollLeft))).toBeLessThanOrEqual(1)
   }
   if(await monthlyScroll.evaluate(e=>getComputedStyle(e).overflowX==='auto'&&e.scrollWidth>e.clientWidth)){
    await monthlyScroll.dispatchEvent('pointerdown')
    await monthlyScroll.evaluate(e=>{e.scrollLeft=0})
    await expect(monthlyScroll).toHaveJSProperty('scrollLeft',0)
   }
   const toggle=page.locator('[data-chart-title="Valor por mês"]').getByRole('button',{name:/Por /})
   if(await toggle.count()){
    await toggle.click()
    if(await monthlyScroll.evaluate(e=>getComputedStyle(e).overflowX==='auto'))await expect.poll(()=>monthlyScroll.evaluate(e=>Math.abs(e.scrollWidth-e.clientWidth-e.scrollLeft))).toBeLessThanOrEqual(1)
   }
   await page.waitForLoadState('networkidle')
  }
 })
}
