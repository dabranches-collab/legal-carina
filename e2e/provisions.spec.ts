import {test,expect} from '@playwright/test'

test('Provisões calcula o saldo na linha e abre os registos sem emitir notas',async({page})=>{
 let notesIssued=0
 page.on('request',request=>{if(request.url().includes('/rpc/issue_provision_honorarium_note'))notesIssued++})
 await page.goto('/?qa-iphone=1&qa-demo=1&qa-provisions=1&view=provisions')
 const table=page.getByRole('table',{name:'Clientes com provisões'})
 await expect(table).toContainText('Cliente Sintético');await expect(table).toContainText('Cliente Sem Saldo')
 await expect(table).toContainText('631,00');await expect(table).toContainText('Saldo esgotado')
 await page.getByRole('button',{name:/Histórico de Cliente Sintético/}).click()
 const usage=page.getByRole('region',{name:'Consumo da provisão nos registos'})
 await expect(usage).toContainText('01/08/2026');await expect(usage).toContainText('631,00')
 await usage.getByText('Ver os registos considerados no saldo',{exact:true}).click()
 await expect(usage).toContainText('Preparação de requerimento')
 await expect(page.getByRole('button',{name:'Emitir Nota de Honorários com provisão'})).toHaveCount(0)
 const download=page.waitForEvent('download');await usage.getByRole('button',{name:'Guardar mapa de consumo PDF'}).click();await (await download).saveAs('.tmp/provision-usage.pdf')
 expect(notesIssued).toBe(0)
})

for(const viewport of [{width:320,height:568},{width:390,height:844},{width:768,height:1024},{width:1440,height:900}]){
 test(`Provisões sem overflow e formulário acessível ${viewport.width}px`,async({page})=>{
  await page.setViewportSize(viewport)
  await page.goto('/?qa-iphone=1&qa-demo=1&qa-provisions=1&view=provisions')
  await page.getByRole('cell',{name:'Cliente Sintético',exact:true}).dblclick()
  const dialog=page.getByRole('dialog',{name:'Provisões · Cliente Sintético'})
  await dialog.getByRole('button',{name:'Registar provisão'}).click()
  await dialog.getByRole('combobox',{name:'Sociedade',exact:true}).selectOption('00000000-0000-4000-8000-000000000030')
  await dialog.getByLabel('Montante').fill('100,50');await dialog.getByLabel('Origem / referência').fill('Reforço sintético')
  await dialog.getByRole('button',{name:'Confirmar provisão'}).click()
  await expect(dialog).toContainText('731,50')
  expect(await dialog.evaluate(element=>element.scrollWidth<=element.clientWidth+1)).toBe(true)
  await dialog.getByRole('button',{name:'Fechar provisões'}).click()
  await page.getByRole('button',{name:'Activar modo escuro'}).click()
  await page.getByRole('cell',{name:'Cliente Sintético',exact:true}).dblclick()
  await expect(dialog).toContainText('Provisões para honorários')
  expect(await dialog.evaluate(element=>element.scrollWidth<=element.clientWidth+1)).toBe(true)
 })
}
