import { defineConfig, devices } from '@playwright/test'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

// Cenários separados da suite operacional. Nenhum serviço real é utilizado.
export default defineConfig({
  testDir: './qa',
  testMatch: '**/*.scenario.ts',
  timeout: 30000,
  workers: 1,
  outputDir: '../../output/workflow-qa/results',
  reporter: [['list'], ['json', { outputFile: resolve(import.meta.dirname, '../../output/workflow-qa/results.json') }]],
  use: { baseURL: 'http://127.0.0.1:5175', trace: 'retain-on-failure', launchOptions: { executablePath: process.env.WORKFLOW_CHROMIUM_EXECUTABLE ?? (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined), args: ['--no-sandbox'] } },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'tablet', use: { viewport: { width: 768, height: 1024 }, hasTouch: true } },
    { name: 'iphone', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
    { name: 'iphone-landscape', use: { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 } },
  ],
})
