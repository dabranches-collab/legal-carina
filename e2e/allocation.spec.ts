import { test,expect } from '@playwright/test'
import { createQaAllocationData } from '../src/lib/qaAllocationData'
import { readFile } from 'node:fs/promises'
const demo='/?qa-iphone=1&qa-demo=1&qa-allocation=1'

test('volume de 4424 registos carrega num pedido com indicador animado',async({page})=>{
 const fixture=createQaAllocationData();let calls=0,release!:()=>void
 const pending=new Promise<void>(resolve=>{release=resolve})
 await page.route('**/rest/v1/**',async route=>{
  const req=route.request(),url=new URL(req.url()),rpc=url.pathname.match(/\/rpc\/([^/]+)/)?.[1],args=req.method()==='POST'?req.postDataJSON():{}
  let result=fixture(rpc,url.pathname.split('/').at(-1)??'',args,url,req.method(),req.headers().accept?.includes('vnd.pgrst.object')??false)
  if(rpc==='get_legalteam_allocation_work'){
   calls++;expect(args.p_limit).toBe(5000)
   const sample=(result as {items:Record<string,unknown>[]}).items[0]
   result={items:Array.from({length:4424},(_,i)=>({...sample,id:`synthetic-${i}`})),total:4424}
   await pending
  }
  await route.fulfill({contentType:'application/json',body:JSON.stringify(result)})
 })
 await page.goto('/?qa-iphone=1&qa-role=admin&view=billing&society=LEGALTEAM')
 const status=page.getByRole('status',{name:'A calcular a repartição',exact:true})
 await expect(status).toBeVisible()
 expect(await status.locator('.animate-spin').evaluate(el=>getComputedStyle(el).animationName)).not.toBe('none')
 release()
 await expect(page.getByRole('button',{name:/Total do período/})).toContainText('4424 registos')
 await expect(status).toHaveCount(0);expect(calls).toBe(1)
})

test('resumos ficam acima da repartição e páginas seguintes carregam em paralelo',async({page})=>{
 const fixture=createQaAllocationData();let active=0,peak=0
 await page.route('**/rest/v1/**',async route=>{
  const request=route.request(),url=new URL(request.url()),rpc=url.pathname.match(/\/rpc\/([^/]+)/)?.[1],args=request.method()==='POST'?request.postDataJSON():{}
  let result=fixture(rpc,url.pathname.split('/').at(-1)??'',args,url,request.method(),request.headers().accept?.includes('vnd.pgrst.object')??false)
  if(rpc==='get_legalteam_allocation_work'){
   const sample=fixture(rpc,'', {...args,p_offset:0,p_limit:5000},url,'POST',false) as {items:Array<Record<string,unknown>>}
   const offset=Number(args.p_offset),items=Array.from({length:Math.min(5000,15001-offset)},(_,i)=>({...sample.items[0],id:`synthetic-${offset+i}`}))
   active++;peak=Math.max(peak,active);await new Promise(resolve=>setTimeout(resolve,100));active--
   result={items,total:15001}
  }
  await route.fulfill({contentType:'application/json',body:JSON.stringify(result)})
 })
 await page.goto('/?qa-iphone=1&qa-role=admin&view=billing&society=LEGALTEAM')
 const summary=page.getByRole('region',{name:'Resumo Operacional',exact:true}),map=page.getByRole('region',{name:'Repartição LEGALTEAM',exact:true})
 await expect(summary).toBeVisible()
 await expect(map.getByRole('button',{name:/Total do período/})).toContainText('15001 registos')
 expect(peak).toBe(3)
 expect((await summary.boundingBox())!.y).toBeLessThan((await map.boundingBox())!.y)
})

