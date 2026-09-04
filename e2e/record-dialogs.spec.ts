import { test,expect } from '@playwright/test'
import { createQaAllocationData } from '../src/lib/qaAllocationData'

test('prestação abre por duplo clique e só grava a própria prestação na confirmação',async({page})=>{
 const fixture=createQaAllocationData(),writes:string[]=[]
 const retainer={id:'synthetic-retainer',client_id:'00000000-0000-4000-8000-000000000020',firm_id:'synthetic-firm',billing_entity_id:'00000000-0000-4000-8000-000000000001',active:true,monthly_amount:100,currency:'EUR',starts_on:'2026-09-01',ends_on:null,reference_hourly_rate:null,included_hours:10,billing_interval_months:1,hours_interval_months:1,notes:null}
 const charge={id:'synthetic-charge',period_start:'2026-09-01',amount:100,currency:'EUR',status:'pending',invoice_reference:null,invoice_date:null,due_on:null,paid_on:null,notes:null}
 await page.route('**/rest/v1/**',async route=>{
  const request=route.request(),url=new URL(request.url()),table=url.pathname.split('/').at(-1)??'',rpc=url.pathname.match(/\/rpc\/([^/]+)/)?.[1],args=request.method()==='POST'||request.method()==='PATCH'?request.postDataJSON():{}
  if(request.method()==='PATCH'){writes.push(table);if(table==='retainer_charges')Object.assign(charge,args)}
  const result=rpc==='get_retainer_management'?[{client_id:retainer.client_id,client_name:'Cliente Demonstração Alfa',client_code:'02.0001',terms_count:1,current_monthly_amount:100,currency:'EUR',billing_interval_months:1,period_used_minutes:60,covered_minutes:60,pending_amount:100,unpaid_amount:0}]:table==='client_retainers'?[retainer]:table==='retainer_charges'?[charge]:rpc==='get_client_retainer_summary'?{minutes:60,movements:1,chargesTotal:100,invoiced:0,paid:0,periods:1,pendingPeriods:1,unpaidPeriods:0,effectiveHourlyRate:100}:fixture(rpc,table,args,url,request.method(),request.headers().accept?.includes('vnd.pgrst.object')??false)
  await route.fulfill({contentType:'application/json',body:JSON.stringify(result)})
 })
 await page.goto('/?qa-iphone=1&qa-role=admin&view=retainers')
 await page.getByLabel('Pesquisar avenças',{exact:true}).fill('Alfa')
 const origin=page.url()
 await page.getByRole('cell',{name:/Cliente Demonstração Alfa/}).dblclick()
 await expect(page.getByRole('dialog').getByLabel('Angariador do cliente',{exact:true})).toBeVisible()
 await expect(page).toHaveURL(origin)
 await page.getByRole('dialog').getByRole('button',{name:'Fechar',exact:true}).first().click()
 await expect(page).toHaveURL(origin)
 await expect(page.getByLabel('Pesquisar avenças',{exact:true})).toHaveValue('Alfa')
 await page.goto('/?qa-iphone=1&qa-role=admin&view=clients&clientType=individual&clientMode=list')
 await page.getByRole('cell',{name:'Cliente Demonstração Alfa',exact:true}).dblclick()

 await page.getByRole('dialog').getByRole('button',{name:'Avença',exact:true}).click()
 const row=page.getByRole('row').filter({has:page.getByRole('button',{name:'Abrir prestação',exact:true})})
 await row.getByRole('cell').first().click();await expect(page.getByRole('dialog',{name:/Prestação de avença/})).toHaveCount(0)
 await expect(row.locator('input,select')).toHaveCount(0)
 await row.getByRole('cell').first().dblclick()
 const dialog=page.getByRole('dialog',{name:/Prestação de avença/})
 await expect(dialog).toBeVisible()
 await dialog.getByLabel('Estado',{exact:true}).selectOption('paid')
 await dialog.getByLabel('N.º factura',{exact:true}).fill('SINTETICA-1')
 expect(writes).toEqual([])
 await dialog.getByRole('button',{name:'Cancelar',exact:true}).click()
 expect(writes).toEqual([])
 await row.getByRole('cell').first().dblclick()
 await expect(dialog.getByLabel('Estado',{exact:true})).toHaveValue('pending')
 await dialog.getByLabel('Estado',{exact:true}).selectOption('paid')
 await dialog.getByLabel('N.º factura',{exact:true}).fill('SINTETICA-1')
 await dialog.getByRole('button',{name:'Guardar prestação',exact:true}).click()
 await expect(dialog).toHaveCount(0)
 expect(writes).toEqual(['retainer_charges'])
 await expect(page.getByRole('dialog').getByRole('cell',{name:'Liquidada',exact:true})).toBeVisible()
})
