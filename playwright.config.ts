import { defineConfig, devices } from '@playwright/test'
import packageJson from './package.json' with { type: 'json' }

const port=Number(process.env.PLAYWRIGHT_PORT??4174)
const productionQa=Boolean(process.env.PWA_PRODUCTION_QA)
const externalServer=Boolean(process.env.PLAYWRIGHT_EXTERNAL_SERVER)

export default defineConfig({
  testDir: './e2e',
  use: { baseURL: `http://127.0.0.1:${port}`, trace: 'on-first-retry', storageState: {cookies:[],origins:[{origin:`http://127.0.0.1:${port}`,localStorage:[{name:'carina-release-notes-seen',value:packageJson.version}]}]} },
  webServer: externalServer ? undefined : {
    command: `node ./node_modules/vite/bin/vite.js ${productionQa?'preview':''} --host 127.0.0.1 --port ${port}`,
    port,
    reuseExistingServer: !process.env.CI,
    env: {
      VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'test-publishable-key-not-a-secret',
      VITE_APP_ENV: 'test',
    },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
