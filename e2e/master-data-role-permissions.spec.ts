import { expect,test,type Page } from '@playwright/test'

type Write={method:string;table:string;body:Record<string,unknown>}

async function mockMasterData(page:Page,writes:Write[]){
 await page.route('**/rest/v1/**',async route=>{
  const request=route.request(),url=new URL(request.url()),table=url.pathname.split('/').at(-1)??'',method=request.method()
  if(method==='POST'||method==='PATCH')writes.push({method,table,body:(request.postDataJSON()??{}) as Record<string,unknown>})
  if(table==='firm_members')return route.fulfill({contentType:'application/json',body:JSON.stringify({firm_id:'qa-firm'})})
  if(table==='clients'&&method==='POST')return route.fulfill({contentType:'application/json',body:JSON.stringify({id:'qa-client-created'})})
  if((table==='billing_entities'||table==='professionals')&&method==='POST')return route.fulfill({contentType:'application/json',body:JSON.stringify({id:`qa-${table}-created`})})
  if(table==='get_client_document_action_flags')return route.fulfill({contentType:'application/json',body:'[]'})
  return route.fulfill({contentType:'application/json',body:'[]'})
 })
}

test('Operador cria clientes, sociedades e responsáveis nas Definições operacionais',async({page})=>{
 const writes:Write[]=[];await mockMasterData(page,writes)
 await page.goto('/?qa-iphone=1&qa-role=operator&view=clients&clientType=company&clientMode=list')
 await expect(page.getByRole('heading',{name:'Lista · Empresas'})).toBeVisible()
 await page.getByRole('button',{name:'Criar cliente'}).click()
 const dialog=page.getByRole('dialog');await dialog.getByLabel('Nome').fill('tcodexoperador cliente UI')
 await dialog.getByLabel('Empresa',{exact:true}).check()
 await dialog.getByRole('button',{name:'Guardar alterações'}).click()
 await expect(page.getByRole('status').filter({hasText:'tcodexoperador cliente UI criado.'})).toBeVisible()
 expect(writes.filter(item=>item.table==='clients'&&item.method==='POST')).toHaveLength(1)
 expect(writes.filter(item=>item.table==='client_profiles'&&item.method==='POST')).toHaveLength(1)
 expect(writes.find(item=>item.table==='clients')?.body.display_name).toBe('tcodexoperador cliente UI')

 for(const entity of [
  {query:'billing_entities',button:'Criar Sociedade',name:'tcodexoperador sociedade UI',table:'billing_entities'},
  {query:'professionals',button:'Criar Responsável',name:'tcodexoperador responsável UI',table:'professionals'},
 ] as const){
  await page.goto(`/?qa-iphone=1&qa-role=operator&view=master-data&entity=${entity.query}`)
  await page.getByRole('button',{name:entity.button}).click();const entityDialog=page.getByRole('dialog')
  await entityDialog.getByLabel('Nome').fill(entity.name);await entityDialog.getByRole('button',{name:'Guardar alterações'}).click()
  await expect(page.getByRole('status').filter({hasText:`${entity.name} criado.`})).toBeVisible()
  expect(writes.some(item=>item.table===entity.table&&item.method==='POST')).toBe(true)
 }
 await expect(page.getByRole('button',{name:'Utilizadores'})).toHaveCount(0)
 await expect(page.getByRole('button',{name:'Importações'})).toHaveCount(0)
})

for(const entity of [
 {query:'billing_entities',button:'Criar Sociedade',name:'tcodexadministrador sociedade UI',table:'billing_entities'},
 {query:'clients',button:'Criar cliente',name:'tcodexadministrador cliente UI',table:'clients'},
 {query:'professionals',button:'Criar Responsável',name:'tcodexadministrador responsável UI',table:'professionals'},
] as const)test(`Administrador cria ${entity.query} sem campo de justificação`,async({page})=>{
 const writes:Write[]=[];await mockMasterData(page,writes)
 await page.goto(`/?qa-iphone=1&qa-role=admin&view=master-data&entity=${entity.query}`)
 await page.getByRole('button',{name:entity.button}).click();const dialog=page.getByRole('dialog')
 await dialog.getByLabel('Nome').fill(entity.name)
 await expect(dialog.getByText(/motivo|justifica/i)).toHaveCount(0)
 if(entity.query==='clients')await dialog.getByLabel('Empresa',{exact:true}).check()
 await dialog.getByRole('button',{name:'Guardar alterações'}).click()
 await expect(page.getByRole('status').filter({hasText:`${entity.name} criado.`})).toBeVisible()
 expect(writes.some(item=>item.table===entity.table&&item.method==='POST')).toBe(true)
})

