import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'

const manifest=JSON.parse(readFileSync(new URL('../public/manifest.webmanifest',import.meta.url),'utf8')) as {id:string;start_url:string;launch_handler:{client_mode:string}}

test('manifest abre e reabre o PWA na Visão geral',()=>{
  expect(manifest.id).toBe('/')
  expect(manifest.start_url).toBe('/?view=overview')
  expect(manifest.launch_handler.client_mode).toBe('navigate-existing')
})

test.skip(!process.env.PWA_PRODUCTION_QA, 'Executado apenas contra o preview de produção local.')

test('preview de produção regista e ativa o service worker', async ({ page }) => {
  await page.goto('/')
  let state:{active:boolean;scope:string;caches:string[]}|undefined
  for(let attempt=0;attempt<3&&!state;attempt+=1){
    try{state=await page.evaluate(async () => {const registration=await navigator.serviceWorker.ready;return { active:Boolean(registration.active),scope:registration.scope,caches:await caches.keys() }})}
    catch{await page.waitForLoadState('domcontentloaded')}
  }
  expect(state).toBeDefined()
  if(!state)return
  expect(state.active).toBe(true)
  expect(state.scope).toBe(new URL('/',page.url()).href)
  expect(state.caches).toContain('carina-legal-shell-0.2.0')
  await page.close()
})
