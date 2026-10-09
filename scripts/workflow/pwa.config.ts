import {defineConfig} from '@playwright/test'
import regression from './regression.config'
import {resolve} from 'node:path'
export default defineConfig({...regression,
 testMatch:'pwa-production.spec.ts',
 use:{...regression.use,serviceWorkers:'allow'},
 webServer:{...regression.webServer as object,command:'node node_modules/vite/bin/vite.js preview --config scripts/workflow/isolated-vite.config.ts'},
 outputDir:'../../output/workflow-pwa/results',
 reporter:[['list'],['json',{outputFile:resolve(import.meta.dirname,'../../output/workflow-pwa/results.json')}]],
})
