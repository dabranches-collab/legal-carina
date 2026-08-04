import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  use: { baseURL: 'http://127.0.0.1:4174', trace: 'on-first-retry' },
  webServer: {
    command: 'node ./node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4174',
    port: 4174,
    reuseExistingServer: !process.env.CI,
    env: {
      VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'test-publishable-key-not-a-secret',
      VITE_APP_ENV: 'test',
    },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
