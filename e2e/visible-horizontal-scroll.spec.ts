import { test, expect } from '@playwright/test'

for (const width of [1440, 768, 390]) {
  test(`barra horizontal visível e sincronizada a ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 844 })
    await page.goto('/?qa-iphone=1&qa-demo=1&qa-allocation=1&qa-role=admin&view=clients&clientType=individual&clientMode=list&clientLayout=table')
    const bar = page.getByRole('scrollbar').first()
    await expect(bar).toBeVisible()
    for (const theme of ['claro', 'escuro']) {
      if (theme === 'escuro') await page.getByRole('button', { name: 'Activar modo escuro', exact: true }).click()
      await bar.focus(); await page.keyboard.press('End')
      await expect.poll(() => bar.getAttribute('aria-valuenow')).not.toBe('0')
      const scroll = await bar.evaluate(node => document.getElementById(node.getAttribute('aria-controls')!)!.scrollLeft)
      expect(scroll).toBeGreaterThan(0)
      await page.screenshot({ path: testInfo.outputPath(`horizontal-${theme}.png`) })
      await page.keyboard.press('Home')
      await expect(bar).toHaveAttribute('aria-valuenow', '0')
      const thumb = bar.locator('[data-scroll-thumb]'), bounds = await thumb.boundingBox()
      if (!bounds) throw new Error('Barra sem puxador')
      await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
      await page.mouse.down(); await page.mouse.move(bounds.x + bounds.width / 2 + 60, bounds.y + bounds.height / 2); await page.mouse.up()
      await expect.poll(() => bar.getAttribute('aria-valuenow')).not.toBe('0')
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    }
  })
}

test('barra acompanha o fundo visível de uma tabela longa e desaparece sem excesso de largura', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 844 })
  await page.goto('/?qa-iphone=1&qa-demo=1&qa-allocation=1&qa-role=admin&view=clients&clientType=individual&clientMode=list&clientLayout=table')
  const bar = page.getByRole('scrollbar').first()
  await expect(bar).toBeVisible()
  for (const zoom of [0.8, 1.25, 1.5, 2, 1]) {
    await page.evaluate(value => { document.body.style.zoom = String(value); document.querySelector('table')!.scrollIntoView({ block: 'center' }); window.dispatchEvent(new Event('resize')) }, zoom)
    await expect(bar).toBeVisible()
    // Zoom/resize schedules geometry in requestAnimationFrame; the portal can briefly unmount.
    // Missing geometry must retry and must never satisfy the viewport assertion.
    await expect.poll(async () => { const rect = await bar.boundingBox(); return rect ? rect.x + rect.width : Number.POSITIVE_INFINITY }).toBeLessThanOrEqual(768)
  }
  await bar.evaluate(node => {
    const scroller = document.getElementById(node.getAttribute('aria-controls')!)!
    const body = scroller.querySelector('tbody')!
    for (let i = 0; i < 50; i++) body.append(body.firstElementChild!.cloneNode(true))
  })
  await page.evaluate(() => window.scrollBy(0, 240))
  await expect(bar).toBeVisible()
  await expect.poll(async () => (await bar.boundingBox())?.y ?? Number.POSITIVE_INFINITY).toBeLessThan(844)
  await bar.evaluate(node => {
    const scroller = document.getElementById(node.getAttribute('aria-controls')!)!
    scroller.style.overflowX = 'hidden'
    scroller.querySelector('table')!.style.width = '20px'
    scroller.querySelector('table')!.style.minWidth = '0'
    scroller.querySelector('colgroup')!.remove()
    scroller.querySelectorAll('th,td').forEach(cell => { (cell as HTMLElement).style.width = '0'; (cell as HTMLElement).style.minWidth = '0'; (cell as HTMLElement).style.maxWidth = '0'; cell.textContent = '' })
  })
  await expect(page.getByRole('scrollbar')).toHaveCount(0)
})
