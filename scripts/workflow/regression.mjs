import {mkdirSync, readFileSync, readdirSync, writeFileSync, rmSync,existsSync} from 'node:fs'
import {resolve, dirname, relative as relativePath} from 'node:path'
import {spawnSync} from 'node:child_process'
import {pathToFileURL} from 'node:url'

const root = resolve(import.meta.dirname, '../..')
const temporary = resolve(root, 'e2e/.isolated')
if (existsSync(temporary)) throw new Error('Há uma execução isolada ou uma pasta anterior; não substituir trabalho existente.')
mkdirSync(temporary, {recursive:true})
try {
 for (const file of readdirSync(resolve(root,'e2e')).filter(name => name.endsWith('.spec.ts') && name !== 'workflow-integration.spec.ts')) {
  const original = resolve(root,'e2e',file)
  let source = readFileSync(original,'utf8')
  if(process.env.WORKFLOW_REGRESSION_PREVIEW==='1') source=source.replace(/\.goto\((['"`])\/\?/g, '.goto($1/?workflow=preview&')
  source = source.replace(/from (['"])@playwright\/test\1/g, "from '../../scripts/workflow/regression-fixture'")
  source = source.replace(/from (['"])(\.\.?\/[^'"]+)\1/g, (match, quote, relative) => {
   if (relative.includes('regression-fixture')) return match
   const target = relativePath(temporary,resolve(dirname(original),relative)).replaceAll('\\','/')
   return `from ${quote}${target.startsWith('.') ? target : './'+target}${quote}`
  })
  source = source.replace(/new URL\((['"])(\.\.?\/[^'"]+)\1,\s*import.meta.url\)/g, (_match, quote, relative) => `new URL(${quote}${pathToFileURL(resolve(dirname(original),relative)).href}${quote})`)
  writeFileSync(resolve(temporary,file), source)
 }
 const production = process.env.WORKFLOW_REGRESSION_PRODUCTION==='1'
 const env = {...process.env, AZURE_TRANSLATION_LIVE_QA:'0', PWA_PRODUCTION_QA:production?'1':'', PLAYWRIGHT_EXTERNAL_SERVER:'', DESKTOP_LAYOUT_ROUTES:''}
 const result = spawnSync(process.execPath, [resolve(root,'node_modules/@playwright/test/cli.js'),'test','--config',production?'scripts/workflow/pwa.config.ts':'scripts/workflow/regression.config.ts',...process.argv.slice(2)], {cwd:root,env,stdio:'inherit'})
 process.exitCode = result.status ?? 1
} finally {
 rmSync(temporary, {recursive:true,force:true})
}
