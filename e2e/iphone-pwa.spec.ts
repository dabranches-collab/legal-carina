import { expect, test } from '@playwright/test'

const models = [
  ['iPhone 17',402,874,59,'Dynamic Island'], ['iPhone Air',420,912,59,'Dynamic Island'],
  ['iPhone 17 Pro',402,874,59,'Dynamic Island'], ['iPhone 17 Pro Max',440,956,59,'Dynamic Island'],
  ['iPhone 17e',390,844,47,'notch'], ['iPhone 16',393,852,59,'Dynamic Island'],
  ['iPhone 16 Plus',430,932,59,'Dynamic Island'], ['iPhone 16 Pro',402,874,62,'Dynamic Island'],
  ['iPhone 16 Pro Max',440,956,62,'Dynamic Island'], ['iPhone 16e',390,844,47,'notch'],
  ['iPhone 13 mini',375,812,47,'notch'],
] as const

test('matriz local expõe modelos e controlos acessíveis', async ({ page }) => {
  await page.goto('/iphone-preview')
  await expect(page.getByRole('heading', { name:'Matriz iPhone' })).toBeVisible()
  await expect(page.getByRole('navigation', { name:'Modelos de iPhone' }).getByRole('button')).toHaveCount(11)
  await expect(page.getByRole('button', { name:'iPhone 17', exact:true })).toHaveAttribute('aria-pressed','true')
  await page.getByRole('button', { name:'iPhone 16 Pro', exact:true }).click()
  await expect(page.getByText('Safe top aplicado: 62px')).toBeVisible()
  await expect(page.locator('.phone')).toHaveClass(/island/)
  await page.getByRole('button', { name:'iPhone 17e', exact:true }).click()
  await expect(page.locator('.phone')).toHaveClass(/notch/)
  await expect(page.locator('.phone')).not.toHaveClass(/island/)
})

for (const [name,width,height,safeTop] of models) {
  test(`${name}: safe area, alvos e overflow`, async ({ page }) => {
    await page.setViewportSize({ width, height })
    await page.goto(`/?qa-iphone=1&safe-top=${safeTop}&safe-bottom=34&display-mode=standalone&theme=light`)
    await expect(page.getByRole('navigation', { name:'Localização' }).getByText('Visão Geral', { exact:true })).toBeVisible()
    const metrics = await page.evaluate(() => {
      const header=document.querySelector<HTMLElement>('header')!
      const title=document.querySelector<HTMLElement>('header nav[aria-label="Localização"]')!
      const root=getComputedStyle(document.documentElement)
      return {
        scrollWidth:document.documentElement.scrollWidth,
        innerWidth:window.innerWidth,
        safeTop:root.getPropertyValue('--safe-top').trim(),
        headerTop:header.getBoundingClientRect().top,
        titleTop:title.getBoundingClientRect().top,
        controls:[...document.querySelectorAll<HTMLElement>('button,input')].map((item)=>item.getBoundingClientRect()).filter((rect)=>rect.width>0&&rect.height>0).map((rect)=>Math.min(rect.width,rect.height)),
      }
    })
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.innerWidth)
    expect(metrics.safeTop).toBe(`${safeTop}px`)
    expect(metrics.headerTop).toBe(0)
    expect(metrics.titleTop).toBeGreaterThan(safeTop)
    expect(metrics.controls.every((size)=>size>=44)).toBe(true)
    await expect(page.getByRole('button', { name:'Abrir navegação' })).toBeVisible()
    await page.getByRole('button', { name:'Abrir navegação' }).click()
    const sidebar=page.getByRole('complementary',{name:'Navegação principal'})
    const justice=sidebar.locator('.sidebar-justice')
    const menu=sidebar.getByRole('navigation').locator(':scope > ul')
    const [justiceBox,menuBox]=await Promise.all([justice.boundingBox(),menu.boundingBox()])
    expect(justiceBox).not.toBeNull()
    expect(menuBox).not.toBeNull()
    expect(justiceBox!.height).toBeLessThanOrEqual(128)
    expect(justiceBox!.y).toBeGreaterThanOrEqual(menuBox!.y+menuBox!.height)
    await page.screenshot({path:`test-results/sidebar-${name.replaceAll(' ','-')}.png`,fullPage:false})
  })
}

