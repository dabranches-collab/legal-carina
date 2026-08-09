import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 20_000,
  use: { baseURL:process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:5173', trace:'on-first-retry' },
  projects: [{ name:'chromium-local', use:{ ...devices['Desktop Chrome'] } }],
})
