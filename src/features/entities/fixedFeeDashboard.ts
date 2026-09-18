import type { FixedFeeLine } from '../clients/fixedFeeAnalytics'
import type { ChartPoint } from '../../components/dashboard/Charts'

type Metrics={
 minutes:number;total:number|null;invoiced:number|null;paid:number|null;pending:number|null;averageRate:number|null
 movements?:number;uninvoicedCount?:number;unpaidCount?:number;missingPrice?:number
}

/** Os minutos dos registos já estão no RPC; só o preço único do trabalho é adicional. */
export function mergeFixedFeeMetrics<T extends Metrics>(metrics:T,lines:FixedFeeLine[]):T{
 if(!lines.length)return metrics
 const linked=lines.filter(line=>line.entryId!==null).length
 // Null também pode significar falta de permissão. Só converter para zero quando
 // todos os movimentos visíveis deste universo são os registos deste preço fixo.
 if(metrics.total===null&&metrics.movements!==linked)return metrics
 const cents=(value:number)=>Math.round(value*100)
 const sum=(field:'amount'|'invoiced'|'paid'|'unpaid')=>lines.reduce((value,line)=>value+cents(line[field]),0)
 const total=(cents(metrics.total??0)+sum('amount'))/100
 const invoiced=(cents(metrics.invoiced??0)+sum('invoiced'))/100
 const paid=(cents(metrics.paid??0)+sum('paid'))/100
 const pending=(cents(metrics.pending??0)+sum('unpaid'))/100
 const jobs=new Map<string,{uninvoiced:boolean;unpaid:boolean}>()
 for(const line of lines){const previous=jobs.get(line.jobId)??{uninvoiced:false,unpaid:false};previous.uninvoiced ||= !line.isInvoiced;previous.unpaid ||= line.unpaid>0;jobs.set(line.jobId,previous)}
 return {...metrics,total,invoiced,paid,pending,averageRate:metrics.minutes?Math.round(total*6000/metrics.minutes)/100:null,
  uninvoicedCount:metrics.uninvoicedCount===undefined?undefined:Math.max(0,metrics.uninvoicedCount-linked)+[...jobs.values()].filter(job=>job.uninvoiced).length,
  unpaidCount:metrics.unpaidCount===undefined?undefined:metrics.unpaidCount+[...jobs.values()].filter(job=>job.unpaid).length,
  missingPrice:metrics.missingPrice===undefined?undefined:Math.max(0,metrics.missingPrice-linked)} as T
}

export function mergeFixedFeeSeries(points:ChartPoint[],lines:FixedFeeLine[],period:'annual'|'monthly',segment:'professional'|'billing'|null):ChartPoint[]{
 if(!lines.length)return points
 const key=(date:string)=>period==='annual'?date.slice(0,4):date.slice(0,7)
 const byPeriod=new Map<string,{value:number;societies:Record<string,number>}>()
 for(const point of points){byPeriod.set(String(point.label),{value:Math.round(Number(point.value??0)*100),societies:Object.fromEntries(Object.entries(point.societies??{}).map(([name,value])=>[name,Math.round(value*100)]))})}
 for(const line of lines){const label=key(line.date),current=byPeriod.get(label)??{value:0,societies:{}};current.value+=Math.round(line.amount*100);if(segment){const name=segment==='professional'?line.professionalName??'Responsável não identificado':line.billingEntityName??'Sem sociedade';current.societies[name]=(current.societies[name]??0)+Math.round(line.amount*100)}byPeriod.set(label,current)}
 let labels=[...byPeriod.keys()].sort()
 if(period==='monthly'){
  const latest=labels.at(-1)!,year=Number(latest.slice(0,4)),month=Number(latest.slice(5,7))
  labels=Array.from({length:12},(_,index)=>{const date=new Date(Date.UTC(year,month-12+index,1));return `${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2,'0')}`})
 }
 return labels.map(label=>{const item=byPeriod.get(label)??{value:0,societies:{}};return {label:period==='annual'?Number(label):label,value:item.value/100,...(segment?{societies:Object.fromEntries(Object.entries(item.societies).map(([name,value])=>[name,value/100]))}:{})}})
}
