import {loadEnv} from 'vite'
import {pathToFileURL} from 'node:url'
export function checkDeployEnvironment(env){
 const url=env.VITE_SUPABASE_URL?.trim(),key=env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
 if(url!=='https://vtvvqyebigflgqccbqsw.supabase.co'||!key)throw new Error('Deployment blocked: verified production Supabase URL and publishable key are required.')
 if(!key.startsWith('sb_publishable_')){
  let role;try{role=JSON.parse(Buffer.from(key.split('.')[1],'base64url').toString()).role}catch{}
  if(role!=='anon')throw new Error('Deployment blocked: only a public Supabase key is allowed.')
 }
 if(env.VITE_APP_ENV==='test')throw new Error('Deployment blocked: test configuration cannot be published.')
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 checkDeployEnvironment({...loadEnv('production',process.cwd(),'VITE_'),...process.env})
 console.log('Production public Auth configuration verified; values omitted.')
}
