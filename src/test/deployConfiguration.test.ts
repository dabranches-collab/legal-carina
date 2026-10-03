import{createHash}from'node:crypto'
import{describe,expect,it}from'vitest'
import{checkDeployEnvironment}from'../../scripts/check-deploy-env.mjs'
const env={VITE_SUPABASE_URL:'https://vtvvqyebigflgqccbqsw.supabase.co',VITE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_synthetic_test_only'}
describe('deployment public configuration gate',()=>{
 it('blocks missing, wrong-project and test builds',()=>{
 expect(()=>checkDeployEnvironment({})).toThrow()
 expect(()=>checkDeployEnvironment({...env,VITE_SUPABASE_URL:'http://127.0.0.1:54321'})).toThrow()
 expect(()=>checkDeployEnvironment({...env,VITE_APP_ENV:'test'})).toThrow()
 })
 it('rejects private keys and accepts a public configuration',()=>{
 expect(()=>checkDeployEnvironment({...env,VITE_SUPABASE_PUBLISHABLE_KEY:'sb_secret_synthetic'})).toThrow()
 expect(()=>checkDeployEnvironment(env)).toThrow('does not match')
 const syntheticFingerprint=createHash('sha256').update(env.VITE_SUPABASE_PUBLISHABLE_KEY).digest('hex')
 expect(()=>checkDeployEnvironment(env,syntheticFingerprint)).not.toThrow()
 expect(()=>checkDeployEnvironment({...env,VITE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_other_project'},syntheticFingerprint)).toThrow('does not match')
 })
})
