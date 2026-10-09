import type { Plugin } from 'vite'
import original from '../../vite.config'
const denyServices: Plugin = {
 name:'isolated-workflow-services',enforce:'pre',
 configureServer(server){server.middlewares.use((request,response,next)=>{
  if(/^\/(supabase-api|supabase-functions|api\/document-translation)(\/|\?|$)/.test(request.url??'')){response.statusCode=403;response.end('Blocked by isolated setup');return}next()
 })},
}
export default {...original,envDir:false,plugins:[denyServices,...(original.plugins??[]).filter(plugin=>!(plugin && typeof plugin==='object' && 'name' in plugin && plugin.name==='local-document-translation'))],server:{host:'127.0.0.1',port:5173,strictPort:true,proxy:{}},preview:{host:'127.0.0.1',port:5173,strictPort:true,proxy:{}}}
