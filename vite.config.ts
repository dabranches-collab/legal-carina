import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync, writeFileSync } from 'node:fs'
import packageJson from './package.json' with { type: 'json' }
import { resolve } from 'node:path'

// A importação torna package.json uma dependência observada pelo Vite: ao subir a
// versão durante o desenvolvimento, o servidor reinicia e actualiza a indicação local.
const packageVersion = packageJson.version
let buildDirectory = resolve('dist')

// https://vite.dev/config/
export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(packageVersion) },
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'version-service-worker',
      apply: 'build',
      configResolved(config) {
        buildDirectory = resolve(config.root, config.build.outDir)
      },
      closeBundle() {
        const serviceWorkerUrl = resolve(buildDirectory, 'sw.js')
        const serviceWorker = readFileSync(serviceWorkerUrl, 'utf8')
        const releaseNotes=JSON.parse(readFileSync(resolve(buildDirectory,'release-notes.json'),'utf8'))
        if(releaseNotes.version!==packageVersion)throw new Error('Actualize as notas da versão antes de publicar.')
        writeFileSync(serviceWorkerUrl, serviceWorker.replaceAll('__APP_VERSION__', packageVersion).replace('/*__RELEASE_NOTES__*/ null',JSON.stringify(releaseNotes)))
      },
    },
    {
      name: 'local-iphone-qa',
      apply: 'serve',
      configureServer(server) {
        server.middlewares.use('/iphone-preview', (_request, response) => {
          response.setHeader('Content-Type', 'text/html; charset=utf-8')
          response.setHeader('Cache-Control', 'no-store')
          response.end(readFileSync(new URL('./qa/iphone-preview.html', import.meta.url), 'utf8'))
        })
        server.middlewares.use('/preview/nota-honorarios-exemplo.pdf', (_request, response) => {
          response.setHeader('Content-Type', 'application/pdf')
          response.setHeader('Content-Disposition', 'inline; filename="nota-honorarios-exemplo.pdf"')
          response.setHeader('Cache-Control', 'no-store')
          response.end(readFileSync(resolve('output/pdf/nota-honorarios-cliente-acores-qa-2026-09-04.pdf')))
        })
      },
    },
  ],
  server: {
    proxy: {
      '/supabase-functions': {
        target: 'https://vtvvqyebigflgqccbqsw.supabase.co',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/supabase-functions/, '/functions'),
        headers: { Origin: 'https://legal-carina.dabranches.workers.dev' },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    exclude: ['e2e/**', 'node_modules/**'],
  },
})