test('Operador edita fichas existentes de Cliente, Sociedade e Responsável',async({page})=>{
 const writes:Write[]=[]
 await page.route('**/rest/v1/**',async route=>{
  const request=route.request(),url=new URL(request.url()),table=url.pathname.split('/').at(-1)??'',method=request.method(),select=url.searchParams.get('select')??''
  if(method==='PATCH'){writes.push({method,table,body:(request.postDataJSON()??{}) as Record<string,unknown>});return route.fulfill({contentType:'application/json',body:'[]'})}
  if(table==='firm_members')return route.fulfill({contentType:'application/json',body:JSON.stringify({firm_id:'qa-firm'})})
  if(table==='get_client_document_action_flags')return route.fulfill({contentType:'application/json',body:'[]'})
  if(table==='billing_entities')return route.fulfill({contentType:'application/json',body:select.includes('legal_name')?JSON.stringify({legal_name:'Sociedade existente',tax_number:'',address:'',email:'',phone:'',bank_account_holder:'',bank_name:'',bank_account_number:'',iban:'',bic_swift:'',default_vat_rate:23,default_currency:'EUR'}):JSON.stringify([{id:'qa-society-existing',firm_id:'qa-firm',name:'Sociedade existente',active:true}])})
  if(table==='professionals')return route.fulfill({contentType:'application/json',body:JSON.stringify([{id:'qa-professional-existing',firm_id:'qa-firm',display_name:'Responsável existente',active:true}])})
  if(table==='clients')return route.fulfill({contentType:'application/json',body:select.includes('legal_name')?JSON.stringify({legal_name:'Cliente existente',tax_number:'',email:'',phone:'',address:'',notes:'',honorarium_language:'pt',honorarium_delivery_method:'email',honorarium_recipient_name:'',default_billing_entity_id:null}):JSON.stringify([{id:'qa-client-existing',firm_id:'qa-firm',display_name:'Cliente existente',client_code:'01.0099',client_type:'company',active:true}])})
  if(table==='client_profiles')return route.fulfill({contentType:'application/json',body:select.includes('id,client_type')?JSON.stringify([{id:'qa-profile-existing',client_type:'company',client_code:'01.0099',active:true}]):JSON.stringify([{client_id:'qa-client-existing',client_type:'company'}])})
  return route.fulfill({contentType:'application/json',body:'[]'})
 })
 for(const entity of [
  {query:'clients',current:'Cliente existente',next:'tcodexoperador cliente editado',table:'clients'},
  {query:'billing_entities',current:'Sociedade existente',next:'tcodexoperador sociedade editada',table:'billing_entities'},
  {query:'professionals',current:'Responsável existente',next:'tcodexoperador responsável editado',table:'professionals'},
 ] as const){
  await page.goto(`/?qa-iphone=1&qa-role=operator&view=master-data&entity=${entity.query}`)
  await expect(page.getByText(entity.current,{exact:true}).first()).toBeVisible();await page.getByRole('button',{name:'Abrir ficha'}).click()
  const dialog=page.getByRole('dialog');await dialog.getByRole('button',{name:'Editar',exact:true}).click();await expect(dialog.getByRole('button',{name:'Guardar alterações'})).toBeDisabled();await dialog.getByLabel('Nome').fill(entity.next);await expect(dialog.getByRole('button',{name:'Guardar alterações'})).toBeEnabled();await dialog.getByRole('button',{name:'Guardar alterações'}).click()
  await expect(page.getByRole('status').filter({hasText:`${entity.next} actualizado.`})).toBeVisible()
  expect(writes.some(item=>item.table===entity.table&&item.method==='PATCH'&&item.body.display_name===entity.next||item.table===entity.table&&item.method==='PATCH'&&item.body.name===entity.next)).toBe(true)
 }
})

