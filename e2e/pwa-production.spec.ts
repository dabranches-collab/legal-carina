import { expect, test } from '@playwright/test'

test.skip(!process.env.PWA_PRODUCTION_QA, 'Executado apenas contra o preview de produção local.')

test('preview de produção regista e ativa o service worker', async ({ page }) => {
  await page.goto('/')
  const state=await page.evaluate(async () => {
    const registration=await navigator.serviceWorker.ready
    return { active:Boolean(registration.active), scope:registration.scope, caches:await caches.keys() }
  })
  expect(state.active).toBe(true)
  expect(state.scope).toBe('http://127.0.0.1:4173/')
  expect(state.caches).toContain('legal-carina-shell-v2')
})
