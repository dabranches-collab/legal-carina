import { test,expect } from '@playwright/test'
import { createQaAllocationData } from '../src/lib/qaAllocationData'

const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`
test('predefinição acessível no iPhone e tablet, em claro e escuro',async({page},testInfo)=>{
 await page.goto('/?qa-iphone=1&qa-demo=1&qa-allocation=1&qa-role=admin&view=clients&clientType=individual&clientMode=list')
 for(const width of [390,768]){
  await page.setViewportSize({width,height:844})
  for(const theme of ['claro','escuro']){
   if(theme==='escuro')await page.getByRole('button',{name:'Activar modo escuro',exact:true}).click()
   await page.getByRole('cell',{name:'Cliente Demonstração Alfa',exact:true}).dblclick()
   const dialog=page.getByRole('dialog')
   await dialog.getByRole('button',{name:'Predefinir valor/hora',exact:true}).click()
   await dialog.getByLabel('Valor/hora predefinido (€)',{exact:true}).fill('125.50')
   await expect(dialog.getByRole('button',{name:'Guardar alterações',exact:true})).toBeEnabled()
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
   await page.screenshot({path:testInfo.outputPath(`hourly-${width}-${theme}.png`)})
   await dialog.getByRole('button',{name:'Fechar',exact:true}).first().click()
   if(theme==='escuro')await page.getByRole('button',{name:'Activar modo claro',exact:true}).click()
  }
 }
})

test('novo movimento assume a sociedade do cliente, permite alteração e reinicia ao mudar cliente',async({page})=>{
 const fixture=createQaAllocationData();let saved:Record<string,unknown>|undefined
 await page.route('**/rest/v1/**',async route=>{
  const req=route.request(),url=new URL(req.url()),table=url.pathname.split('/').at(-1)??'',rpc=url.pathname.match(/\/rpc\/([^/]+)/)?.[1],args=req.method()==='POST'?req.postDataJSON():{}
  let result=fixture(rpc,table,args,url,req.method(),req.headers().accept?.includes('vnd.pgrst.object')??false)
  if(rpc==='get_work_entry_form_options')(result as {societies:unknown[]}).societies.push({id:id(3),name:'Sociedade Alternativa Sintética'})
  if(table==='clients'&&url.searchParams.get('select')==='primary_billing_entity_id,default_hourly_rate')result={primary_billing_entity_id:url.searchParams.get('id')===`eq.${id(20)}`?id(2):null,default_hourly_rate:url.searchParams.get('id')===`eq.${id(20)}`?125.5:null}
  if(rpc==='create_work_entry_with_allocation')saved=args
  await route.fulfill({contentType:'application/json',body:JSON.stringify(result)})
 })
 await page.goto('/?qa-iphone=1&qa-role=admin&view=work')
 await page.getByRole('button',{name:'Criar movimento',exact:true}).click()
 const dialog=page.getByRole('dialog',{name:'Criar movimento',exact:true}),client=dialog.getByRole('combobox',{name:'Cliente e vertente'}),society=dialog.getByRole('combobox',{name:'Sociedade',exact:true})
 await client.fill('Alfa');await dialog.getByRole('option',{name:/Cliente Demonstração Alfa/}).click()
 await expect(society).toHaveValue(id(2))
 const rate=dialog.getByRole('spinbutton',{name:'Valor/hora (€)'})
 await expect(rate).toHaveValue('125.5')
 await rate.fill('80')
 await society.selectOption(id(3));await expect(society).toHaveValue(id(3))
 await client.fill('Beta');await dialog.getByRole('option',{name:/Cliente Demonstração Beta/}).click()
 await expect(society).toHaveValue('')
 await expect(rate).toHaveValue('')
 await client.fill('Alfa');await dialog.getByRole('option',{name:/Cliente Demonstração Alfa/}).click()
 await expect(society).toHaveValue(id(2))
 await expect(rate).toHaveValue('125.5')
 await rate.fill('90')
 await dialog.getByRole('combobox',{name:'Responsável',exact:true}).selectOption(id(10))
 await dialog.getByLabel('Angariador da tarefa',{exact:true}).selectOption('carina')
 await dialog.getByLabel('Horas',{exact:true}).selectOption('1')
 await dialog.getByRole('textbox',{name:'Actividade',exact:true}).fill('Movimento sintético')
 await dialog.getByRole('button',{name:'Guardar movimento',exact:true}).click()
 await expect(dialog).toHaveCount(0);expect(saved?.p_billing_entity_id).toBe(id(2));expect(saved?.p_hourly_rate).toBe(90)
})

test('ficha mostra só a vertente activa e guarda sociedade e novo angariador reutilizável',async({page})=>{
 const fixture=createQaAllocationData(),directory:Array<{id:string;name:string}>=[];let writes=0
 await page.route('**/rest/v1/**',async route=>{
  const req=route.request(),url=new URL(req.url()),table=url.pathname.split('/').at(-1)??'',rpc=url.pathname.match(/\/rpc\/([^/]+)/)?.[1],args=['POST','PATCH'].includes(req.method())?req.postDataJSON():{}
  if(!rpc&&['POST','PATCH'].includes(req.method()))writes++
  if(table==='clients'&&req.method()==='PATCH'&&args.client_referrer==='other'&&!directory.length)directory.push({id:id(60),name:args.client_referrer_other})
  const result=table==='client_referrers'?directory:fixture(rpc,table,args,url,req.method(),req.headers().accept?.includes('vnd.pgrst.object')??false)
  await route.fulfill({contentType:'application/json',body:JSON.stringify(result)})
 })
 await page.goto('/?qa-iphone=1&qa-role=admin&view=clients&clientType=individual&clientMode=list')
 const cell=page.getByRole('cell',{name:'Cliente Demonstração Alfa',exact:true}),dialog=page.getByRole('dialog')
 await cell.dblclick()
 await expect(dialog.getByRole('button',{name:'Editar',exact:true})).toHaveCount(0)
 await expect(dialog.getByLabel('Sociedade do cliente',{exact:true})).toBeEnabled()
 await expect(dialog.getByRole('button',{name:'Guardar alterações',exact:true})).toBeDisabled()
 await expect(dialog.getByRole('button',{name:'Cancelar alterações',exact:true})).toBeDisabled()
 await expect(dialog.getByRole('checkbox',{name:'Particular',exact:true})).toBeChecked()
 await expect(dialog.getByRole('checkbox',{name:'Empresa',exact:true})).toHaveCount(0)

 await dialog.getByRole('button',{name:'Acrescentar vertente Empresa',exact:true}).click()
 await dialog.getByRole('checkbox',{name:'Empresa',exact:true}).check()
 await expect(dialog.getByRole('button',{name:'Guardar alterações',exact:true})).toBeEnabled()
 await expect(dialog.getByRole('button',{name:'Guardar alterações',exact:true})).toHaveClass(/record-save/)
 await expect(dialog.getByRole('button',{name:'Cancelar alterações',exact:true})).toBeEnabled()
 await expect(dialog.getByRole('button',{name:'Cancelar alterações',exact:true})).toHaveClass(/record-cancel/)
 await dialog.getByRole('button',{name:'Cancelar alterações',exact:true}).click()
 await expect(dialog.getByRole('checkbox',{name:'Empresa',exact:true})).toHaveCount(0);expect(writes).toBe(0)

 await dialog.getByLabel('Sociedade do cliente',{exact:true}).selectOption(id(2))
 await dialog.getByRole('button',{name:'Predefinir valor/hora',exact:true}).click()
 await dialog.getByLabel('Valor/hora predefinido (€)',{exact:true}).fill('125.50')
 await dialog.getByLabel('Angariador do cliente',{exact:true}).selectOption('other')
 await dialog.getByLabel('Nome do angariador',{exact:true}).fill('Parceiro Sintético')
 await dialog.getByRole('button',{name:'Guardar alterações',exact:true}).click()
 await expect(dialog.getByRole('button',{name:'Guardar alterações',exact:true})).toBeDisabled()
 await dialog.getByRole('button',{name:'Fechar',exact:true}).first().click();await cell.dblclick()
 await expect(dialog.getByLabel('Sociedade do cliente',{exact:true})).toHaveValue(id(2))
 await expect(dialog.getByLabel('Valor/hora predefinido (€)',{exact:true})).toHaveValue('125.5')
 await dialog.getByLabel('Valor/hora predefinido (€)',{exact:true}).fill('0')
 await dialog.getByRole('button',{name:'Guardar alterações',exact:true}).click()
 await expect(dialog.getByRole('button',{name:'Guardar alterações',exact:true})).toBeDisabled()
 await dialog.getByRole('button',{name:'Fechar',exact:true}).first().click();await cell.dblclick()
 await expect(dialog.getByLabel('Valor/hora predefinido (€)',{exact:true})).toHaveValue('0')
 await dialog.getByRole('button',{name:'Retirar predefinição',exact:true}).click()
 await dialog.getByRole('button',{name:'Guardar alterações',exact:true}).click()
 await expect(dialog.getByRole('button',{name:'Guardar alterações',exact:true})).toBeDisabled()
 await dialog.getByRole('button',{name:'Fechar',exact:true}).first().click();await cell.dblclick()
 await expect(dialog.getByRole('button',{name:'Predefinir valor/hora',exact:true})).toBeVisible()
 await expect(dialog.getByLabel('Angariador do cliente',{exact:true})).toHaveValue(id(60))
 await dialog.getByRole('button',{name:'Fechar',exact:true}).first().click()
 await page.goto('/?qa-iphone=1&qa-role=admin&view=clients&clientType=company&clientMode=list')
 await page.getByRole('cell',{name:'Cliente Demonstração Beta',exact:true}).dblclick()
 await expect(dialog.getByRole('checkbox',{name:'Particular',exact:true})).toHaveCount(0)

 await dialog.getByLabel('Angariador do cliente',{exact:true}).selectOption({label:'Parceiro Sintético'})
 await expect(dialog.getByLabel('Nome do angariador',{exact:true})).toHaveValue('Parceiro Sintético')
})


