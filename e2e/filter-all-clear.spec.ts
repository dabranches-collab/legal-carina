import { expect, test } from '@playwright/test'

const workRows = Array.from({ length: 180 }, (_, index) => ({
  id: `qa-work-${index + 1}`,
  work_date: `2026-07-${String((index % 28) + 1).padStart(2, '0')}`,
  client_name: `Cliente sintético ${String(index + 1).padStart(3, '0')}`,
  client_code: `02.${String(index + 1).padStart(4, '0')}`,
  matter_code: null,
  matter_title: null,
  activity_description: `Descrição sintética suficientemente longa para testar o recorte e o redimensionamento da coluna ${index + 1}.`,
  professional_name: index % 2 ? 'OPERADOR TESTE' : 'ADMIN TESTE',
  duration_minutes: 30 + (index % 8) * 15,
  effective_hourly_rate: 100,
  effective_amount: 50 + index,
  billing_entity_name: index % 2 ? 'SOCIEDADE TESTE A' : 'SOCIEDADE TESTE B',
  status: 'completed',
  is_invoiced: index % 3 === 0,
  invoice_number: index % 3 === 0 ? `FT QA/${index + 1}` : null,
  invoice_date: index % 3 === 0 ? '2026-07-31' : null,
  is_paid: index % 6 === 0,
  archive_status: null,
  observations: null,
  source_type: 'manual',
  has_manual_override: false,
  has_historical_state_exception: false,
  validation_warnings: [],
}))

test.beforeEach(async ({ page }) => {
  await page.route('**/rest/v1/**', async (route) => {
    const url = route.request().url()
    if (url.includes('/rpc/search_work_entries')) {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          items: workRows,
          total: workRows.length,
          professionals: [{ id: 'qa-professional', label: 'OPERADOR TESTE' }],
          billingEntities: [{ id: 'qa-billing', label: 'SOCIEDADE TESTE A' }],
        }),
      })
      return
    }
    await route.fulfill({ contentType: 'application/json', body: '[]' })
  })
})


for(const viewport of [{width:1440,height:900},{width:390,height:844}]) test('Todos/Limpar '+viewport.width,async({page})=>{
  await page.setViewportSize(viewport)
  await page.goto('/?qa-iphone=1&view=work')
  const table=page.getByRole('region',{name:'Registos de trabalho'})
  await expect(table.getByText('180 registos de 180')).toBeVisible()
  await table.getByRole('button',{name:'Limpar',exact:true}).click()
  await expect(table.getByText('0 registos de 180')).toBeVisible()
  await table.getByRole('button',{name:'Todos',exact:true}).click()
  await expect(table.getByText('180 registos de 180')).toBeVisible()
  const header=table.getByRole('columnheader').filter({hasText:/Cliente/}).first()
  await header.getByRole('button',{name:'Filtrar…',exact:true}).click()
  const panel=page.getByRole('dialog',{name:'Filtro Cliente',exact:true})
  await panel.getByRole('button',{name:'Limpar',exact:true}).click()
  await expect(table.getByText('0 registos de 180')).toBeVisible()
  await panel.getByLabel('Pesquisar opções').fill('001')
  await panel.getByRole('button',{name:'Todos',exact:true}).click()
  await expect(table.getByText('180 registos de 180')).toBeVisible()
  await panel.getByRole('button',{name:'Limpar',exact:true}).click()
  await panel.getByRole('checkbox').first().check()
  await expect(table.getByText('1 registos de 180')).toBeVisible()
  await panel.getByRole('checkbox').first().uncheck()
  await expect(table.getByText('0 registos de 180')).toBeVisible()
  await panel.getByRole('button',{name:'Concluir',exact:true}).click()
  await table.getByRole('button',{name:'Todos',exact:true}).click()
  await expect(table.getByText('180 registos de 180')).toBeVisible()
  await page.screenshot({path:'test-results/filters-'+viewport.width+'.png',fullPage:false})
})

for(const viewport of [{width:1440,height:900},{width:390,height:844}]) test('Pré-filtros Todos/Limpar '+viewport.width,async({page})=>{
  await page.setViewportSize(viewport)
  await page.goto('/?qa-iphone=1&view=work')
  const table=page.getByRole('region',{name:'Registos de trabalho'})
  await expect(table.getByText('180 registos de 180')).toBeVisible()
  for(const label of ['Ano','Responsável','Sociedade','Estado de facturação','Pagamento','Arquivo']){
    const group=page.getByRole('group',{name:label,exact:true})
    await group.getByRole('button',{name:'Limpar',exact:true}).click()
    await expect(group.getByRole('combobox')).toHaveValue('__NONE__')
    await expect(table.getByText('0 registos de 0')).toBeVisible()
    await group.getByRole('button',{name:'Todos',exact:true}).click()
    await expect(table.getByText('180 registos de 180')).toBeVisible()
  }
  await page.screenshot({path:'test-results/prefilters-'+viewport.width+'.png'})
})
for(const mode of [{name:'portrait',width:390,height:844,top:59,right:0,bottom:34,left:0},{name:'landscape',width:844,height:390,top:0,right:59,bottom:21,left:59},{name:'keyboard',width:390,height:430,top:59,right:0,bottom:0,left:0}])test('Safe area após scroll '+mode.name,async({page})=>{
 await page.setViewportSize({width:mode.width,height:mode.height})
 await page.goto('/?qa-iphone=1&view=work&safe-top='+mode.top+'&safe-right='+mode.right+'&safe-bottom='+mode.bottom+'&safe-left='+mode.left)
 const table=page.getByRole('region',{name:'Registos de trabalho'})
 await expect(table.getByText('180 registos de 180')).toBeVisible()
 const verify=async(stage:string)=>{
  const controls=await page.locator('.app-shell-header button').evaluateAll((elements,m)=>elements.filter(e=>e.checkVisibility()).map(e=>{const r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return{name:e.getAttribute('aria-label'),safe:r.x>=m.left&&r.right<=m.width-m.right&&r.y>=m.top&&r.bottom<=m.height-m.bottom,hit:!!hit&&(hit===e||e.contains(hit)),rect:{x:r.x,y:r.y,bottom:r.bottom,right:r.right}}}),mode)
  for(const control of controls){expect(control.safe,stage+' '+control.name+' '+JSON.stringify(control.rect)).toBe(true);expect(control.hit,stage+' hit '+control.name).toBe(true)}
 }
 await verify('initial')
 const horizontal=table.locator('.scrollbar-thin.overflow-x-auto')
 await horizontal.evaluate(e=>{e.scrollLeft=e.scrollWidth})
 await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight))
 await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>resolve())))
 await page.evaluate(()=>window.scrollTo(0,0))
 await horizontal.evaluate(e=>{e.scrollLeft=0})
 await verify('returned')
 await table.getByRole('button',{name:'Limpar',exact:true}).click()
 await page.evaluate(()=>window.scrollTo(0,0))
 await verify('empty')
 await table.getByRole('button',{name:'Todos',exact:true}).click()
 await page.evaluate(()=>window.scrollTo(0,0))
 await verify('all')
 await page.getByRole('button',{name:'Abrir navegação',exact:true}).click()
 await expect(page.getByRole('button',{name:'Fechar navegação',exact:true})).toBeVisible()
 const backdrop=page.getByRole('button',{name:'Fechar navegação',exact:true});const backdropBox=await backdrop.boundingBox();await backdrop.click({position:{x:backdropBox!.width-10,y:20}})
 await verify('menu-closed')
 await page.screenshot({path:'test-results/safe-scroll-'+mode.name+'.png'})
})