test('lista inferior abre o próprio registo e actualiza a repartição sem perder filtros',async({page})=>{
 await page.goto(`${demo}&view=billing&society=LEGALTEAM`)
 const map=page.getByRole('region',{name:'Repartição LEGALTEAM',exact:true})
 await map.getByLabel('Data final da repartição').fill('2026-09-30')
 await map.getByLabel('Escritório (%)',{exact:true}).fill('20')
 await map.getByLabel('Execução (%)',{exact:true}).fill('60')
 const table=page.getByRole('table',{name:'Registos do painel',exact:true})
 const cell=table.getByRole('cell',{name:'Consulta e preparação de processo',exact:true})
 await cell.click();await expect(page.getByRole('dialog',{name:'Editar movimento'})).toHaveCount(0)
 await expect(table.locator('input,select,textarea,[contenteditable="true"]')).toHaveCount(0)
 await cell.dblclick()
 const dialog=page.getByRole('dialog',{name:'Editar movimento',exact:true})
 await expect(dialog.getByLabel('Angariador da tarefa',{exact:true})).toHaveValue('hugo')
 await dialog.getByLabel('Angariador da tarefa',{exact:true}).selectOption('carina')
 await dialog.getByRole('button',{name:'Guardar alterações',exact:true}).click()
 await expect(dialog).toHaveCount(0)
 await expect(map.getByLabel('Data final da repartição')).toHaveValue('2026-09-30')
 await expect(map.getByLabel('Escritório (%)',{exact:true})).toHaveValue('20')
 await expect(map.getByRole('button',{name:/Carina Santos/})).toContainText('720,00')
 await cell.dblclick();await expect(dialog.getByLabel('Angariador da tarefa',{exact:true})).toHaveValue('carina')
 await dialog.getByRole('button',{name:'Fechar',exact:true}).click()
 await map.getByRole('button',{name:/Clientes sem angariador/}).click()
 const client=map.getByRole('cell',{name:'Cliente Demonstração Beta',exact:true})
 await client.click();await expect(page.getByRole('dialog')).toHaveCount(0)
 const origin=page.url()
 await client.dblclick();await expect(page.getByRole('dialog').getByLabel('Angariador do cliente',{exact:true})).toHaveValue('')
 await expect(page).toHaveURL(origin)
 await page.getByRole('dialog').getByRole('button',{name:'Fechar',exact:true}).first().click()
 await expect(page).toHaveURL(origin)
 await expect(map.getByLabel('Data final da repartição')).toHaveValue('2026-09-30')
 await expect(map.getByLabel('Escritório (%)',{exact:true})).toHaveValue('20')
 await expect(map.getByRole('button',{name:/Clientes sem angariador/})).toHaveAttribute('aria-pressed','true')
 await expect(page.getByRole('region',{name:'Acompanhamento',exact:true}).getByRole('article')).toHaveCount(4)
 await map.getByRole('link',{name:'Abrir ficha',exact:true}).click()
 await expect(page).toHaveURL(origin)

 await page.getByRole('dialog').getByLabel('Angariador do cliente',{exact:true}).selectOption('hugo')
 await page.getByRole('dialog').getByRole('button',{name:'Guardar alterações',exact:true}).click()
 await expect(page.getByRole('dialog').getByRole('button',{name:'Guardar alterações',exact:true})).toBeDisabled()
 await page.getByRole('dialog').getByRole('button',{name:'Fechar',exact:true}).first().click()
 await expect(page).toHaveURL(origin)
 await expect(map.getByLabel('Escritório (%)',{exact:true})).toHaveValue('20')
 await expect(map.getByRole('button',{name:/Clientes sem angariador/})).toContainText('0 registos')
})

test('PDF da repartição respeita clientes, datas e percentagens e gráficos acompanham o resumo',async({page},testInfo)=>{
 await page.goto(`${demo}&view=billing&society=LEGALTEAM`)
 const map=page.getByRole('region',{name:'Repartição LEGALTEAM',exact:true})
 await expect(map.getByRole('img',{name:/Repartição total/})).toBeVisible()
 await expect(map.getByRole('img',{name:/Composição de Carina Santos/})).toBeVisible()
 await map.getByLabel('Escritório (%)',{exact:true}).fill('20')
 await map.getByLabel('Execução (%)',{exact:true}).fill('60')
 await expect(map.getByRole('img',{name:/Parcela do escritório/})).toHaveAttribute('aria-label',/Escritório 20%/)
 await map.getByText('Registos considerados · Clientes com movimentos no período seleccionado',{exact:true}).click()
 await map.getByRole('checkbox',{name:'Todos os clientes',exact:true}).uncheck()
 await map.getByRole('checkbox',{name:/Cliente Demonstração Beta/}).check()
 const downloaded=page.waitForEvent('download');await map.getByRole('button',{name:'Exportar resumo PDF',exact:true}).click();const file=await downloaded
 expect(file.suggestedFilename()).toBe('legalteam-reparticao-2026-09-01-2026-09-03.pdf')
 const target=testInfo.outputPath('reparticao.pdf');await file.saveAs(target)
 const pdf=(await readFile(target)).toString('latin1')
 expect(pdf).toContain('%PDF-');expect(pdf).toContain('LEGALTEAM');expect(pdf).toContain('200,00 EUR');expect(pdf).toContain('40,00 EUR')
 expect(pdf).toContain('Beta');expect(pdf).not.toContain('Alfa')
})

