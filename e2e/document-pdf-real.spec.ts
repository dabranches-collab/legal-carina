import { expect, test } from '@playwright/test'
import path from 'node:path'

const rows=Array.from({length:90},(_,index)=>({
  id:`qa-document-${index+1}`,
  work_date:`2026-${String(index%12+1).padStart(2,'0')}-15`,
  activity_description:`tcodexadministrador intervenção documental ${String(index+1).padStart(3,'0')} com descrição longa para validar paginação e continuidade da tabela`,
  duration_minutes:15+(index%8)*15,
  professional_name:'tcodexadministrador',
  billing_entity_name:'LEGALTEAM',
  effective_amount:25+index,
  status:'approved',
}))

test.beforeEach(async({page})=>{
  await page.route('**/rest/v1/**',async route=>{
    const request=route.request(),url=new URL(request.url()),pathname=url.pathname
    if(pathname.endsWith('/rpc/get_client_document_action_flags')){
      await route.fulfill({contentType:'application/json',body:JSON.stringify([{client_id:'client-pdf-qa',has_uninvoiced:true,has_unpaid:true}])});return
    }
    if(pathname.endsWith('/rpc/search_work_entries')){
      await route.fulfill({contentType:'application/json',body:JSON.stringify({items:rows,total:rows.length,pageSize:10000})});return
    }
    if(pathname.endsWith('/rpc/save_honorarium_document')){
      const args=request.postDataJSON(),items=rows.filter(row=>args.p_work_entry_ids.includes(row.id)),subtotal=items.reduce((sum,row)=>sum+row.effective_amount,0),vat=Math.round(subtotal*args.p_vat_rate)/100
      await route.fulfill({contentType:'application/json',body:JSON.stringify({id:'note-qa',document_id:'note-qa',revision:1,number:'NH-QA-1',issued_at:'2026-09-04T12:00:00Z',subtotal,vat,total:subtotal+vat,deducted:0,remaining:subtotal+vat,balance_after:0,items})});return
    }
    if(pathname.endsWith('/firm_members')){
      await route.fulfill({contentType:'application/json',body:JSON.stringify({firm_id:'firm-pdf-qa'})});return
    }
    if(pathname.endsWith('/clients')){
      const select=url.searchParams.get('select')??''
      const body=select.includes('id,firm_id,display_name')
        ?[{id:'client-pdf-qa',firm_id:'firm-pdf-qa',display_name:'Cliente Açores QA',client_code:'01.9999',client_type:'company',active:true}]
        :{legal_name:'Cliente Açores QA, Lda.',address:'Rua de Teste, 1\n9500-000 Ponta Delgada',honorarium_language:'pt',honorarium_delivery_method:'email',honorarium_recipient_name:'Departamento Financeiro',default_billing_entity_id:'society-pdf-qa'}
      await route.fulfill({contentType:'application/json',body:JSON.stringify(body)});return
    }
    if(pathname.endsWith('/client_profiles')){
      await route.fulfill({contentType:'application/json',body:JSON.stringify([{client_id:'client-pdf-qa',client_type:'company'}])});return
    }
    if(pathname.endsWith('/billing_entities')){
      const select=url.searchParams.get('select')??''
      const body=select==='id,name'
        ?[{id:'society-pdf-qa',name:'LEGALTEAM'}]
        :{name:'LEGALTEAM',legal_name:'Sociedade QA Documentos, Lda.',tax_number:'500000000',address:'Avenida de Teste, 10\n1000-000 Lisboa',phone:'210000000',bank_account_holder:'Sociedade QA Documentos, Lda.',bank_name:'Banco QA',bank_account_number:'0001',iban:'PT50000000000000000000000',bic_swift:'QAPTPPL',default_vat_rate:23,default_currency:'EUR',logo_path:null}
      await route.fulfill({contentType:'application/json',body:JSON.stringify(body)});return
    }
    await route.fulfill({contentType:'application/json',body:'[]'})
  })
})

for(const document of [
  {button:'Nota de Honorários',file:'nota-honorarios-cliente-acores-qa-2026-09-04.pdf'},
  {button:'Cobrança',file:'cobranca-cliente-acores-qa-2026-09-04.pdf'},
] as const){
  test(`gera PDF real multipágina de ${document.button}`,async({page})=>{
    await page.setViewportSize({width:1440,height:900})
    await page.addInitScript(()=>{const NativeDate=Date;class FixedDate extends NativeDate{constructor(...args:ConstructorParameters<typeof Date>){super(...(args.length?args:['2026-09-04T12:00:00Z']) as ConstructorParameters<typeof Date>)}static now(){return new NativeDate('2026-09-04T12:00:00Z').getTime()}};window.Date=FixedDate as DateConstructor})
    await page.goto('/?qa-iphone=1&qa-role=admin&view=master-data&entity=clients')
    await page.getByTitle(document.button==='Cobrança'?'Seleccionar movimentos facturados e não pagos para reforçar a cobrança.':'Preparar, consultar ou rever notas de honorários deste cliente.').click()
    await expect(page.getByText(`Seleccionar todos os ${rows.length} movimentos`)).toBeVisible()
    await page.getByLabel(`Seleccionar todos os ${rows.length} movimentos`).check()
    const downloadPromise=page.waitForEvent('download')
    await page.getByRole('button',{name:document.button==='Cobrança'?'Guardar PDF':'Emitir nota e guardar PDF'}).click()
    const download=await downloadPromise
    expect(download.suggestedFilename()).toBe(document.file)
    await download.saveAs(path.resolve('output/pdf',document.file))
  })
}
