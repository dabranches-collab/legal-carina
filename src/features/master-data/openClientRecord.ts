export function openClientRecord(id:string,clientPage?:'fixedFees'){
 window.dispatchEvent(new CustomEvent('open-entity-record',{detail:{section:'clients',id,clientPage}}))
}
