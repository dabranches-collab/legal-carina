import { expect, test } from '@playwright/test'
import { createQaAllocationData } from '../src/lib/qaAllocationData'
import packageJson from '../package.json' with { type: 'json' }

test.describe.configure({ timeout: 120_000 })

const routes = [
  ['overview', 'overview'], ['work', 'work'], ['debtors', 'debtors'],
  ['clients', 'clients'], ['clients-dashboard', 'clients&clientType=individual'],
  ['clients-list', 'clients&clientType=individual&clientMode=list'],
  ['billing', 'billing'], ['billing-dashboard', 'billing&society=LEGALTEAM'],
  ['professionals', 'professionals'], ['professional-dashboard', 'professionals&professional=Carina'],
  ['retainers', 'retainers'], ['provisions', 'provisions'], ['notes', 'notes'],
  ['admin', 'admin'], ['admin-users', 'admin-users'], ['admin-access-logs', 'admin-access-logs'],
  ['master-data', 'master-data'], ['imports', 'imports'], ['import-review', 'import-review'],
] as const

const physicalScreens = '14, 24 e 27 polegadas'
const desktopProfiles = [
  { height: 1080, zoom: 1, theme: 'light' }, { height: 1080, zoom: 1.25, theme: 'light' },
  { height: 1080, zoom: 1.5, theme: 'light' }, { height: 1240, zoom: 1, theme: 'light' },
  { height: 1240, zoom: 1.25, theme: 'light' }, { height: 1240, zoom: 1.5, theme: 'light' },
  { height: 1240, zoom: 1, theme: 'dark' }, { height: 1080, zoom: 1.5, theme: 'dark' },
] as const

