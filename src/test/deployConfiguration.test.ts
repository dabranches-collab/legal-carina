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
 expect(()=>checkDeployEnvironment(env)).not.toThrow()
 })
})