test('PDF distribui uma lista extensa de clientes em colunas e páginas',async({page},testInfo)=>{
 const fixture=createQaAllocationData()
 await page.route('**/rest/v1/**',async route=>{
  const request=route.request(),url=new URL(request.url()),rpc=url.pathname.match(/\/rpc\/([^/]+)/)?.[1],args=request.method()==='POST'?request.postDataJSON():{}
  let result=fixture(rpc,url.pathname.split('/').at(-1)??'',args,url,request.method(),request.headers().accept?.includes('vnd.pgrst.object')??false)
  if(rpc==='get_legalteam_allocation_work'){
   const original=(result as {items:Array<Record<string,unknown>>}).items[0]
   const items=Array.from({length:138},(_,i)=>({...original,id:`synthetic-work-${i}`,client_id:`synthetic-client-${i}`,client_name:i%17===0?`Cliente Sintetico ${String(i+1).padStart(3,'0')} Sociedade Internacional de Consultoria e Desenvolvimento`:`Cliente Sintetico ${String(i+1).padStart(3,'0')}`}))
   result={items,total:items.length}
  }
  await route.fulfill({contentType:'application/json',body:JSON.stringify(result)})
 })
 await page.goto('/?qa-iphone=1&qa-role=admin&view=billing&society=LEGALTEAM')
 const download=page.waitForEvent('download')
 await page.getByRole('button',{name:'Exportar resumo PDF',exact:true}).click()
 const file=await download,target=testInfo.outputPath('clientes-colunas.pdf');await file.saveAs(target)
 const pdf=(await readFile(target)).toString('latin1')
 expect(pdf).toContain('Cliente Sintetico 001');expect(pdf).toContain('Cliente Sintetico 138')
 expect(pdf.match(/\/Type \/Page\b/g)?.length).toBeGreaterThan(1)
})

test('datas automáticas, percentagens editáveis e selecção múltipla recalculam imediatamente',async({page})=>{
 await page.goto(`${demo}&view=billing&society=LEGALTEAM`)
 const map=page.getByRole('region',{name:'Repartição LEGALTEAM',exact:true})
 await expect(page.getByLabel('Data inicial da repartição')).toHaveValue('2026-09-01')
 await expect(page.getByLabel('Data final da repartição')).toHaveValue('2026-09-03')
 await expect(map.getByRole('button',{name:'Actualizar repartição'})).toHaveCount(0)
 await map.getByLabel('Escritório (%)',{exact:true}).fill('20')
 await expect(map.getByRole('alert')).toContainText('totalizar 100%')
 await expect(map.getByRole('button',{name:/Total do período/})).toHaveCount(0)
 await map.getByLabel('Execução (%)',{exact:true}).fill('60')
 await expect(map.getByRole('alert')).toHaveCount(0)
 await expect(map.getByRole('button',{name:/Despesas do escritório · 20%/})).toContainText('400,00')
 await expect(map.getByRole('button',{name:/Carina Santos/})).toContainText('660,00')
 await map.getByText('Registos considerados · Clientes com movimentos no período seleccionado',{exact:true}).click()
 await map.getByRole('checkbox',{name:'Todos os clientes',exact:true}).uncheck()
 await expect(map).toContainText('Não há registos para a selecção actual.')
 await map.getByRole('checkbox',{name:/Cliente Demonstração Beta/}).check()
 await expect(map.getByRole('button',{name:/Total do período/})).toContainText('200,00')
 await expect(map.getByRole('table',{name:'Registos da repartição'})).not.toContainText('Cliente Demonstração Alfa')
 await map.getByRole('checkbox',{name:/Cliente Demonstração Alfa/}).check()
 await expect(map.getByRole('button',{name:/Total do período/})).toContainText('2000,00')
 await map.getByRole('checkbox',{name:'Todos os clientes',exact:true}).check()
 await page.getByLabel('Data final da repartição').fill('2026-09-02')
 await expect(map.getByRole('button',{name:/Total do período/})).toContainText('1300,00')
 await expect(map.getByRole('checkbox',{name:/Cliente Demonstração Beta/})).toHaveCount(0)
 await expect(map.getByRole('button',{name:/Registos sem angariador da tarefa/})).toContainText('0 registos')
 await map.getByRole('button',{name:'Usar todo o período'}).click()
 await expect(page.getByLabel('Data final da repartição')).toHaveValue('2026-09-03')
 await expect(map.getByRole('button',{name:/Registos sem angariador da tarefa/})).toContainText('1 registo')
})

