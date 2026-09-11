import {test,expect} from '@playwright/test'
import {createQaAllocationData} from '../src/lib/qaAllocationData'

test('7235 registos recuperam de falha de rede com consultas curtas e despesas completas',async({page})=>{
 const fixture=createQaAllocationData();let failed=false,lookups=0,maxIds=0
 await page.route('**/rest/v1/**',async route=>{
  const req=route.request(),url=new URL(req.url()),rpc=url.pathname.match(/\/rpc\/([^/]+)/)?.[1],args=req.method()==='POST'?req.postDataJSON():{}
  let result=fixture(rpc,url.pathname.split('/').at(-1)??'',args,url,req.method(),false)
  if(rpc==='search_work_entries'){
   if(!failed){failed=true;await route.abort('failed');return}
   const sample=(result as {items:Record<string,unknown>[]}).items[0]
   const pageSize=Number(args.p_page_size),offset=(Number(args.p_page)-1)*pageSize
   result={...(result as object),pageSize,total:7235,items:Array.from({length:Math.min(pageSize,7235-offset)},(_,i)=>({...sample,id:`10000000-0000-4000-8000-${String(offset+i).padStart(12,'0')}`,billing_scope:undefined}))}
  }
  for(const [name,value]of url.searchParams)if((name==='id'||name==='work_entry_id')&&value.startsWith('in.(')){
   lookups++;const ids=value.slice(4,-1).split(',');maxIds=Math.max(maxIds,ids.length)
   expect(req.url().length).toBeLessThan(4096)
   if(url.pathname.endsWith('/work_entries'))result=ids.map(id=>({id,billing_scope:'standard'}))
   else if(url.pathname.endsWith('/work_entry_expenses'))result=[]
  }
  await route.fulfill({contentType:'application/json',body:JSON.stringify(result)})
 })
 await page.goto('/?qa-iphone=1&qa-role=admin&view=work')
 await expect(page.getByText('7235 movimentos acessíveis')).toBeVisible()
 await expect(page.getByRole('status').filter({hasText:'7235 registos de 7235'})).toBeVisible()
 await expect(page.getByRole('alert')).toHaveCount(0)
 expect(failed).toBe(true);expect(lookups).toBeGreaterThan(80);expect(maxIds).toBeLessThanOrEqual(80)
})
