import { expect, test } from '@playwright/test'

for (const viewport of [
  { name: 'desktop claro', width: 1440, height: 800, theme: 'light' },
  { name: 'tablet escuro', width: 820, height: 1000, theme: 'dark' },
  { name: 'iPhone escuro', width: 390, height: 844, theme: 'dark' },
]) test(`os nomes dos utilizadores ficam abaixo do cabeçalho no ${viewport.name}`, async ({ page }) => {
  await page.setViewportSize({ width: viewport.width, height: viewport.height })
  await page.route('**/rest/v1/**', async route => {
    const table = new URL(route.request().url()).pathname.split('/').at(-1)
    await route.fulfill({
      contentType: 'application/json',
      body: table === 'firm_members' ? JSON.stringify({ firm_id: 'qa-firm', role: 'admin' }) : '[]',
    })
  })
  await page.route('**/functions/v1/admin-users', async route => {
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ users: [
      { userId: 'qa-1', username: 'teste1', displayName: 'CLIENTE TESTE UM', pinConfigured: true, role: 'admin', active: true, lastSignInAt: null },
      { userId: 'qa-2', username: 'teste2', displayName: 'CLIENTE TESTE DOIS', pinConfigured: true, role: 'operator', active: true, lastSignInAt: null },
    ] }) })
  })

  await page.goto(`/?qa-iphone=1&qa-role=admin&view=admin-users&theme=${viewport.theme}`)
  const table = page.getByRole('region', { name: 'Utilizadores existentes' })
  await expect(table.getByRole('cell', { name: 'CLIENTE TESTE UM' })).toBeVisible()
  const geometry = await table.evaluate(element => {
    const header = element.querySelector('thead')!.getBoundingClientRect()
    const first = element.querySelector('tbody tr:not([aria-hidden="true"])')!.getBoundingClientRect()
    const tools = element.querySelector('.table-tools')!.getBoundingClientRect()
    return { headerBottom: header.bottom, firstTop: first.top, toolsBottom: tools.bottom }
  })
  expect(geometry.firstTop).toBeGreaterThanOrEqual(geometry.headerBottom - 1)
  expect(geometry.headerBottom).toBeGreaterThanOrEqual(geometry.toolsBottom)
})
