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
          items: workRows.slice(0, 100),
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

test('barra e filtros da tabela permanecem fixos sem saltos', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 800 })
  await page.goto('/?qa-iphone=1&view=work')
  const table = page.getByRole('region', { name: 'Registos de trabalho' })
  await expect(table.getByText('180 movimentos de 180')).toBeVisible()

  const tools = table.locator('.table-tools')
  const header = table.locator('thead')
  const horizontal = table.locator('.scrollbar-thin.overflow-x-auto')
  await page.evaluate(() => window.scrollTo(0, 900))
  await expect(tools).toBeInViewport()
  const headerViewportPositions:number[] = []
  for (const scrollTop of [920, 960, 1000, 1040, 1000, 960, 920]) {
    await page.evaluate((top) => window.scrollTo(0, top), scrollTop)
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())))
    const box=(await header.boundingBox())!
    headerViewportPositions.push(box.y)
  }
  expect(Math.max(...headerViewportPositions) - Math.min(...headerViewportPositions)).toBeLessThanOrEqual(.5)

  await page.evaluate(() => { document.body.style.zoom = '1.1' })
  const fractionalZoomPositions:number[] = []
  for (let scrollTop = 1120; scrollTop <= 1180; scrollTop += 2) {
    await page.evaluate((top) => window.scrollTo(0, top), scrollTop)
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())))
    const box=(await header.boundingBox())!
    fractionalZoomPositions.push(box.y)
  }
  expect(Math.max(...fractionalZoomPositions) - Math.min(...fractionalZoomPositions)).toBeLessThanOrEqual(1)
  await page.evaluate(() => { document.body.style.zoom = '' })

  await horizontal.evaluate((element) => { element.scrollLeft = 900 })
  const clientCell=table.getByText('Cliente sintético 032')
  const [containerBox, clientBox] = await Promise.all([horizontal.boundingBox(), clientCell.boundingBox()])
  expect(containerBox).not.toBeNull()
  expect(clientBox).not.toBeNull()
  expect(clientBox!.x).toBeGreaterThanOrEqual(containerBox!.x - 1)
  expect(clientBox!.x).toBeLessThan(containerBox!.x + 16)
  await horizontal.evaluate((element) => { element.scrollLeft = 0 })
  await page.screenshot({ path: 'test-results/table-sticky-desktop.png', fullPage: false })
})

test('cabeçalho e filtros mantêm o centro exacto das células com larguras persistidas após sticky',async({page})=>{
  await page.setViewportSize({width:1440,height:800})
  await page.addInitScript(()=>localStorage.setItem('carina.table.anonymous.work-entries',JSON.stringify({widths:{date:113,client:287,clientCode:121,activity:419,responsible:173,duration:137,rate:151,amount:149,expenses:207,society:193}})))
  await page.goto('/?qa-iphone=1&view=work')
  const table=page.getByRole('region',{name:'Registos de trabalho'})
  await expect(table.getByText('180 movimentos de 180')).toBeVisible()
  for(const zoom of [0.8,1,1.25,1.5,2]){
    await page.evaluate(value=>{document.body.style.zoom=String(value);window.scrollTo(0,1200)},zoom)
    await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))))
    const geometry=await table.evaluate(element=>{
      const headers=[...element.querySelectorAll('thead th')].map(cell=>cell.getBoundingClientRect())
      const row=element.querySelector('tbody tr:not([aria-hidden="true"])')
      const cells=row?[...row.querySelectorAll('td')].map(cell=>cell.getBoundingClientRect()):[]
      return headers.map((header,index)=>({label:element.querySelectorAll('thead th')[index]?.textContent?.trim(),headerLeft:header.left,headerRight:header.right,cellLeft:cells[index]?.left,cellRight:cells[index]?.right,centerDelta:Math.abs((header.left+header.right)/2-(cells[index]?.left+cells[index]?.right)/2),leftDelta:Math.abs(header.left-cells[index]?.left),rightDelta:Math.abs(header.right-cells[index]?.right)}))
    })
    expect(geometry.length).toBeGreaterThan(10)
    for(const column of geometry){
      expect.soft(column.centerDelta,`${column.label} centro a zoom ${zoom}`).toBeLessThanOrEqual(0.75)
      expect.soft(column.leftDelta,`${column.label} esquerda a zoom ${zoom}`).toBeLessThanOrEqual(0.75)
      expect.soft(column.rightDelta,`${column.label} direita a zoom ${zoom}`).toBeLessThanOrEqual(0.75)
    }
  }
})

test('sticky compacto não ocupa o ecrã num iPhone e filtros abrem dentro do viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/?qa-iphone=1&view=work&safe-top=47&safe-bottom=34&theme=dark')
  const table = page.getByRole('region', { name: 'Registos de trabalho' })
  await expect(table.getByText('180 movimentos de 180')).toBeVisible()
  const clientHeader = table.getByRole('columnheader', { name: /Cliente/ })
  await clientHeader.getByRole('button', { name: 'Filtrar…' }).click()
  const panel = page.getByRole('dialog', { name: 'Filtro Cliente' })
  await expect(panel).toBeVisible()
  const metrics = await panel.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: innerWidth, height: innerHeight }
  })
  expect(metrics.left).toBeGreaterThanOrEqual(0)
  expect(metrics.right).toBeLessThanOrEqual(metrics.width)
  expect(metrics.top).toBeGreaterThanOrEqual(0)
  expect(metrics.bottom).toBeLessThanOrEqual(metrics.height)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: 'test-results/table-sticky-iphone-dark.png', fullPage: false })
})

