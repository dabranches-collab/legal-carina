import { readIdBatches } from '../../lib/readBatches'
import { supabase } from '../../lib/supabase'
import { allocatedAmounts } from './fixedFeeAllocation'
import { fixedFeeFinancialPosition } from './fixedFeeFinance'

export type FixedFeeJob = { id:string;client_id:string;client_name?:string;client_code?:string;client_type?:string;mixed_client?:boolean;billing_entity_id:string|null;billing_entity_name?:string;title:string;agreed_amount:number;currency:string;status:string;is_invoiced:boolean;is_paid:boolean;invoice_date:string|null;created_at:string;provision_applied?:number;vat_rate?:number|null }
export type FixedFeeWork = { id:string;fixed_fee_job_id:string;professional_id:string;professional_name?:string;client_profile_id?:string;client_type?:string;work_date:string;duration_minutes:number;archive_status?:string|null;activity_description?:string;observations?:string|null }
export type FixedFeeLine = { jobId:string;entryId:string|null;title:string;clientId:string;clientName?:string|null;clientCode?:string|null;activityDescription?:string|null;observations?:string|null;clientType:string|null;mixedClient:boolean;billingEntityId:string|null;billingEntityName:string|null;professionalId:string|null;professionalName:string|null;archiveStatus?:string|null;date:string;minutes:number;amount:number;isInvoiced:boolean;isPaid?:boolean;invoiced:number;paid:number;unpaid:number;uninvoiced:number }
export type FixedFeeTotals = { minutes:number;total:number;invoiced:number;paid:number;unpaid:number;uninvoiced:number }

export function buildFixedFeeLines(jobs:FixedFeeJob[],work:FixedFeeWork[]):FixedFeeLine[]{
 const byJob=new Map<string,FixedFeeWork[]>()
 for(const entry of work){const rows=byJob.get(entry.fixed_fee_job_id)??[];rows.push(entry);byJob.set(entry.fixed_fee_job_id,rows)}
 const lines:FixedFeeLine[]=[]
 for(const job of jobs){if(job.status==='cancelled')continue;if(job.currency!=='EUR')throw new Error('Há trabalhos a preço fixo noutra moeda. Os totais em euros não podem ser somados.')
  const rows=byJob.get(job.id)??[],position=fixedFeeFinancialPosition({agreedAmount:Number(job.agreed_amount),isInvoiced:job.is_invoiced,isPaid:job.is_paid,provisionApplied:Number(job.provision_applied??0),vatRate:job.vat_rate??undefined}),allocated=allocatedAmounts(position.agreed,rows),receivedAllocation=allocatedAmounts(position.received,rows)
  const parts=rows.some(row=>row.duration_minutes>0)?rows:[{id:'unallocated',fixed_fee_job_id:job.id,professional_id:'',work_date:job.created_at.slice(0,10),duration_minutes:0}]
  for(const row of parts){const unallocated=parts.length===1&&row.id==='unallocated',amount=unallocated?position.agreed:allocated.get(row.id)??0,received=unallocated?position.received:receivedAllocation.get(row.id)??0;lines.push({jobId:job.id,entryId:unallocated?null:row.id,title:job.title,clientId:job.client_id,clientName:job.client_name??null,clientCode:job.client_code??null,activityDescription:row.activity_description??null,observations:row.observations??null,clientType:row.client_type??job.client_type??null,mixedClient:job.mixed_client??false,billingEntityId:job.billing_entity_id,billingEntityName:job.billing_entity_name??null,professionalId:row.professional_id||null,professionalName:row.professional_name??null,archiveStatus:row.archive_status??null,date:row.work_date,minutes:row.duration_minutes,amount,isInvoiced:job.is_invoiced,isPaid:job.is_paid,invoiced:job.is_invoiced?amount:0,paid:received,unpaid:job.is_invoiced?amount-received:0,uninvoiced:!job.is_invoiced?amount:0})}
 }
 return lines
}

export function sumFixedFeeLines(lines:FixedFeeLine[],predicate:(line:FixedFeeLine)=>boolean):FixedFeeTotals{
 return lines.filter(predicate).reduce((total,line)=>({minutes:total.minutes+line.minutes,total:total.total+line.amount,invoiced:total.invoiced+line.invoiced,paid:total.paid+line.paid,unpaid:total.unpaid+line.unpaid,uninvoiced:total.uninvoiced+line.uninvoiced}),{minutes:0,total:0,invoiced:0,paid:0,unpaid:0,uninvoiced:0})
}
export function fixedFeeHourlyRate(totals:FixedFeeTotals):number|null{return totals.minutes>0?totals.total*60/totals.minutes:null}

