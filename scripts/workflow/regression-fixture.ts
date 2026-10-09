import {test as base, expect} from '@playwright/test'

// Installed before the original test's routes. Those routes may fulfil synthetic
// responses; an unmocked request can only reach the isolated Vite server.
export const test = base.extend<{isolation: void}>({
 isolation: [async ({context, request}, use) => {
  for (const path of ['/supabase-api/auth/v1/user','/supabase-functions/v1/test','/api/document-translation']) {
   const response = await request.get(path)
   expect(response.status()).toBe(403)
   expect(await response.text()).toBe('Blocked by isolated setup')
  }
  const external: string[] = []
  await context.route('**/*', async route => {
   const url = new URL(route.request().url())
   if (url.origin === 'http://127.0.0.1:5173' && !/^\/(supabase-api|supabase-functions|api\/document-translation)/.test(url.pathname)) return route.continue()
   if (url.origin !== 'http://127.0.0.1:54321') external.push(url.origin + url.pathname)
   return route.abort('blockedbyclient')
  })
  await context.routeWebSocket(/.*/, socket => socket.close())
  await use()
  expect(external, 'Pedidos externos sem resposta simulada').toEqual([])
 }, {auto: true}],
})
export {expect} from '@playwright/test'
