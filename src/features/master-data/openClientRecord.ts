export function openClientRecord(id:string){
 window.dispatchEvent(new CustomEvent('open-entity-record',{detail:{section:'clients',id}}))
}
