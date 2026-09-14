// Exerce fetch e os bindings no workerd. Só os serviços externos são simulados.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
const require = createRequire(import.meta.resolve('wrangler/package.json'))
const { Miniflare, convertV4MiniflareOptions } = require('miniflare')
const { build } = require('esbuild')
const root = fileURLToPath(new URL('../', import.meta.url))
const { outputFiles } = await build({
  stdin: { contents: "import {handleDocumentTranslation} from './worker/documentTranslation.ts'; export default {fetch:handleDocumentTranslation}", resolveDir: root },
  bundle: true, format: 'esm', write: false,
})
const id = '00000000-0000-4000-8000-000000000001'
const clientId = '00000000-0000-4000-8000-000000000002'
const items = [{ id, kind: 'work', text: 'Reunião de 30 minutos.' }, { id: clientId, kind: 'expense', text: 'Correio registado.' }]
let redirect = false, providerCalls = 0, redirectedCalls = 0
const runtime = new Miniflare(convertV4MiniflareOptions({
  modules: true, script: outputFiles[0].text, compatibilityDate: '2026-08-16',
  bindings: { AZURE_TRANSLATOR_KEY: 'synthetic-key', AZURE_TRANSLATOR_REGION: 'northeurope' },
  ratelimits: { TRANSLATION_LIMITER: { namespace_id: '1001', simple: { limit: 60, period: 60 } } },
  outboundService: async request => {
    const url = new URL(request.url)
    if (url.hostname === 'vtvvqyebigflgqccbqsw.supabase.co') {
      if (url.pathname === '/auth/v1/user') return Response.json({ id: 'synthetic-user' })
      if (url.pathname === '/rest/v1/work_entries') return Response.json([{ id, activity_description: items[0].text }])
      if (url.pathname === '/rest/v1/work_entry_expenses') return Response.json([{ id: clientId, observations: items[1].text }])
    }
    if (url.hostname === 'api.cognitive.microsofttranslator.com') {
      providerCalls++
      if (redirect) return new Response(null, { status: 307, headers: { Location: 'https://redirect.invalid/' } })
      assert.equal(request.headers.get('Ocp-Apim-Subscription-Key'), 'synthetic-key')
      const body = await request.json(), to = url.searchParams.get('to')
      assert.equal(body.length, 2)
      return Response.json(body.map(({ Text }) => ({ translations: [{ to, text: Text.replace('Reunião', to === 'en' ? 'Meeting' : 'Réunion').replace('Correio registado', to === 'en' ? 'Registered post' : 'Courrier recommandé') }] })))
    }
    redirectedCalls++
    return new Response(null, { status: 500 })
  },
}))
try {
  for (const language of ['en', 'fr']) {
    const response = await runtime.dispatchFetch('https://example.test/api/document-translation', {
      method: 'POST', headers: { Origin: 'https://example.test', Authorization: 'Bearer synthetic-token', apikey: 'synthetic-public-key', 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, language, items }),
    })
    assert.equal(response.status, 200, await response.clone().text())
    const result = await response.json()
    assert.equal(result.items.length, 2)
    assert.match(result.items[0].text, language === 'en' ? /^Meeting/ : /^Réunion/)
    assert.match(result.items[0].text, /30/)
    assert.equal(result.items[1].kind, 'expense')
  }
  redirect = true
  const response = await runtime.dispatchFetch('https://example.test/api/document-translation', {
    method: 'POST', headers: { Origin: 'https://example.test', Authorization: 'Bearer synthetic-token', apikey: 'synthetic-public-key', 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId, language: 'en', items }),
  })
  assert.equal(response.status, 502)
  assert.equal(providerCalls, 3)
  assert.equal(redirectedCalls, 0, 'Um redireccionamento não pode receber textos ou credenciais.')
  console.log('workerd: tradução EN/FR, movimentos/despesas e recusa de redireccionamentos aprovadas.')
} finally { await runtime.dispose() }