test('rotação, tema escuro, texto ampliado e teclado não criam overflow horizontal', async ({ page }) => {
  await page.setViewportSize({ width:844, height:390 })
  await page.goto('/?qa-iphone=1&safe-top=0&safe-right=62&safe-bottom=21&safe-left=62&display-mode=browser&theme=dark')
  await page.evaluate(() => { document.documentElement.style.fontSize='20px' })
  await page.getByRole('button', { name:'Abrir navegação' }).focus()
  await expect(page.getByRole('button', { name:'Abrir navegação' })).toBeInViewport()
  expect(await page.evaluate(() => document.documentElement.scrollWidth<=window.innerWidth)).toBe(true)
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).not.toBe('rgb(246, 245, 241)')
})

test('manifest e service worker de produção são válidos', async ({ request }) => {
  const manifest=await request.get('/manifest.webmanifest')
  expect(manifest.ok()).toBe(true)
  const manifestData=await manifest.json()
  expect(manifestData.display).toBe('standalone')
  expect(manifestData.icons.map((icon:{src:string})=>icon.src)).toEqual([
    '/lady-justice-windows-icon-192.png','/lady-justice-windows-icon-512.png',
  ])
  for(const path of ['/lady-justice-bright-icon-180.png','/lady-justice-windows-icon-192.png','/lady-justice-windows-icon-512.png','/lady-justice-bright-favicon-32.png']){
    const icon=await request.get(path)
    expect(icon.ok()).toBe(true)
    expect(icon.headers()['content-type']).toContain('image/png')
  }
  const worker=await request.get('/sw.js')
  expect(worker.ok()).toBe(true)
  expect(await worker.text()).toContain('SKIP_WAITING')
})

test('dashboard preenchido mantém gráficos contidos e informação mensal acessível', async ({ page }) => {
  const societies = ['CARINA SANTOS', 'LEGAL TEAM', 'MASSIVE SEARCH']
  const monthly = Array.from({ length: 12 }, (_, index) => ({
    label: `2025-${String(index + 9 > 12 ? index - 3 : index + 9).padStart(2, '0')}`,
    value: 5000 + index * 900,
    societies: Object.fromEntries(societies.map((society, societyIndex) => [society, 1000 + index * 200 + societyIndex * 300])),
  }))
  await page.route('**/rest/v1/rpc/**', async (route) => {
    const url = route.request().url()
    if (url.includes('get_dashboard_metric_breakdowns')) {
      await route.fulfill({ contentType: 'application/json', body: '[]' })
      return
    }
    if (url.includes('get_dashboard_overview')) {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify({
        metrics: { minutes: 1200, worked: 9000, invoiced: 7000, paid: 5000, receivable: 2000, uninvoicedCount: 4, unpaidCount: 3, uncollectibleCount: 1, uncollectibleValue: 250, averageRate: 150, activeClients: 8, missingPrice: 2, missingBilling: 1, overrides: 0, importErrors: 0 },
        annual: Array.from({ length: 9 }, (_, index) => ({ label: 2018 + index, value: 10000 + index * 5000, minutes: 1000 })),
        monthly,
        monthlyByYear: [],
        billingAnnual: societies.flatMap((society, societyIndex) => Array.from({ length: 9 }, (_, index) => ({ society, year: 2018 + index, value: 2000 + index * 1000 + societyIndex * 500 }))),
        billingMonthly: societies.flatMap((society, societyIndex) => monthly.map((point, index) => ({ society, period: point.label, value: 1000 + index * 200 + societyIndex * 300 }))),
        latestYear: 2026,
        byClient: Array.from({ length: 10 }, (_, index) => ({ label: `Cliente ${index + 1}`, value: 1000 + index * 100 })),
        byBilling: societies.map((label, index) => ({ label, value: 3000 + index * 1000 })),
        byProfessional: [{ label: 'CARINA', value: 5000 }, { label: 'PAULA', value: 4000 }],
        byArchive: [{ label: 'Sem arquivo', value: 10 }],
        clientTypes: [{ label: 'individual', value: 5 }, { label: 'company', value: 3 }],
      }) })
      return
    }
    await route.fulfill({ contentType: 'application/json', body: '[]' })
  })
  await page.setViewportSize({ width: 430, height: 932 })
  await page.goto('/?qa-iphone=1&safe-top=59&safe-bottom=34&theme=dark')
  await expect(page.getByText('Valor por mês', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  const monthlyChart = page.getByRole('img', { name: 'Valor mensal' })
  await expect(monthlyChart).toBeVisible()
  const firstValue = monthlyChart.locator('xpath=..').locator('[title]').first()
  await expect(firstValue).toHaveAttribute('title', /CARINA SANTOS.*LEGAL TEAM.*MASSIVE SEARCH/s)
})
