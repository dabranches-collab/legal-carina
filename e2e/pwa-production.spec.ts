import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'

const manifest=JSON.parse(readFileSync(new URL('../public/manifest.webmanifest',import.meta.url),'utf8')) as {id:string;start_url:string;launch_handler:{client_mode:string}}
const packageVersion=(JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8')) as {version:string}).version

test('manifest abre e reabre o PWA na Visão geral',()=>{
  expect(manifest.id).toBe('/')
  expect(manifest.start_url).toBe('/?view=overview')
  expect(manifest.launch_handler.client_mode).toBe('navigate-existing')
})

test.skip(!process.env.PWA_PRODUCTION_QA, 'Executado apenas contra o preview de produção local.')

test('preview de produção regista e ativa o service worker', async ({ page }) => {
  await page.goto('/')
  const state=await page.evaluate(async () => {
    const timeout=new Promise<never>((_,reject)=>window.setTimeout(()=>reject(new Error('O service worker não ficou pronto em 10 segundos.')),10_000))
    const registration=await Promise.race([navigator.serviceWorker.ready,timeout])
    return { active:Boolean(registration.active),scope:registration.scope,caches:await caches.keys() }
  })
  expect(state.active).toBe(true)
  expect(state.scope).toBe(new URL('/',page.url()).href)
  expect(state.caches).toContain(`carina-legal-shell-${packageVersion}`)
  await page.evaluate(async () => {
    const registrations=await navigator.serviceWorker.getRegistrations()
    await Promise.all(registrations.map(registration=>registration.unregister()))
    await Promise.all((await caches.keys()).map(cache=>caches.delete(cache)))
  })
})
