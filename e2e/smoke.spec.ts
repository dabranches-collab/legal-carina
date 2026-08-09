import { expect, test } from '@playwright/test'

test('carrega o login protegido sem registo público', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/Legal Carina/)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Iniciar sessão')
  await expect(page.getByLabel('Email')).toBeVisible()
  await expect(page.getByLabel('Password')).toBeVisible()
  await expect(page.getByText('Não existe registo público.')).toBeVisible()
})

test('abre a recuperação de password', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Preciso de recuperar o acesso' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Recuperar password')
  await expect(page.getByLabel('Password')).toHaveCount(0)
})
