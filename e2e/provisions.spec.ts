import {test,expect} from '@playwright/test'

test('Provisões filtra saldos, abre por duplo clique e emite sem duplicar desconto',async({page})=>{
 await page.goto('/?qa-iphone=1&qa-demo=1&qa-provisions=1&view=provisions')
 const table=page.getByRole('table',{name:'Clientes com provisões'})
 await expect(table).toContainText('Cliente Sintético');await expect(table).not.toContainText('Cliente Sem Saldo')
 await page.getByLabel('Apenas clientes com saldo disponível').uncheck();await expect(table).toContainText('Cliente Sem Saldo')
 await page.getByLabel('Apenas clientes com saldo disponível').check()
 const row=page.getByRole('row',{name:'Abrir 00000000-0000-4000-8000-000000000050'})
 await row.click();await expect(page.getByRole('dialog')).toHaveCount(0)
 await row.dblclick();const panel=page.getByRole('region',{name:'Provisões para honorários'})
 await expect(panel).toContainText('877,00')
 await panel.getByRole('button',{name:'Emitir Nota de Honorários com provisão'}).click()
 const note=page.getByRole('dialog',{name:/Nota de Honorários/})
 await note.getByLabel('Seleccionar movimento de 2026-09-01').check()
 await expect(note.getByRole('region',{name:'Provisão para honorários'})).toContainText('246,00')
 const download=page.waitForEvent('download');await note.getByRole('button',{name:'Emitir nota e descontar provisão'}).click();await (await download).saveAs('.tmp/provision-note.pdf')
 await expect(note).toContainText('NH-P-00000002 emitida')
 const secondDownload=page.waitForEvent('download');await note.getByRole('button',{name:'Guardar novamente a nota'}).click();await secondDownload
 await note.getByRole('button',{name:'Fechar',exact:true}).last().click()
 const extract=page.waitForEvent('download');await panel.getByRole('button',{name:'Guardar extracto PDF'}).click();await (await extract).saveAs('.tmp/provision-statement.pdf')
 await expect(panel).toContainText('631,00');await expect(panel.getByText('NH-P-00000002',{exact:true})).toHaveCount(1)
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
  await expect(dialog).toContainText('977,50')
  expect(await dialog.evaluate(element=>element.scrollWidth<=element.clientWidth+1)).toBe(true)
  await dialog.getByRole('button',{name:'Fechar provisões'}).click()
  await page.getByRole('button',{name:'Activar modo escuro'}).click()
  await page.getByRole('cell',{name:'Cliente Sintético',exact:true}).dblclick()
  await expect(dialog).toContainText('Provisões para honorários')
  expect(await dialog.evaluate(element=>element.scrollWidth<=element.clientWidth+1)).toBe(true)
 })
}
