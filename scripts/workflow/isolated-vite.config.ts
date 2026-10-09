import type { Plugin } from 'vite'
import type {IncomingMessage,ServerResponse} from 'node:http'
import original from '../../vite.config'
const blockServiceRequests = (request: IncomingMessage,response: ServerResponse,next: ()=>void)=>{
 if(/^\/(supabase-api|supabase-functions|api\/document-translation)(\/|\?|$)/.test(request.url??'')){response.statusCode=403;response.end('Blocked by isolated setup');return}next()
}
const denyServices: Plugin = {
 name:'isolated-workflow-services',enforce:'pre',
 configureServer(server){server.middlewares.use(blockServiceRequests)},
 configurePreviewServer(server){server.middlewares.use(blockServiceRequests)},
}
export default {...original,envDir:false,plugins:[denyServices,...(original.plugins??[]).filter(plugin=>!(plugin && typeof plugin==='object' && 'name' in plugin && plugin.name==='local-document-translation'))],server:{host:'127.0.0.1',port:5173,strictPort:true,proxy:{}},preview:{host:'127.0.0.1',port:5173,strictPort:true,proxy:{}}}
