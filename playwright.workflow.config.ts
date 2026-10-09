import {defineConfig,devices} from '@playwright/test'
import {existsSync} from 'node:fs'
process.env.WORKFLOW_ISOLATED_E2E='1'
export default defineConfig({
 testDir:'./e2e',testMatch:'workflow-integration.spec.ts',workers:1,timeout:30000,
 outputDir:'output/workflow-integration/results',
 use:{baseURL:'http://127.0.0.1:5173',serviceWorkers:'block',launchOptions:{executablePath:process.env.WORKFLOW_CHROMIUM_EXECUTABLE??(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox','--disable-background-networking','--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1']}},
 projects:[{name:'desktop',use:{viewport:{width:1440,height:900}}},{name:'tablet',use:{viewport:{width:768,height:1024},hasTouch:true}},{name:'iphone',use:{...devices['iPhone 13'],defaultBrowserType:'chromium'}},{name:'iphone-landscape',use:{viewport:{width:844,height:390},isMobile:true,hasTouch:true,deviceScaleFactor:3}}],
 webServer:{command:'node node_modules/vite/bin/vite.js --config scripts/workflow/isolated-vite.config.ts',env:{VITE_SUPABASE_URL:'http://127.0.0.1:54321',VITE_SUPABASE_PUBLISHABLE_KEY:'test-publishable-key-not-a-secret',VITE_APP_ENV:'test'},url:'http://127.0.0.1:5173',reuseExistingServer:false},
 reporter:[['list'],['json',{outputFile:'output/workflow-integration/results.json'}]],
})