for(const role of ['admin','operator'] as const)test(`${role} altera e persiste os dados usados em Notas de Honorários e Cobranças`,async({page})=>{
 const writes:Write[]=[],client={legal_name:'Cliente existente',tax_number:'',email:'',phone:'',address:'',notes:'',honorarium_language:'pt',honorarium_delivery_method:'email',honorarium_recipient_name:'Destinatário inicial',default_billing_entity_id:'qa-society-a'}
 await page.route('**/rest/v1/**',async route=>{
  const request=route.request(),url=new URL(request.url()),table=url.pathname.split('/').at(-1)??'',method=request.method(),select=url.searchParams.get('select')??''
  if(table==='firm_members')return route.fulfill({contentType:'application/json',body:JSON.stringify({firm_id:'qa-firm'})})
  if(table==='get_client_document_action_flags')return route.fulfill({contentType:'application/json',body:'[]'})
  if(table==='billing_entities')return route.fulfill({contentType:'application/json',body:JSON.stringify([{id:'qa-society-a',name:'Sociedade A'},{id:'qa-society-b',name:'Sociedade B'}])})
  if(table==='clients'&&method==='PATCH'){
   const body=(request.postDataJSON()??{}) as Record<string,unknown>;writes.push({method,table,body});Object.assign(client,body)
   return route.fulfill({contentType:'application/json',body:'[]'})
  }
  if(table==='clients')return route.fulfill({contentType:'application/json',body:select.includes('legal_name')?JSON.stringify(client):JSON.stringify([{id:'qa-client-existing',firm_id:'qa-firm',display_name:'Cliente existente',client_code:'01.0099',client_type:'company',active:true}])})
  if(table==='client_profiles')return route.fulfill({contentType:'application/json',body:select.includes('id,client_type')?JSON.stringify([{id:'qa-profile-existing',client_type:'company',client_code:'01.0099',active:true}]):JSON.stringify([{client_id:'qa-client-existing',client_type:'company'}])})
  return route.fulfill({contentType:'application/json',body:'[]'})
 })
 await page.goto(`/?qa-iphone=1&qa-role=${role}&view=master-data&entity=clients`)
 await page.getByRole('button',{name:'Abrir ficha'}).click();let dialog=page.getByRole('dialog');await dialog.getByRole('button',{name:'Editar',exact:true}).click();await dialog.getByRole('button',{name:'Facturação',exact:true}).click()
 await expect(dialog.getByLabel('Destinatário')).toBeEnabled();await expect(dialog.getByLabel('Sociedade emissora').first()).toBeEnabled();await expect(dialog.getByLabel('Idioma')).toBeEnabled();await expect(dialog.getByRole('button',{name:'Guardar alterações'})).toBeDisabled()
 await dialog.getByLabel('Destinatário').fill(`${role} destinatário persistido`)
 await dialog.getByLabel('Sociedade emissora').first().selectOption('qa-society-b')
 await dialog.getByLabel('Idioma').selectOption('fr')
 await dialog.getByRole('button',{name:'Guardar alterações'}).click()
 await expect(page.getByRole('status').filter({hasText:'Cliente existente actualizado.'})).toBeVisible()
 const write=writes.find(item=>item.table==='clients'&&item.method==='PATCH')
 expect(write?.body).toMatchObject({honorarium_recipient_name:`${role} destinatário persistido`,default_billing_entity_id:'qa-society-b',honorarium_language:'fr'})
 dialog=page.getByRole('dialog');await dialog.getByRole('button',{name:'Facturação',exact:true}).click()
 await expect(dialog.getByLabel('Destinatário')).toHaveValue(`${role} destinatário persistido`)
 await expect(dialog.getByLabel('Sociedade emissora').first()).toHaveValue('qa-society-b')
 await expect(dialog.getByLabel('Idioma')).toHaveValue('fr')
})
