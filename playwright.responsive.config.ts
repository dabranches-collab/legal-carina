import {defineConfig} from '@playwright/test'
import workflow from './playwright.workflow.config'

// Same isolated functional contracts as the workflow suite, across the actual
// viewport matrix. No connection to production, Auth, Storage or Azure.
process.env.WORKFLOW_RESPONSIVE_QA='1'
const phones=[
 {name:'se-old',width:320,height:568},
 {name:'se',width:375,height:667},
 {name:'iphone',width:390,height:844},
 {name:'pro',width:393,height:852},
 {name:'plus',width:414,height:896},
 {name:'pro-max',width:430,height:932},
]
const desktop=[[1280,800],[1366,768],[1440,900],[1536,864],[1920,1080],[1920,1200],[1920,1240],[2560,1440]]
const webkit=process.env.WORKFLOW_RESPONSIVE_BROWSER==='webkit'
const projects=[
 ...phones.flatMap(({name,width,height})=>[
  {name:`phone-${name}`,use:{viewport:{width,height},isMobile:true,hasTouch:true,deviceScaleFactor:3}},
  {name:`landscape-${name}`,use:{viewport:{width:height,height:width},isMobile:true,hasTouch:true,deviceScaleFactor:3}},
 ]),
 ...desktop.map(([width,height])=>({name:`desktop-${width}x${height}`,use:{viewport:{width,height}}})),
 ...[1.25,1.5,2].map(zoom=>({name:`desktop-1920-zoom-${zoom}`,use:{viewport:{width:Math.round(1920/zoom),height:Math.round(1080/zoom)},deviceScaleFactor:zoom}})),
 ...[1.25,1.5].map(zoom=>({name:`desktop-1920x1240-zoom-${zoom}`,use:{viewport:{width:Math.round(1920/zoom),height:Math.round(1240/zoom)},deviceScaleFactor:zoom}})),
 ...[{width:768,height:1024},{width:1024,height:768}].map(viewport=>({name:`tablet-${viewport.width}x${viewport.height}`,use:{viewport,hasTouch:true}})),
 ...[{width:375,height:667},{width:430,height:932},{width:1366,height:768},{width:1920,height:1080}].map(viewport=>({name:`dark-${viewport.width}x${viewport.height}`,use:{viewport,colorScheme:'dark' as const,hasTouch:viewport.width<900,isMobile:viewport.width<900}})),
]
const selected=webkit?projects.filter(project=>/^(phone-|landscape-)/.test(project.name)||project.name==='desktop-1440x900'||/^dark-(375|430)x/.test(project.name)).map(project=>({...project,use:{...project.use,browserName:'webkit' as const}})):projects
export default defineConfig({...workflow,testMatch:'responsive-flows.spec.ts',workers:process.env.CI?2:4,timeout:45000,projects:selected,
 // Match the integrated localhost preview's same-origin service proxy. The
 // isolated server still refuses every unmocked service request with HTTP 403.
 webServer:{...workflow.webServer as object,env:{VITE_SUPABASE_URL:'http://127.0.0.1:5173/supabase-api',VITE_SUPABASE_PUBLISHABLE_KEY:'test-publishable-key-not-a-secret',VITE_APP_ENV:'test'}},
 use:{...workflow.use,trace:'retain-on-failure',...(webkit?{launchOptions:{}}:{})},
 outputDir:'output/responsive-qa-20261010/artifacts',
 reporter:[['list'],['json',{outputFile:'output/responsive-qa-20261010/results.json'}]],
})
