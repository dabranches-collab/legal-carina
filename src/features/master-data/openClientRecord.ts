export function openClientRecord(id:string){
 const query=new URLSearchParams(window.location.search)
 query.set('view','master-data');query.set('entity','clients');query.set('record',id)
 for(const key of ['society','billingEntityId','professional','professionalId','clientType','clientMode'])query.delete(key)
 window.history.pushState({},'',`?${query}`)
 window.dispatchEvent(new PopStateEvent('popstate'))
}
