import { expect, test } from '@playwright/test'

test('carrega a fundação da aplicação', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/Legal Carina/)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Clareza operacional')
})

test('valida um ficheiro CSV completamente anonimizado', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Selecionar ficheiro XLSX ou CSV').setInputFiles('src/test/fixtures/horas-anonimizadas.csv')
  await expect(page.getByText('Mapeamento de colunas')).toBeVisible()
  await expect(page.getByText('Linhas analisadas').locator('..')).toContainText('3')
  await expect(page.getByRole('button', { name: 'Importar' })).toBeDisabled()
})
