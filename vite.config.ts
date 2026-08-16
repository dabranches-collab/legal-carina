import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync, writeFileSync } from 'node:fs'

const packageVersion = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version as string

// https://vite.dev/config/
export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(packageVersion) },
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'version-service-worker',
      apply: 'build',
      closeBundle() {
        const serviceWorkerUrl = new URL('./dist/sw.js', import.meta.url)
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
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    exclude: ['e2e/**', 'node_modules/**'],
  },
})
