import {expect,test} from '@playwright/test'
const base={client_id:'client',client_name:'Cliente sintético',society_name:'Sociedade teste',date:'2026-10-01',currency:'EUR',total:123,received:10,deducted:20,remaining:93,token:'v1',can_pay:true,can_edit:true,status:'Por receber'}
for(const width of [390,768,1440])for(const dark of [false,true])test('Pagamentos '+width+' '+(dark?'escuro':'claro'),async({page})=>{
 await page.setViewportSize({width,height:900})
 await page.addInitScript(({dark})=>{localStorage.setItem('carina-theme',dark?'dark':'light');localStorage.setItem('carina-release-notes-seen','0.14.0')},{dark})
 let rows=[{...base,id:'u',category:'unbilled',title:'Registo por facturar',can_pay:false,status:'Por facturar'},{...base,id:'w',category:'work',title:'Registo facturado'},{...base,id:'n',category:'note',title:'NH-TESTE',revision:2},{...base,id:'r',category:'retainer',title:'Avença · 10/2026'}]
 let writes=0
 await page.route('**/rest/v1/**',async route=>{
  const url=route.request().url(),body=route.request().postDataJSON()
  let data:unknown=[]
  if(url.includes('/rpc/get_payment_queue'))data=rows
  if(url.includes('/rpc/get_payment_detail'))data={item:rows.find(row=>row.id===body.p_id),receipts:[],items:[]}
  if(url.includes('/rpc/record_pending_payment')){writes++;rows=rows.filter(row=>row.id!==body.p_id);data={id:'receipt'}}
  await route.fulfill({contentType:'application/json',body:JSON.stringify(data)})
 })
 await page.goto('/?qa-iphone=1&view=debtors')
 if(width<1024)await page.getByRole('button',{name:'Abrir navegação',exact:true}).click()
 const navigation=page.getByRole('complementary',{name:'Navegação principal'})
 const parent=navigation.getByRole('button',{name:'Por Receber',exact:true})
 await expect(parent).toHaveAttribute('aria-expanded','true')
 const submenu=navigation.getByRole('list',{name:'Por receber',exact:true})
 const payments=submenu.getByRole('button',{name:'Pagamentos',exact:true})
 await expect(payments).toBeVisible()
 await expect(navigation.getByRole('list',{name:'Listas de clientes'}).getByRole('button',{name:'Pagamentos',exact:true})).toHaveCount(0)
 await payments.focus();await page.keyboard.press('Enter')
 await expect(page.getByRole('heading',{name:'Pagamentos',exact:true})).toBeVisible()
 await expect(page.getByRole('navigation',{name:'Localização'})).toContainText('Por receber')
 if(width<1024){
  await expect(page.getByRole('button',{name:'Fechar navegação',exact:true})).toHaveCount(0)
  await page.getByRole('button',{name:'Abrir navegação',exact:true}).click()
 }
 await expect(parent).toHaveAttribute('aria-current','page')
 await expect(payments).toHaveAttribute('aria-current','page')
 if(width<1024){await payments.click();await expect(page.getByRole('button',{name:'Fechar navegação',exact:true})).toHaveCount(0)}
 if(width===390)await page.addStyleTag({content:':root{--safe-top:24px;--safe-bottom:34px;--safe-left:0px;--safe-right:0px}'})
 await expect(page.getByRole('heading',{name:'Pagamentos',exact:true})).toBeVisible()
 await page.getByRole('button',{name:/Notas de honorários não pagas/}).click()
 const table=page.getByRole('region',{name:'Notas de honorários não pagas'})
 await expect(table.getByText('1 resultados de 1')).toBeVisible()
 await table.getByRole('button',{name:'Limpar',exact:true}).click()
 await expect(table.getByText('0 resultados de 1')).toBeVisible()
 await table.getByRole('button',{name:'Todos',exact:true}).click()
 await page.screenshot({path:'test-results/payments-'+width+'-'+dark+'.png',fullPage:true})
 await table.getByRole('button',{name:width===390?'Abrir detalhe de NH-TESTE':'NH-TESTE',exact:true}).click()
 const dialog=page.getByRole('dialog',{name:'NH-TESTE'})
 await expect(dialog).toBeVisible()
 const bounds=await dialog.boundingBox();expect(bounds).not.toBeNull();expect(bounds!.x).toBeGreaterThanOrEqual(0);expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(width);expect(bounds!.y+bounds!.height).toBeLessThanOrEqual(900)
 await page.getByLabel('Referência / motivo').fill('Transferência sintética')
 await page.getByRole('checkbox',{name:/Confirmo/}).check()
 await page.screenshot({path:'test-results/payment-detail-'+width+'-'+dark+'.png',fullPage:true})
 const button=page.getByRole('button',{name:'Registar pagamento',exact:true})
 await button.click()
 await expect(dialog).not.toBeVisible()
 await expect(page.getByRole('button',{name:/Notas de honorários não pagas/})).toContainText('0')
 expect(writes).toBe(1)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})
