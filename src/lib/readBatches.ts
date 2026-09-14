import { withTransientRetry } from './transientRetry'

// UUID lists must stay below proxy/browser URL limits. Paginate child rows too:
// one work entry can have more than one thousand expenses.
export async function readIdBatches<T>(ids:string[],read:(ids:string[],from:number,to:number)=>PromiseLike<{data:T[]|null;error:{message:string;code?:string}|null}>):Promise<T[]> {
  const unique=[...new Set(ids)],pages:T[][]=[]
  let cursor=0
  await Promise.all(Array.from({length:Math.min(3,Math.ceil(unique.length/80))},async()=>{
    while(cursor<unique.length){
      const index=cursor;cursor+=80
      const batch=unique.slice(index,index+80),rows:T[]=[]
      for(let from=0;;from+=1000){
        const result=await withTransientRetry(()=>read(batch,from,from+999))
        if(result.error)throw new Error(result.error.message)
        const page=result.data??[];rows.push(...page)
        if(page.length<1000)break
      }
      pages[index/80]=rows
    }
  }))
  return pages.flat()
}
