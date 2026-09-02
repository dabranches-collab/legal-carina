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
        writeFileSync(serviceWorkerUrl, serviceWorker.replaceAll('__APP_VERSION__', packageVersion))
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