test('zoom equivalente a 150% liberta as pendências e conserva a tabela fixa', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto('/?qa-iphone=1&view=work&theme=dark')
  const filters = page.getByRole('region', { name: 'Filtros dos registos' })
  const table = page.getByRole('region', { name: 'Registos de trabalho' })
  const tools = table.locator('.table-tools')
  const header = table.locator('thead')
  await expect(table.getByText('180 movimentos de 180')).toBeVisible()

  await page.evaluate(() => window.scrollTo(0, 650))
  await expect(filters).not.toBeInViewport()
  await expect(tools).toBeInViewport()
  const [toolsBox, headerBox] = await Promise.all([tools.boundingBox(), header.boundingBox()])
  expect(toolsBox).not.toBeNull()
  expect(headerBox).not.toBeNull()
  expect(toolsBox!.y).toBeLessThan(130)
  expect(headerBox!.y).toBeGreaterThanOrEqual(toolsBox!.y+toolsBox!.height-1)
  await page.screenshot({ path: 'test-results/table-sticky-150-dark.png', fullPage: false })
})

test('criação de movimento no iPhone mantém as acções visíveis durante o scroll', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/?qa-iphone=1&view=work&safe-top=47&safe-bottom=34&theme=dark')
  await page.getByRole('button', { name: /Criar movimento/i }).click()

  const dialog = page.getByRole('dialog', { name: /Criar movimento/i })
  const cancel = dialog.getByRole('button', { name: 'Cancelar' })
  const save = dialog.getByRole('button', { name: /Guardar movimento/i })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('spinbutton',{name:/^Valor\/hora/})).toBeVisible()
  await expect(dialog.getByRole('spinbutton',{name:/^Valor total/})).toBeVisible()
  await expect(cancel).toBeInViewport()
  await expect(save).toBeInViewport()

  await dialog.evaluate((element) => { element.scrollTop = element.scrollHeight })
  await expect(cancel).toBeInViewport()
  await expect(save).toBeInViewport()
  const footerMetrics = await Promise.all([cancel.boundingBox(), save.boundingBox()])
  expect(footerMetrics[0]).not.toBeNull()
  expect(footerMetrics[1]).not.toBeNull()
  expect(footerMetrics[0]!.y + footerMetrics[0]!.height).toBeLessThanOrEqual(844)
  expect(footerMetrics[1]!.y + footerMetrics[1]!.height).toBeLessThanOrEqual(844)
  await page.screenshot({ path: 'test-results/create-work-entry-iphone-dark.png', fullPage: false })
})

for (const zoom of [0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2]) {
  test(`filtros permanecem fixos sem saltos com zoom ${Math.round(zoom * 100)}%`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/?qa-iphone=1&view=work')
    const table = page.getByRole('region', { name: 'Registos de trabalho' })
    await expect(table.getByText('180 movimentos de 180')).toBeVisible()
    const tools = table.locator('.table-tools')
    const header = table.locator('thead')
    await page.evaluate((factor) => { document.body.style.zoom = String(factor) }, zoom)
    const tableDocumentTop = await table.evaluate((element) => element.getBoundingClientRect().top + window.scrollY)
    const positions:number[] = []
    for (const delta of [180, 210, 240, 270, 240, 210, 180]) {
      await page.evaluate((top) => window.scrollTo(0, top), tableDocumentTop + delta)
      await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())))
      const headerBox=await header.boundingBox()
      positions.push(headerBox!.y)
      const toolsBox=await tools.boundingBox()
      expect(toolsBox).not.toBeNull()
      expect(headerBox).not.toBeNull()
      expect(toolsBox!.y).toBeGreaterThanOrEqual(0)
    }
    expect(Math.max(...positions) - Math.min(...positions)).toBeLessThanOrEqual(.75)
  })
}

for (const device of [
  { name:'iPhone SE antigo',width:320,height:568 },
  { name:'iPhone SE',width:375,height:667 },
  { name:'iPhone 12–15',width:390,height:844 },
  { name:'iPhone 15 Pro',width:393,height:852 },
  { name:'iPhone Plus',width:414,height:896 },
  { name:'iPhone Pro Max',width:430,height:932 },
]) {
  test(`${device.name}: registos e criação não provocam overflow global`, async ({ page }) => {
    await page.setViewportSize({ width:device.width, height:device.height })
    await page.goto('/?qa-iphone=1&view=work&safe-top=47&safe-bottom=34&theme=dark')
    await expect(page.getByRole('region',{name:'Registos de trabalho'})).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.getByRole('button',{name:/Criar movimento/i}).click()
    const dialog=page.getByRole('dialog',{name:/Criar movimento/i})
    await expect(dialog).toBeVisible()
    await dialog.evaluate((element)=>{element.scrollTop=element.scrollHeight})
    for (const action of ['Cancelar','Guardar movimento']) {
      const button=dialog.getByRole('button',{name:action})
      const box=await button.boundingBox()
      expect(box).not.toBeNull()
      expect(box!.x).toBeGreaterThanOrEqual(0)
      expect(box!.x+box!.width).toBeLessThanOrEqual(device.width)
      expect(box!.y+box!.height).toBeLessThanOrEqual(device.height)
    }
  })
}
