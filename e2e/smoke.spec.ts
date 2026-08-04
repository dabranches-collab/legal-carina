import { expect, test } from '@playwright/test'

test('carrega a fundação da aplicação', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/Legal Carina/)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Clareza operacional')
})
