import { expect, test } from '@playwright/test'
import path from 'node:path'
import {readFile} from 'node:fs/promises'

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

for(const language of ['en','fr'] as const)test(`PDF integral em ${language}: registos, despesas e totais`,async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('legal-carina-auth',JSON.stringify({access_token:'synthetic-token',refresh_token:'synthetic-refresh',expires_at:4102444800,token_type:'bearer',user:{id:'synthetic-user'}})))
  const translated=language==='en'?'Document review and preparation of the application':'Analyse documentaire et préparation de la requête'
  const expense=language==='en'?'Registered post':'Courrier recommandé'
  await page.route('**/api/document-translation',async route=>{const input=route.request().postDataJSON();await route.fulfill({json:{items:input.items.map((item:{id:string;kind:string})=>({...item,text:item.kind==='work'?`${translated} ${item.id}`:expense}))}})})
  await page.route('**/rest/v1/work_entry_expenses?*',route=>{const ids=new URL(route.request().url()).searchParams.get('work_entry_id')?.split(/[(),]/)??[];return route.fulfill({json:ids.includes(rows[0].id)?[{id:'expense-qa',work_entry_id:rows[0].id,amount:5,currency:'EUR',observations:'Correio registado'}]:[]})})
  await page.goto('/?qa-iphone=1&qa-role=admin&view=master-data&entity=clients')
  await page.getByTitle('Preparar, consultar ou rever notas de honorários deste cliente.').click()
  await page.getByLabel(`Seleccionar todos os ${rows.length} movimentos`).check()
  await page.getByLabel('Idioma do documento').selectOption(language)
  for(const width of [1440,768,390,320])for(const theme of ['light','dark']){
    await page.setViewportSize({width,height:900});await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme)
    await expect(page.getByRole('button',{name:'Emitir nota e guardar PDF'})).toBeVisible()
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
    if(width===390)await page.screenshot({path:`.tmp/translation-${language}-${theme}-iphone.png`})
  }
  const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Emitir nota e guardar PDF'}).click();const download=await pending
  const file=path.resolve(`.tmp/translation-${language}.pdf`);await download.saveAs(file)
  const bytes=Array.from(await readFile(file))
  const text=await page.evaluate(async data=>{
    const modulePath='/node_modules/pdfjs-dist/build/pdf.mjs'
    const pdfjs=await import(/* @vite-ignore */modulePath);pdfjs.GlobalWorkerOptions.workerSrc='/node_modules/pdfjs-dist/build/pdf.worker.mjs'
    const pdf=await pdfjs.getDocument({data:new Uint8Array(data)}).promise
    const result=[];for(let number=1;number<=pdf.numPages;number++){const page=await pdf.getPage(number);result.push((await page.getTextContent()).items.map((item:{str?:string})=>item.str??'').join(' '))}return result.join(' ')
  },bytes)
  expect(text).toContain(translated);expect(text).toContain(expense);expect(text).not.toContain('intervenção documental');expect(text).not.toContain('Correio registado')
  for(const row of rows)expect(text).toContain(row.id)
  expect(text).toContain(language==='en'?'VAT':'TVA')
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
