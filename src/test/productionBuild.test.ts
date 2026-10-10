import {readFileSync} from 'node:fs'
import {describe,expect,it} from 'vitest'
import {productionBuildEnvironment} from '../../scripts/build-production.mjs'
import {checkDeployEnvironment} from '../../scripts/check-deploy-env.mjs'
import {workflowPreviewEnabled} from '../types/workflowNavigation'

describe('published navigation',()=>{
 it.each([{}, {VITE_WORKFLOW_NAVIGATION:'legacy'}])('enables the published layout independently of terminal configuration %j',environment=>{
  const result=productionBuildEnvironment(environment)
  expect(workflowPreviewEnabled('',false,'production',result.VITE_WORKFLOW_NAVIGATION)).toBe(true)
 })
 it('retains Auth validation and rejects synthetic destinations',()=>{
  const result=productionBuildEnvironment({VITE_SUPABASE_URL:'http://127.0.0.1:54321',VITE_APP_ENV:'test'})
  expect(result.VITE_APP_ENV).toBe('test')
  expect(()=>checkDeployEnvironment(result)).toThrow()
 })
 it('uses the mandatory build for Wrangler publication',()=>{
  const configuration=JSON.parse(readFileSync('wrangler.jsonc','utf8'))
  expect(configuration.build.command).toBe('node ./scripts/build-production.mjs')
 })
})
