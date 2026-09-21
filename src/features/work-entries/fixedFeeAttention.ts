import type { FixedFeeLine } from '../clients/fixedFeeAnalytics'

export type FilterSummary={minutes:number;amount:number;priced:number;count:number}
export type AttentionSummaryFilters={search?:string|null;year?:number|null;professionalId?:string|null;billingEntityId?:string|null;archive?:string|null;clientType?:string|null;clientId?:string|null}

export function mergeFixedFeeAttentionSummaries(base:Record<string,FilterSummary>,lines:FixedFeeLine[],filters:AttentionSummaryFilters={}){
 const result=Object.fromEntries(Object.entries(base).map(([key,value])=>[key,{...value}]))
 const query=filters.search?.trim().toLocaleLowerCase('pt-PT')??''
 for(const line of lines){
  if(!line.entryId)continue
  if(filters.year&&Number(line.date.slice(0,4))!==filters.year)continue
  if(filters.professionalId&&line.professionalId!==filters.professionalId)continue
  if(filters.billingEntityId&&line.billingEntityId!==filters.billingEntityId)continue
  if(filters.archive&&line.archiveStatus!==filters.archive)continue
  if(filters.clientId&&line.clientId!==filters.clientId)continue
  if(filters.clientType&&(filters.clientType==='mixed'?!line.mixedClient:line.clientType!==filters.clientType))continue
  if(query&&![line.title,line.clientName,line.professionalName,line.billingEntityName].some(value=>value?.toLocaleLowerCase('pt-PT').includes(query)))continue
  const key=line.isInvoiced?'unpaid':'uninvoiced',amount=line.isInvoiced?line.unpaid:line.uninvoiced
  const current=result[key]??{minutes:0,amount:0,priced:0,count:0}
  result[key]={minutes:current.minutes+line.minutes,amount:current.amount+amount,priced:current.priced+(line.amount>0?1:0),count:current.count+1}
 }
 return result
}
