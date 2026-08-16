import { expect, test } from '@playwright/test'

const windowsViewports = [
  { name:'Windows 1280×800', width:1280, height:800 },
  { name:'Windows 1366×768', width:1366, height:768 },
  { name:'Windows 1440×900', width:1440, height:900 },
  { name:'Windows 1536×864', width:1536, height:864 },
  { name:'Windows 1920×1080', width:1920, height:1080 },
  { name:'Windows 1920×1200', width:1920, height:1200 },
  { name:'Windows 2560×1440', width:2560, height:1440 },
]

for (const viewport of windowsViewports) {
  test(`${viewport.name}: sidebar, versão e overflow`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.goto('/?qa-iphone=1')
    const sidebar = page.getByRole('complementary', { name:'Navegação principal' })
    const productName = sidebar.getByText('Carina - Legal', { exact:true })
    await expect(sidebar).toBeVisible()
    await expect(productName).toBeVisible()
    await expect(sidebar.getByText('Versão 0.1.0', { exact:true })).toBeVisible()
    expect(await productName.evaluate((element) => ({ whiteSpace:getComputedStyle(element).whiteSpace, height:element.getBoundingClientRect().height, lineHeight:parseFloat(getComputedStyle(element).lineHeight) }))).toMatchObject({ whiteSpace:'nowrap' })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await expect(page.getByRole('button', { name:'Terminar sessão' })).toBeVisible()
  })
}