for (const { height, zoom, theme } of desktopProfiles) test(`menus desktop 1920×${height} a ${zoom * 100}% em modo ${theme} (${physicalScreens})`, async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: Math.round(1920 / zoom), height: Math.round(height / zoom) },
    deviceScaleFactor: zoom,
  })
  const page = await context.newPage()
  await page.addInitScript(version => localStorage.setItem('carina-release-notes-seen', version), packageJson.version)
  const fixture = createQaAllocationData()
  await page.route('**/rest/v1/**', async route => {
    const request = route.request(), url = new URL(request.url())
    const rpc = url.pathname.match(/\/rpc\/([^/]+)/)?.[1]
    const table = url.pathname.split('/').at(-1) ?? ''
    const single = request.headers().accept?.includes('vnd.pgrst.object') ?? false
    const args = request.method() === 'POST' ? request.postDataJSON() : {}
    let result: unknown = fixture(rpc, table, args, url, request.method(), single)
    if (table === 'firm_members') {
      const membership = { firm_id: '00000000-0000-4000-8000-000000000001', role: 'owner' }
      result = single ? membership : [membership]
    }
    if (rpc === 'get_client_category_summaries') result = [
      { category: 'individual', clients: 1, movements: 3, minutes: 540, total: 1800, invoiced: 1300 },
      { category: 'company', clients: 1, movements: 1, minutes: 60, total: 200, invoiced: 0 },
    ]
    if (rpc === 'get_dashboard_metric_breakdowns') result = [{ society: 'LEGALTEAM', minutes: 600, worked: 2000, invoiced: 1300, paid: 1000, receivable: 300, activeClients: 2 }]
    if (rpc === 'get_dashboard_overview') result = { metrics: { minutes: 600, worked: 2000, invoiced: 1300, paid: 1000, receivable: 300, uninvoicedCount: 2, unpaidCount: 1, uncollectibleCount: 0, uncollectibleValue: 0, averageRate: 200, activeClients: 2, missingPrice: 0, missingBilling: 0, overrides: 0, importErrors: 0 }, annual: [], monthly: [], monthlyByYear: [], billingAnnual: [], billingMonthly: [], byClient: [], byBilling: [], byProfessional: [], byArchive: [], clientTypes: [], latestYear: 2026 }
    if (rpc === 'get_client_category_dashboard') result = fixture('get_entity_dashboard_rolling', '', args, url, 'POST', false)
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(result) })
  })
  await page.route('**/functions/v1/**', async route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ users: [
    { userId: 'qa-1', username: 'operador1', displayName: 'OPERADOR SINTÉTICO', pinConfigured: true, role: 'operator', active: true, lastSignInAt: null },
    { userId: 'qa-2', username: 'gestor1', displayName: 'GESTOR SINTÉTICO', pinConfigured: true, role: 'admin', active: true, lastSignInAt: null },
  ] }) }))
  for (const [name, view] of routes) {
    if (process.env.DESKTOP_LAYOUT_ROUTES && !process.env.DESKTOP_LAYOUT_ROUTES.split(',').includes(name)) continue
    const demo = ['notes', 'provisions', 'retainers'].includes(name) ? '&qa-demo=1' : ''
    await page.goto(`/?qa-iphone=1&qa-role=owner&theme=${theme}${demo}&view=${view}`)
    await page.evaluate(() => window.scrollTo(0, 0))
    await expect(page.locator('.app-shell-header')).toBeVisible()
    await expect(page.locator('main')).toBeVisible()
    await expect(page).toHaveURL(new RegExp(`view=${view.split('&')[0]}(?:&|$)`))
    await expect(page.getByText('A abrir ecrã')).toHaveCount(0)
    if (name === 'clients') await expect(page.getByRole('heading', { name: 'Particulares', exact: true })).toBeVisible()
    if (name === 'billing') await expect(page.getByRole('heading', { name: 'LEGALTEAM', exact: true })).toBeVisible()
    if (name === 'professionals') await expect(page.getByRole('heading', { name: 'Carina Santos', exact: true })).toBeVisible()
    if (name === 'admin-users') {
      await expect(page.getByRole('cell', { name: 'OPERADOR SINTÉTICO' })).toBeVisible()
      const firstRow = await page.locator('main tbody tr:not([aria-hidden="true"])').first().boundingBox()
      const tableHeader = await page.locator('main thead').first().boundingBox()
      expect(firstRow!.y).toBeGreaterThanOrEqual(tableHeader!.y + tableHeader!.height - 1)
    }
    await page.waitForTimeout(350)
    const geometry = await page.evaluate(() => {
      const header = document.querySelector('.app-shell-header')!.getBoundingClientRect()
      const main = document.querySelector('main')!.getBoundingClientRect()
      const sidebar = document.querySelector('.app-shell-sidebar')!.getBoundingClientRect()
      return {
        headerBottom: header.bottom, headerLeft: header.left, headerRight: header.right,
        mainTop: main.top, mainLeft: main.left, mainRight: main.right,
        sidebarRight: sidebar.right, documentWidth: document.documentElement.scrollWidth,
        viewportWidth: innerWidth,
      }
    })
    expect(geometry.mainTop).toBeGreaterThanOrEqual(geometry.headerBottom - 1)
    expect(geometry.headerLeft, `${name}: cabeçalho sobre a sidebar`).toBeGreaterThanOrEqual(geometry.sidebarRight - 1)
    expect(geometry.mainLeft, `${name}: conteúdo sobre a sidebar`).toBeGreaterThanOrEqual(geometry.sidebarRight - 1)
    expect(geometry.headerRight, `${name}: cabeçalho fora do ecrã`).toBeLessThanOrEqual(geometry.viewportWidth + 1)
    expect(geometry.mainRight, `${name}: conteúdo fora do ecrã`).toBeLessThanOrEqual(geometry.viewportWidth + 1)
    expect(geometry.documentWidth, name).toBeLessThanOrEqual(geometry.viewportWidth + 1)
    await page.screenshot({ path: `test-results/desktop-${name}-${height}-${zoom}-${theme}.png` })
  }
  await context.close()
})
