import { loadEnv, type Plugin } from 'vite'
import { handleDocumentTranslation } from './documentTranslation.ts'

export function localTranslation():Plugin {
  return {name:'local-document-translation',apply:'serve',configureServer(server){
    const env=loadEnv(server.config.mode,server.config.root,'OPENAI_API_KEY')
    const limits=new Map<string,{count:number;until:number}>()
    server.middlewares.use('/api/document-translation',async(incoming,outgoing)=>{
      try{
        const origin=`http://${incoming.headers.host}`
        const chunks:Buffer[]=[];let size=0
        for await(const chunk of incoming){size+=chunk.length;if(size>100000){outgoing.writeHead(413);outgoing.end();return}chunks.push(chunk)}
        const headers=new Headers()
        for(const [name,value] of Object.entries(incoming.headers))if(typeof value==='string')headers.set(name,value)
        const request=new Request(`${origin}/api/document-translation`,{method:incoming.method,headers,body:incoming.method==='POST'?Buffer.concat(chunks):undefined})
        const response=await handleDocumentTranslation(request,{OPENAI_API_KEY:env.OPENAI_API_KEY,TRANSLATION_LIMITER:{async limit({key}){
          const now=Date.now();for(const [id,entry] of limits)if(entry.until<now)limits.delete(id)
          const entry=limits.get(key)??{count:0,until:now+60000};entry.count++;limits.set(key,entry);return {success:entry.count<=60}
        }}})
        outgoing.writeHead(response.status,Object.fromEntries(response.headers));outgoing.end(await response.text())
      }catch{outgoing.writeHead(502,{'Content-Type':'application/json'});outgoing.end(JSON.stringify({error:'Não foi possível traduzir o documento.'}))}
    })
  }}
}
