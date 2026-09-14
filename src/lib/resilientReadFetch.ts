import { isTransientNetworkError } from './transientRetry'

export async function resilientReadFetch(input:RequestInfo|URL,init?:RequestInit):Promise<Response>{
  const request=new Request(input,init),url=new URL(request.url)
  const read=request.method==='GET'||request.method==='HEAD'||(request.method==='POST'&&/^\/rest\/v1\/rpc\/(get_|search_)/.test(url.pathname))
  for(let attempt=0;;attempt++){
    try{return await fetch(input instanceof Request?input.clone():input,init)}
    catch(error){
      if(!read||request.signal.aborted||!isTransientNetworkError(error)||attempt>=2)throw error
      await new Promise(resolve=>setTimeout(resolve,400*2**attempt))
    }
  }
}
