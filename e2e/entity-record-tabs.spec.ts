import { test, expect } from '@playwright/test'
import { createQaAllocationData } from '../src/lib/qaAllocationData'

test('os registos abrem na ficha e fechar repõe a lista de origem', async ({ page }) => {
  const fixture = createQaAllocationData()
  const attentionRequests: Array<Record<string, unknown>> = []
  await page.route('**/rest/v1/**', async route => {
    const request = route.request(), url = new URL(request.url())
    const table = url.pathname.split('/').at(-1) ?? ''
    const rpc = url.pathname.match(/\/rpc\/([^/]+)/)?.[1]
    const args = request.method() === 'POST' ? request.postDataJSON() : {}
    if (rpc === 'get_attention_work_entries') attentionRequests.push(args)
    const result = rpc === 'get_attention_work_entries'
      ? { items: [], total: 0, page: 1, pageSize: 10000, professionals: [], billingEntities: [] }
      : fixture(rpc, table, args, url, request.method(), request.headers().accept?.includes('vnd.pgrst.object') ?? false)
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(result) })
  })
  for (const [entity, name] of [
    ['clients', 'Cliente Demonstração Alfa'],
    ['billing_entities', 'LEGALTEAM'],
    ['professionals', 'Carina'],
  ] as const) {
    await page.goto(`/?qa-iphone=1&qa-role=admin&view=master-data&entity=${entity}`)
    const origin = page.url()
    if (entity === 'clients') {
      await expect(page.getByRole('button', { name: 'Tabela', exact: true })).toHaveAttribute('aria-pressed', 'true')
      await page.getByRole('button', { name: 'Caixas', exact: true }).click()
      await expect(page.getByRole('button', { name: 'Caixas', exact: true })).toHaveAttribute('aria-pressed', 'true')
      await page.getByRole('button', { name: 'Tabela', exact: true }).click()
    }
    await page.getByRole('cell', { name, exact: true }).first().dblclick()
    const dialog = page.getByRole('dialog', { name })
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: /Não facturados/ }).click()
    await expect(dialog.getByRole('table', { name: 'Registos de trabalho' })).toBeVisible()
    const filterKey = entity === 'clients' ? 'p_client_id' : entity === 'billing_entities' ? 'p_billing_entity_id' : 'p_professional_id'
    const expectedId = `00000000-0000-4000-8000-${String(entity === 'clients' ? 20 : entity === 'billing_entities' ? 2 : 10).padStart(12, '0')}`
    await expect.poll(() => attentionRequests.some(args => args.p_kind === 'uninvoiced' && args[filterKey] === expectedId)).toBe(true)
    const openedUrl = new URL(page.url())
    expect(openedUrl.searchParams.get('record')).toBe(expectedId)
    expect(openedUrl.searchParams.get('recordFilter')).toBe('uninvoiced')
    if (entity === 'clients') expect(openedUrl.searchParams.get('clientPage')).toBe('general')
    await dialog.getByRole('button', { name: 'Ficha', exact: true }).click()
    await expect(dialog.getByLabel('Nome')).toBeVisible()
    await dialog.locator('[data-close-record]').first().click()
    await expect(dialog).toHaveCount(0)
    await expect(page).toHaveURL(origin)
    await expect(page.getByRole('cell', { name, exact: true }).first()).toBeVisible()
  }
})