test('pré-filtros contam registos sem preço e distinguem clientes de tarefas e execução',async({page})=>{
 const fixture=createQaAllocationData()
 await page.route('**/rest/v1/**',async route=>{
  const request=route.request(),url=new URL(request.url()),rpc=url.pathname.match(/\/rpc\/([^/]+)/)?.[1],args=request.method()==='POST'?request.postDataJSON():{}
  let result=fixture(rpc,url.pathname.split('/').at(-1)??'',args,url,request.method(),request.headers().accept?.includes('vnd.pgrst.object')??false)
  if(rpc==='get_legalteam_allocation_work'){
   const data=result as {items:Array<Record<string,unknown>>;total:number}
   const missing=data.items.at(-1)!
   result={items:[...data.items,{...missing,id:'00000000-0000-4000-8000-000000000045',activity_description:'Trabalho sem preço nem executor',effective_amount:null,professional_name:'',work_date:'2026-09-04'}],total:5}
  }
  await route.fulfill({contentType:'application/json',body:JSON.stringify(result)})
 })
 await page.goto('/?qa-iphone=1&qa-role=admin&view=billing&society=LEGALTEAM')
 const map=page.getByRole('region',{name:'Repartição LEGALTEAM',exact:true})
 await expect(page.getByLabel('Data final da repartição')).toHaveValue('2026-09-04')
 const client=map.getByRole('button',{name:/Clientes sem angariador/}),task=map.getByRole('button',{name:/Registos sem angariador da tarefa/}),executor=map.getByRole('button',{name:/Registos sem responsável de execução/})
 await expect(client).toContainText('1 cliente');await expect(client).toContainText('2 registos')
 await expect(task).toContainText('2 registos');await expect(executor).toContainText('1 registo')
 await executor.click();await expect(map.getByRole('table')).toContainText('Trabalho sem preço nem executor');await expect(map.getByRole('table')).not.toContainText('Reunião de acompanhamento')
 await client.click();await expect(map.getByRole('table')).toContainText('Cliente Demonstração Beta');await expect(map.getByRole('table')).not.toContainText('Cliente Demonstração Alfa')
 await expect(map.getByRole('link',{name:'Abrir ficha'})).toHaveAttribute('href',/record=00000000-0000-4000-8000-000000000021/)
 await map.getByRole('button',{name:'Ver registos',exact:true}).click();await expect(map.getByRole('table')).toContainText('Trabalho sem preço nem executor');await expect(map.getByRole('table')).toContainText('Reunião de acompanhamento')
 await page.getByLabel('Data final da repartição').fill('2026-09-02');await expect(executor).toContainText('0 registos');await expect(task).toContainText('0 registos')
 await map.getByRole('button',{name:'Usar todo o período'}).click();await client.click()
 await map.getByRole('link',{name:'Abrir ficha'}).click()
 await expect(page.getByRole('dialog').getByLabel('Angariador do cliente',{exact:true})).toHaveValue('')
})
test('repartição por período, pagos, campos e responsáveis completos',async({page})=>{
 await page.goto(`${demo}&view=billing&society=LEGALTEAM`)
 const map=page.getByRole('region',{name:'Repartição LEGALTEAM',exact:true})
 await page.getByLabel('Data final da repartição').fill('2026-09-30')
 await expect(map.getByRole('button',{name:/Total do período/})).toContainText('2000,00')
 await expect(map).toContainText('Parcelas por atribuir:')
 await map.getByLabel('Estado de pagamento').selectOption('paid')
 await expect(map.getByRole('button',{name:/Total do período/})).toContainText('1300,00')
 await map.getByLabel('Estado de pagamento').selectOption('all')
 await map.getByRole('button',{name:/Registos sem angariador da tarefa/}).click()
 await expect(map.getByRole('table')).toContainText('Cliente Demonstração Beta')
 await map.getByRole('cell',{name:'Reunião de acompanhamento',exact:true}).dblclick()
 const dialog=page.getByRole('dialog',{name:'Editar movimento'})
 await expect(dialog.getByLabel('Angariador da tarefa',{exact:true})).toHaveAttribute('required','')
 await dialog.getByLabel('Angariador da tarefa',{exact:true}).selectOption('other')
 await expect(dialog.getByLabel('Nome do angariador da tarefa',{exact:true})).toHaveAttribute('required','')
 await dialog.getByLabel('Nome do angariador da tarefa',{exact:true}).fill('Parceiro de Demonstração')
 await dialog.getByRole('button',{name:'Guardar alterações',exact:true}).click()
 await expect(dialog).toHaveCount(0)
 await page.goto(`${demo}&view=professionals`)
 for(const name of ['Carina Santos','Hugo Mendonça','Paula Chaves'])await expect(page.getByRole('heading',{name,exact:true})).toBeVisible()
})
test('angariador existe na ficha de todos os clientes e permite preencher retroactivamente',async({page})=>{
 await page.goto(`${demo}&view=clients&clientType=company&clientMode=list`)
 await page.getByRole('cell',{name:'Cliente Demonstração Beta',exact:true}).dblclick()
 const select=page.getByLabel('Angariador do cliente',{exact:true})
 await expect(select).toHaveValue('')

 await select.selectOption('hugo')
 await page.getByRole('button',{name:'Guardar alterações',exact:true}).click()
 await expect(page.getByText('Cliente Demonstração Beta actualizado.',{exact:true})).toBeVisible()
 await page.getByRole('button',{name:'Fechar',exact:true}).first().click()
 await page.getByRole('cell',{name:'Cliente Demonstração Beta',exact:true}).dblclick()
 await expect(page.getByLabel('Angariador do cliente',{exact:true})).toHaveValue('hugo')
})
for(const width of [320,390,768,1440])test(`repartição responsiva claro/escuro ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.goto(`${demo}&view=billing&society=LEGALTEAM`)
 const map=page.getByRole('region',{name:'Repartição LEGALTEAM',exact:true});await expect(map.getByRole('button',{name:/Total do período/})).toBeVisible()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
 await page.getByRole('button',{name:'Activar modo escuro',exact:true}).click();await expect(page.locator('html')).toHaveAttribute('data-theme','dark')
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
})

for(const width of [390,1440])test(`pré-filtros mostram o início dos resultados no mesmo menu ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:844})
 await page.goto(`${demo}&view=billing&society=LEGALTEAM`)
 const origin=page.url(),map=page.getByRole('region',{name:'Repartição LEGALTEAM',exact:true})
 for(const name of [/Clientes sem angariador/,/Registos sem angariador da tarefa/,/Registos sem responsável de execução/,/Ver registos sem montante/,/Total do período/,/Carina Santos/]){
  await map.getByRole('button',{name}).click()
  const results=map.getByRole('region',{name:'Resultados do pré-filtro',exact:true})
  await expect(results).toBeFocused();await expect(page).toHaveURL(origin)
  const top=(await results.boundingBox())!.y,headerBottom=await page.locator('.app-shell-header').evaluate(el=>el.getBoundingClientRect().bottom)
  expect(top).toBeGreaterThanOrEqual(headerBottom);expect(top).toBeLessThan(headerBottom+40)
 }
})
