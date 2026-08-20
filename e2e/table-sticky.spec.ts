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

test('barra, filtros e Cliente permanecem estáveis no scroll da página e da tabela', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 800 })
  await page.goto('/?qa-iphone=1&view=work')
  const table = page.getByRole('region', { name: 'Registos de trabalho' })
  await expect(table.getByText('180 movimentos de 180')).toBeVisible()

  const tools = table.locator('.table-tools')
  const header = table.locator('thead')
  const horizontal = table.locator('.scrollbar-thin.overflow-x-auto')
  const clientHeader = table.getByRole('columnheader', { name: /Cliente/ })

  await page.evaluate(() => window.scrollTo(0, 900))
  await expect(tools).toBeInViewport()
  await expect(header).toBeInViewport()
  const vertical = await Promise.all([tools.boundingBox(), header.boundingBox()])
  expect(vertical[0]).not.toBeNull()
  expect(vertical[1]).not.toBeNull()
  expect(vertical[1]!.y).toBeGreaterThanOrEqual(vertical[0]!.y + vertical[0]!.height - 1)

  const headerPositions:number[] = []
  for (const scrollTop of [920, 960, 1000, 1040, 1000, 960, 920]) {
    await page.evaluate((top) => window.scrollTo(0, top), scrollTop)
    headerPositions.push((await header.boundingBox())!.y)
  }
  expect(Math.max(...headerPositions) - Math.min(...headerPositions)).toBeLessThanOrEqual(1)

  await horizontal.evaluate((element) => { element.scrollLeft = 900 })
  const [containerBox, clientBox] = await Promise.all([horizontal.boundingBox(), clientHeader.boundingBox()])
  expect(containerBox).not.toBeNull()
  expect(clientBox).not.toBeNull()
  expect(clientBox!.x).toBeGreaterThanOrEqual(containerBox!.x - 1)
  expect(clientBox!.x).toBeLessThan(containerBox!.x + 4)
  await page.screenshot({ path: 'test-results/table-sticky-desktop.png', fullPage: false })
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

test('zoom equivalente a 150% liberta as pendências e conserva apenas a tabela fixa', async ({ page }) => {
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
  await expect(header).toBeInViewport()
  const [toolsBox, headerBox] = await Promise.all([tools.boundingBox(), header.boundingBox()])
  expect(toolsBox).not.toBeNull()
  expect(headerBox).not.toBeNull()
  expect(toolsBox!.y).toBeLessThan(130)
  expect(headerBox!.y).toBeGreaterThanOrEqual(toolsBox!.y + toolsBox!.height - 1)
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
