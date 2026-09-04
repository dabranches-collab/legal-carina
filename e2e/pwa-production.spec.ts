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

test('depois de actualizar mostra as alterações até serem fechadas',async({page})=>{
 await page.goto('/')
 await page.evaluate(()=>localStorage.setItem('carina-release-notes-seen','0.7.1'))
 await page.reload()
 const notice=page.getByRole('status',{name:'Alterações da versão instalada'})
 await expect(notice).toContainText(`Aplicação actualizada · ${packageVersion}`)
 await expect(notice.getByRole('listitem').first()).toBeVisible()
 await notice.getByRole('button',{name:'Fechar alterações'}).click()
 await page.reload()
 await expect(notice).toHaveCount(0)
})

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
  const release=await page.evaluate(async()=>{
    const registration=await navigator.serviceWorker.ready
    return new Promise<{version:string;changes:string[]}>((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error('O service worker não devolveu as alterações.')),5000)
      navigator.serviceWorker.addEventListener('message',function receive(event){if(event.data?.type==='RELEASE_NOTES'){clearTimeout(timer);navigator.serviceWorker.removeEventListener('message',receive);resolve(event.data.release)}})
      registration.active?.postMessage({type:'GET_RELEASE_NOTES'})
    })
  })
  expect(release.version).toBe(packageVersion)
  expect(release.changes.length).toBeGreaterThan(0)
  await page.evaluate(async () => {
    const registrations=await navigator.serviceWorker.getRegistrations()
    await Promise.all(registrations.map(registration=>registration.unregister()))
    await Promise.all((await caches.keys()).map(cache=>caches.delete(cache)))
  })
})
