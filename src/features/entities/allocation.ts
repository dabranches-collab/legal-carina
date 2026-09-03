import { professionalName, referrerNames, type Referrer } from '../../lib/professionalNames'

export type AllocationWork = {id:string;work_date:string;client_name:string;professional_name:string;activity_description:string;duration_minutes:number;effective_amount:number|null;currency:string;billing_scope:string;is_billable:boolean;is_paid:boolean;status:string;client_referrer:Referrer|null;task_referrer:Referrer|'other'|null;task_referrer_other:string|null}
export type AllocationPerson = {id:string;name:string;minutes:number;client:number;task:number;execution:number;total:number}
export type AllocationRow = AllocationWork & {clientRecipient:string;taskRecipient:string;clientShare:number;taskShare:number;executionShare:number;officeShare:number;amount:number;pending:boolean}
export function allocateHonoraria(work:AllocationWork[],paidOnly=false){
 const people=new Map<string,AllocationPerson>(),rows:AllocationRow[]=[]
 let total=0,office=0,unassigned=0,missingPrice=0,retainerMinutes=0
 const recipient=(name:string)=>{const label=professionalName(name),id=label.normalize('NFC').trim().toLocaleLowerCase('pt-PT');if(!people.has(id))people.set(id,{id,name:label,minutes:0,client:0,task:0,execution:0,total:0});return people.get(id)!}
 for(const entry of work){
  if(['cancelled','uncollectible_uninvoiced','uncollectible_invoiced'].includes(entry.status)||(paidOnly&&!entry.is_paid))continue
  const executor=recipient(entry.professional_name||'Responsável por identificar')
  executor.minutes+=entry.duration_minutes
  if(entry.billing_scope==='retainer'){retainerMinutes+=entry.duration_minutes;continue}
  if(!entry.is_billable)continue
  if(entry.effective_amount==null||!Number.isFinite(Number(entry.effective_amount))||Number(entry.effective_amount)<0){missingPrice++;continue}
  const cents=Math.round(Number(entry.effective_amount)*100)
  // Largest remainder: each service is fully allocated, even for very small amounts.
  const exact=[10,10,50,30].map(p=>cents*p/100),shares=exact.map(Math.floor)
  const order=exact.map((n,i)=>({i,f:n-shares[i]})).sort((a,b)=>b.f-a.f||a.i-b.i)
  const remainder=cents-shares.reduce((a,b)=>a+b,0)
  for(let n=0;n<remainder;n++)shares[order[n].i]++
  const [clientShare,taskShare,executionShare,officeShare]=shares
  const clientRecipient=entry.client_referrer?referrerNames[entry.client_referrer]:''
  const taskRecipient=entry.task_referrer==='other'?entry.task_referrer_other?.trim()??'':entry.task_referrer?referrerNames[entry.task_referrer]:''
  if(clientRecipient)recipient(clientRecipient).client+=clientShare;else unassigned+=clientShare
  if(taskRecipient)recipient(taskRecipient).task+=taskShare;else unassigned+=taskShare
  if(entry.professional_name)executor.execution+=executionShare;else unassigned+=executionShare
  total+=cents;office+=officeShare
  rows.push({...entry,clientRecipient:clientRecipient||'Por identificar',taskRecipient:taskRecipient||'Por identificar',clientShare,taskShare,executionShare,officeShare,amount:cents,pending:!clientRecipient||!taskRecipient||!entry.professional_name})
 }
 for(const person of people.values())person.total=person.client+person.task+person.execution
 return {people:[...people.values()].sort((a,b)=>a.name.localeCompare(b.name,'pt-PT')),rows,total,office,unassigned,missingPrice,retainerMinutes}
}