export async function loadFixedFeeLines(filter?:string|{billingEntityId?:string;clientId?:string}):Promise<FixedFeeLine[]>{
 if(!supabase)return[]
 const billingEntityId=typeof filter==='string'?filter:filter?.billingEntityId,clientId=typeof filter==='string'?undefined:filter?.clientId
 const jobs:FixedFeeJob[]=[]
 for(let from=0;;from+=500){let query=supabase.from('fixed_fee_jobs').select('id,client_id,billing_entity_id,title,agreed_amount,currency,vat_rate,status,is_invoiced,is_paid,invoice_date,created_at');if(billingEntityId)query=query.eq('billing_entity_id',billingEntityId);if(clientId)query=query.eq('client_id',clientId);const result=await query.order('id').range(from,from+499);if(result.error){if(result.error.code==='PGRST205'||result.error.code==='42P01'||/fixed_fee_jobs.*schema cache/i.test(result.error.message))return[];throw result.error}const page=(result.data??[]) as FixedFeeJob[];jobs.push(...page);if(page.length<500)break}
 if(!jobs.length)return[]
 const [work,appliedResult]=await Promise.all([
  readIdBatches(jobs.map(job=>job.id),(ids,from,to)=>supabase!.from('work_entries').select('id,fixed_fee_job_id,professional_id,client_profile_id,work_date,duration_minutes,archive_status,activity_description,observations').in('fixed_fee_job_id',ids).order('id').range(from,to)),
  supabase.rpc('get_fixed_fee_provision_totals'),
 ])
 if(appliedResult.error)throw appliedResult.error
 const applied=new Map(((appliedResult.data??[]) as {job_id:string;gross_applied:number}[]).map(row=>[row.job_id,Number(row.gross_applied)]))
 const [billing,people,clients,profiles]=await Promise.all([
  readIdBatches([...new Set(jobs.map(job=>job.billing_entity_id).filter((id):id is string=>Boolean(id)))],(ids,from,to)=>supabase!.from('billing_entities').select('id,name').in('id',ids).order('id').range(from,to)),
  readIdBatches([...new Set(work.map(row=>row.professional_id))],(ids,from,to)=>supabase!.from('professionals').select('id,display_name').in('id',ids).order('id').range(from,to)),
  readIdBatches([...new Set(jobs.map(job=>job.client_id))],(ids,from,to)=>supabase!.from('clients').select('id,client_type,display_name,client_code').in('id',ids).order('id').range(from,to)),
  readIdBatches([...new Set(jobs.map(job=>job.client_id))],(ids,from,to)=>supabase!.from('client_profiles').select('id,client_id,client_type,active').in('client_id',ids).order('id').range(from,to)),
 ])
 const billingNames=new Map(billing.map(row=>[row.id,row.name])),peopleNames=new Map(people.map(row=>[row.id,row.display_name]))
 const defaultTypes=new Map(clients.map(row=>[row.id,row.client_type])),clientNames=new Map(clients.map(row=>[row.id,row.display_name])),clientCodes=new Map(clients.map(row=>[row.id,row.client_code])),profileTypes=new Map(profiles.map(row=>[row.id,row.client_type])),mixedClients=new Set<string>()
 const typesByClient=new Map<string,Set<string>>()
 for(const profile of profiles){if(!profile.active)continue;const types=typesByClient.get(profile.client_id)??new Set<string>();types.add(profile.client_type);typesByClient.set(profile.client_id,types);if(types.size>1)mixedClients.add(profile.client_id)}
 return buildFixedFeeLines(jobs.map(job=>({...job,provision_applied:applied.get(job.id)??0,client_type:defaultTypes.get(job.client_id),client_name:clientNames.get(job.client_id),client_code:clientCodes.get(job.client_id),mixed_client:mixedClients.has(job.client_id),billing_entity_name:job.billing_entity_id?billingNames.get(job.billing_entity_id):undefined})),work.map(row=>({...row,professional_name:peopleNames.get(row.professional_id),client_type:profileTypes.get(row.client_profile_id)})))
}
