import {defineConfig} from '@playwright/test'
import workflow from '../../playwright.workflow.config'
import {resolve} from 'node:path'
const report = ['retry','preview-documents'].includes(process.env.WORKFLOW_REGRESSION_REPORT??'') ? process.env.WORKFLOW_REGRESSION_REPORT : 'results'
export default defineConfig({...workflow,
 testDir: '../../e2e/.isolated',
 testMatch: '**/*.spec.ts',
 webServer: {...workflow.webServer as object, cwd: resolve(import.meta.dirname,'../..')},
 projects: [{name: 'isolated-chromium', use: {viewport: {width:1280,height:720}}}],
 use: {...workflow.use, storageState: {cookies:[],origins:[{origin:'http://127.0.0.1:5173',localStorage:[{name:'carina-release-notes-seen',value:'0.16.1'}]}]}},
 outputDir: `../../output/workflow-regression/${report}-artifacts`,
 reporter: [['list'],['json',{outputFile:resolve(import.meta.dirname,`../../output/workflow-regression/${report}.json`)}]],
})
