import {createHash} from 'node:crypto'
import {loadEnv} from 'vite'
import {pathToFileURL} from 'node:url'
export function checkDeployEnvironment(env,expectedKeyFingerprint='7f07f872586c39b1af300a771985f3052a6c2faeebc50d224ecdd0653d4dbfee'){
 const url=env.VITE_SUPABASE_URL?.trim(),key=env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
 if(url!=='https://vtvvqyebigflgqccbqsw.supabase.co'||!key)throw new Error('Deployment blocked: verified production Supabase URL and publishable key are required.')
 if(!key.startsWith('sb_publishable_')){
  let role;try{role=JSON.parse(Buffer.from(key.split('.')[1],'base64url').toString()).role}catch{}
  if(role!=='anon')throw new Error('Deployment blocked: only a public Supabase key is allowed.')
 }
 if(createHash('sha256').update(key).digest('hex')!==expectedKeyFingerprint)throw new Error('Deployment blocked: public key does not match the verified production project.')
 if(env.VITE_APP_ENV==='test')throw new Error('Deployment blocked: test configuration cannot be published.')
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 checkDeployEnvironment({...loadEnv('production',process.cwd(),'VITE_'),...process.env})
 console.log('Production public Auth configuration verified; values omitted.')
}
