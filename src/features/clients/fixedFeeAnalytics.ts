import { readIdBatches } from '../../lib/readBatches'
import { supabase } from '../../lib/supabase'
import { allocatedAmounts } from './fixedFeeAllocation'
import { fixedFeeFinancialPosition } from './fixedFeeFinance'

export type FixedFeeJob = { id:string;client_id:string;billing_entity_id:string|null;title:string;agreed_amount:number;currency:string;status:string;is_invoiced:boolean;is_paid:boolean;invoice_date:string|null;created_at:string;provision_applied?:number;vat_rate?:number|null }
export type FixedFeeWork = { id:string;fixed_fee_job_id:string;professional_id:string;work_date:string;duration_minutes:number }
export type FixedFeeLine = { jobId:string;clientId:string;billingEntityId:string|null;professionalId:string|null;date:string;minutes:number;amount:number;invoiced:number;paid:number;unpaid:number;uninvoiced:number }
export type FixedFeeTotals = { minutes:number;total:number;invoiced:number;paid:number;unpaid:number;uninvoiced:number }

export function buildFixedFeeLines(jobs:FixedFeeJob[],work:FixedFeeWork[]):FixedFeeLine[]{
 const byJob=new Map<string,FixedFeeWork[]>()
 for(const entry of work){const rows=byJob.get(entry.fixed_fee_job_id)??[];rows.push(entry);byJob.set(entry.fixed_fee_job_id,rows)}
 const lines:FixedFeeLine[]=[]
 for(const job of jobs){if(job.status==='cancelled')continue;if(job.currency!=='EUR')throw new Error('Há trabalhos a preço fixo noutra moeda. Os totais em euros não podem ser somados.')
  const rows=byJob.get(job.id)??[],position=fixedFeeFinancialPosition({agreedAmount:Number(job.agreed_amount),isInvoiced:job.is_invoiced,isPaid:job.is_paid,provisionApplied:Number(job.provision_applied??0),vatRate:job.vat_rate??undefined}),allocated=allocatedAmounts(position.agreed,rows),receivedAllocation=allocatedAmounts(position.received,rows)
  const parts=rows.some(row=>row.duration_minutes>0)?rows:[{id:'unallocated',fixed_fee_job_id:job.id,professional_id:'',work_date:job.created_at.slice(0,10),duration_minutes:0}]
  for(const row of parts){const unallocated=parts.length===1&&row.id==='unallocated',amount=unallocated?position.agreed:allocated.get(row.id)??0,received=unallocated?position.received:receivedAllocation.get(row.id)??0;lines.push({jobId:job.id,clientId:job.client_id,billingEntityId:job.billing_entity_id,professionalId:row.professional_id||null,date:row.work_date,minutes:row.duration_minutes,amount,invoiced:job.is_invoiced?amount:0,paid:received,unpaid:job.is_invoiced?amount-received:0,uninvoiced:!job.is_invoiced?amount:0})}
 }
 return lines
}

export function sumFixedFeeLines(lines:FixedFeeLine[],predicate:(line:FixedFeeLine)=>boolean):FixedFeeTotals{
 return lines.filter(predicate).reduce((total,line)=>({minutes:total.minutes+line.minutes,total:total.total+line.amount,invoiced:total.invoiced+line.invoiced,paid:total.paid+line.paid,unpaid:total.unpaid+line.unpaid,uninvoiced:total.uninvoiced+line.uninvoiced}),{minutes:0,total:0,invoiced:0,paid:0,unpaid:0,uninvoiced:0})
}
export function fixedFeeHourlyRate(totals:FixedFeeTotals):number|null{return totals.minutes>0?totals.total*60/totals.minutes:null}

export async function loadFixedFeeLines():Promise<FixedFeeLine[]>{
 if(!supabase)return[]
 const jobs:FixedFeeJob[]=[]
 for(let from=0;;from+=500){const result=await supabase.from('fixed_fee_jobs').select('id,client_id,billing_entity_id,title,agreed_amount,currency,vat_rate,status,is_invoiced,is_paid,invoice_date,created_at').order('id').range(from,from+499);if(result.error){if(result.error.code==='PGRST205'||result.error.code==='42P01'||/fixed_fee_jobs.*schema cache/i.test(result.error.message))return[];throw result.error}const page=(result.data??[]) as FixedFeeJob[];jobs.push(...page);if(page.length<500)break}
 if(!jobs.length)return[]
 const work=await readIdBatches(jobs.map(job=>job.id),(ids,from,to)=>supabase!.from('work_entries').select('id,fixed_fee_job_id,professional_id,work_date,duration_minutes').in('fixed_fee_job_id',ids).order('id').range(from,to))
 return buildFixedFeeLines(jobs,work)
}
