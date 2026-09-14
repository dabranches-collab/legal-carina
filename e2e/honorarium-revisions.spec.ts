import {test,expect} from '@playwright/test'
import {readFile} from 'node:fs/promises'
import {createQaProvisionData} from '../src/lib/qaProvisionData'

test('histórico, filtros, revisão, estorno e reemissão da nota',async({page})=>{
 const data=createQaProvisionData(),client='00000000-0000-4000-8000-000000000020'
 await page.route('**/rest/v1/**',async route=>{
  const request=route.request(),url=new URL(request.url()),rpc=url.pathname.includes('/rpc/')?url.pathname.split('/').at(-1):undefined,table=url.pathname.split('/').at(-1)!,args=request.postDataJSON()??{}
  let body:unknown
  if(table==='clients'&&url.searchParams.get('select')?.includes('id,firm_id,display_name'))body=[{id:client,firm_id:'firm-qa',display_name:'Cliente Sintético',client_code:'02.001',client_type:'individual',active:true}]
  else if(table==='firm_members')body={firm_id:'firm-qa'}
  else if(table==='client_profiles')body=[{client_id:client,client_type:'individual'}]
  else if(rpc==='get_client_document_action_flags')body=[{client_id:client,has_uninvoiced:true,has_unpaid:false}]
  else {body=data(rpc,table,args);if(table==='billing_entities'&&url.searchParams.get('select')!=='id,name')body=(body as unknown[])[0]}
  await route.fulfill({contentType:'application/json',body:JSON.stringify(body)})
 })
 await page.goto('/?qa-iphone=1&qa-role=admin&view=master-data&entity=clients')
 await page.getByTitle('Preparar, consultar ou rever notas de honorários deste cliente.').click()
 const dialog=page.getByRole('dialog',{name:'Nota de Honorários · Cliente Sintético'})
 await expect(dialog.getByLabel('Seleccionar todos os 2 movimentos')).toBeVisible()
 await dialog.getByLabel('Filtrar registos por nota').selectOption('with')
 await expect(dialog.getByLabel('Seleccionar todos os 1 movimentos')).toBeVisible()
 await dialog.getByLabel('Filtrar registos por nota').selectOption('without')
 await expect(dialog.getByText('Preparação de requerimento e análise documental',{exact:true})).toBeVisible()
 await dialog.getByRole('button',{name:/Histórico de notas/}).click()
 const oldCopy=page.waitForEvent('download');await dialog.getByRole('button',{name:'Reimprimir v1'}).click();await (await oldCopy).saveAs('.tmp/reprint-legacy.pdf')
 expect((await readFile('.tmp/reprint-legacy.pdf')).toString('latin1')).toContain('Cópia reconstituída')
 await dialog.getByRole('button',{name:'Anular nota / estornar provisão'}).click()
 await dialog.getByRole('button',{name:'Confirmar anulação'}).click()
 await expect(dialog.getByText(/Saldo disponível antes desta nota/)).toContainText('1000,00')
 await dialog.getByLabel('Filtrar registos por nota').selectOption('void')
 await expect(dialog.getByText('Consulta jurídica inicial',{exact:true})).toBeVisible()
 await dialog.getByRole('button',{name:'Rever e reemitir'}).click()
 await expect(dialog.getByLabel('Seleccionar movimento de 2026-09-01').first()).toBeChecked()
 await dialog.getByLabel('Seleccionar todos os 2 movimentos').check()
 const download=page.waitForEvent('download')
 await dialog.getByRole('button',{name:'Guardar revisão e PDF'}).click()
 const original=await download;expect(original.suggestedFilename()).toMatch(/nota-honorarios/);await original.saveAs('.tmp/reprint-pt-original.pdf')
 const copy=page.waitForEvent('download');await dialog.getByRole('button',{name:'Guardar novamente a nota'}).click();await (await copy).saveAs('.tmp/reprint-pt-copy.pdf')
 const stable=(b:Buffer)=>b.toString('latin1').replace(/\/CreationDate \(D:[^)]*\)/g,'').replace(/\/ID \[[^\]]*\]/g,'')
 expect(stable(await readFile('.tmp/reprint-pt-copy.pdf'))).toBe(stable(await readFile('.tmp/reprint-pt-original.pdf')))
 await expect(dialog.getByRole('button',{name:'Guardar novamente a nota'})).toBeEnabled()
 await dialog.getByRole('button',{name:'Rever esta nota'}).click()
 await expect(dialog.getByRole('button',{name:'Guardar revisão e PDF'})).toBeEnabled()
 await expect(dialog.getByLabel('Seleccionar todos os 2 movimentos')).toBeChecked()
})
