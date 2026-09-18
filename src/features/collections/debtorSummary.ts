import { readIdBatches } from '../../lib/readBatches'
import { supabase } from '../../lib/supabase'
import { withTransientRetry } from '../../lib/transientRetry'

export type AttentionEntry={id:string;client_code:string;work_date:string;invoice_date:string|null;duration_minutes:number;effective_amount:number|null}
export type RetainerCharge={client_id:string;period_start:string;invoice_date:string|null;amount:number;currency:string;status:'invoiced'|'pending'}
export type Debtor={id:string;name:string;code:string;unpaidCount:number;unpaidMinutes:number;unpaidAmount:number|null;unpaidPartial:boolean;uninvoicedCount:number;uninvoicedMinutes:number;uninvoicedAmount:number|null;uninvoicedPartial:boolean;retainerCount:number;retainerAmount:number;retainerPendingCount:number;retainerPendingAmount:number;fixedUnpaidCount?:number;fixedUnpaidAmount?:number;fixedPendingCount?:number;fixedPendingAmount?:number;oldestDate:string;oldestKind:'registo'|'avença'|'trabalho'|'avença pendente'|'preço fixo'|'preço fixo pendente';oldestInvoiceDate:string|null}
export type OpenFixedFee={id:string;client_id:string;title:string;agreed_amount:number;currency:string;is_invoiced:boolean;invoice_date:string|null;created_at:string}

type NamedClient={id:string;display_name:string;client_code:string}
type ClientEntry=AttentionEntry&{client_id:string}
const cents=(value:number)=>Math.round(Number(value)*100)
const amount=(sum:number,count:number,priced:number)=>count&&!priced?null:sum/100

export function buildDebtors(unpaid:ClientEntry[],uninvoiced:ClientEntry[],charges:RetainerCharge[],clients:NamedClient[]):Debtor[]{
 const byId=new Map(clients.map(client=>[client.id,{
  id:client.id,name:client.display_name,code:client.client_code,
  unpaidCount:0,unpaidMinutes:0,unpaidCents:0,unpaidPriced:0,
  uninvoicedCount:0,uninvoicedMinutes:0,uninvoicedCents:0,uninvoicedPriced:0,
  retainerCount:0,retainerCents:0,retainerPendingCount:0,retainerPendingCents:0,oldestDate:'',oldestKind:'registo' as Debtor['oldestKind'],oldestInvoiceDate:null as string|null,
 }]))
 const oldest=(row:NonNullable<ReturnType<typeof byId.get>>,date:string,kind:Debtor['oldestKind'],invoiceDate:string|null)=>{
  if(!row.oldestDate||date<row.oldestDate){row.oldestDate=date;row.oldestKind=kind;row.oldestInvoiceDate=invoiceDate}
 }
 for(const entry of unpaid){const row=byId.get(entry.client_id);if(!row)throw new Error('Há registos por receber sem ficha de cliente acessível.');row.unpaidCount++;row.unpaidMinutes+=Number(entry.duration_minutes||0);if(entry.effective_amount!=null){row.unpaidCents+=cents(entry.effective_amount);row.unpaidPriced++}oldest(row,entry.work_date,'registo',entry.invoice_date)}
 for(const entry of uninvoiced){const row=byId.get(entry.client_id);if(!row)throw new Error('Há trabalho por facturar sem ficha de cliente acessível.');row.uninvoicedCount++;row.uninvoicedMinutes+=Number(entry.duration_minutes||0);if(entry.effective_amount!=null){row.uninvoicedCents+=cents(entry.effective_amount);row.uninvoicedPriced++}oldest(row,entry.work_date,'trabalho',null)}
 for(const charge of charges){const row=byId.get(charge.client_id);if(!row)throw new Error('Há prestações em aberto sem ficha de cliente acessível.');if(charge.currency!=='EUR')throw new Error('Existem prestações em moeda diferente de EUR; os totais não podem ser somados.');if(charge.status==='invoiced'){row.retainerCount++;row.retainerCents+=cents(charge.amount);oldest(row,charge.period_start,'avença',charge.invoice_date)}else{row.retainerPendingCount++;row.retainerPendingCents+=cents(charge.amount);oldest(row,charge.period_start,'avença pendente',null)}}
 return [...byId.values()].filter(row=>row.unpaidCount||row.retainerCount||row.uninvoicedCount||row.retainerPendingCount).map(row=>({
  id:row.id,name:row.name,code:row.code,unpaidCount:row.unpaidCount,unpaidMinutes:row.unpaidMinutes,
  unpaidAmount:amount(row.unpaidCents,row.unpaidCount,row.unpaidPriced),unpaidPartial:row.unpaidPriced<row.unpaidCount,
  uninvoicedCount:row.uninvoicedCount,uninvoicedMinutes:row.uninvoicedMinutes,
  uninvoicedAmount:amount(row.uninvoicedCents,row.uninvoicedCount,row.uninvoicedPriced),uninvoicedPartial:row.uninvoicedPriced<row.uninvoicedCount,
  retainerCount:row.retainerCount,retainerAmount:row.retainerCents/100,retainerPendingCount:row.retainerPendingCount,retainerPendingAmount:row.retainerPendingCents/100,
  oldestDate:row.oldestDate,oldestKind:row.oldestKind,oldestInvoiceDate:row.oldestInvoiceDate,
 })).sort((a,b)=>{
  const left=(a.unpaidAmount??0)+(a.uninvoicedAmount??0)+a.retainerAmount+a.retainerPendingAmount
  const right=(b.unpaidAmount??0)+(b.uninvoicedAmount??0)+b.retainerAmount+b.retainerPendingAmount
  return right-left||a.oldestDate.localeCompare(b.oldestDate)||a.name.localeCompare(b.name,'pt-PT')
 })
}

type AttentionResponse={items:AttentionEntry[];total:number}
async function loadOpenRetainerCharges():Promise<RetainerCharge[]>{
 if(!supabase)throw new Error('Ligação ao Supabase indisponível.')
 const charges:RetainerCharge[]=[]
 for(let from=0;;from+=1000){
  const result=await withTransientRetry(()=>supabase!.from('retainer_charges').select('client_id,period_start,invoice_date,amount,currency,status').in('status',['invoiced','pending']).order('id').range(from,from+999))
  if(result.error)throw result.error
  const page=(result.data??[]) as RetainerCharge[];charges.push(...page)
  if(page.length<1000)break
 }
 return charges
}
let cachedDebtors:{rows:Debtor[];expiresAt:number}|null=null
let pendingDebtors:Promise<Debtor[]>|null=null
let cacheUser:string|null=null
const cacheAuthSubscription=supabase?.auth.onAuthStateChange((_event,session)=>{const next=session?.user.id??null;if(next!==cacheUser){cacheUser=next;cachedDebtors=null;pendingDebtors=null}})
if(import.meta.hot)import.meta.hot.dispose(()=>cacheAuthSubscription?.data.subscription.unsubscribe())
export function loadDebtors(force=false):Promise<Debtor[]>{
 if(!force&&cachedDebtors&&cachedDebtors.expiresAt>Date.now())return Promise.resolve(cachedDebtors.rows)
 if(!force&&pendingDebtors)return pendingDebtors
 const request=fetchDebtors().then(rows=>{cachedDebtors={rows,expiresAt:Date.now()+120_000};return rows}).finally(()=>{if(pendingDebtors===request)pendingDebtors=null})
 pendingDebtors=request
 return request
}
async function fetchDebtors():Promise<Debtor[]>{
 if(!supabase)throw new Error('Ligação ao Supabase indisponível.')
 const db=supabase
 const [fast,fixedFees]=await Promise.all([db.rpc('get_receivable_client_summary'),loadOpenFixedFees()])
 if(!fast.error)return mergeFixedFees((fast.data as Debtor[]).map(row=>({...row,unpaidCount:Number(row.unpaidCount),unpaidMinutes:Number(row.unpaidMinutes),unpaidAmount:row.unpaidAmount==null?null:Number(row.unpaidAmount),uninvoicedCount:Number(row.uninvoicedCount),uninvoicedMinutes:Number(row.uninvoicedMinutes),uninvoicedAmount:row.uninvoicedAmount==null?null:Number(row.uninvoicedAmount),retainerCount:Number(row.retainerCount),retainerAmount:Number(row.retainerAmount),retainerPendingCount:Number(row.retainerPendingCount),retainerPendingAmount:Number(row.retainerPendingAmount)})),fixedFees)
 if(fast.error.code!=='PGRST202')throw fast.error
 const [unpaidResult,uninvoicedResult,countsResult,charges]=await Promise.all([
  db.rpc('get_attention_work_entries',{p_kind:'unpaid'}),
  db.rpc('get_attention_work_entries',{p_kind:'uninvoiced'}),
  db.rpc('get_work_attention_counts'),
  loadOpenRetainerCharges(),
 ])
 for(const result of [unpaidResult,uninvoicedResult,countsResult])if(result.error)throw result.error
 const unpaid=unpaidResult.data as AttentionResponse,uninvoiced=uninvoicedResult.data as AttentionResponse
 const counts=countsResult.data as {unpaid:number;uninvoiced:number}
 if(unpaid.items.length!==Number(counts.unpaid)||uninvoiced.items.length!==Number(counts.uninvoiced))throw new Error('A lista excede o limite de registos da consulta. Os totais não foram apresentados por estarem incompletos.')
 const entries=[...unpaid.items,...uninvoiced.items]
 const codes=[...new Set(entries.map(entry=>entry.client_code).filter(Boolean))]
 const codedClients=await readIdBatches(codes,(batch,from,to)=>db.from('clients').select('id,display_name,client_code').in('client_code',batch).order('id').range(from,to))
 const byCode=new Map<string,NamedClient|undefined>()
 for(const client of codedClients)byCode.set(client.client_code,byCode.has(client.client_code)?undefined:client)
 const unresolved=entries.filter(entry=>!byCode.get(entry.client_code))
 const links=unresolved.length?await readIdBatches(unresolved.map(entry=>entry.id),(batch,from,to)=>db.from('work_entries').select('id,client_id').in('id',batch).order('id').range(from,to)):[]
 const clientByEntry=new Map(links.map(link=>[link.id,link.client_id]))
 if(new Set(links.map(link=>link.id)).size!==new Set(unresolved.map(entry=>entry.id)).size)throw new Error('Não foi possível associar todos os registos aos clientes. Os totais não foram apresentados por estarem incompletos.')
 const extraIds=[...new Set([...links.map(link=>link.client_id),...charges.map(charge=>charge.client_id)].filter(id=>!codedClients.some(client=>client.id===id)))]
 const extraClients=await readIdBatches(extraIds,(batch,from,to)=>db.from('clients').select('id,display_name,client_code').in('id',batch).order('id').range(from,to))
 const clients=[...codedClients,...extraClients]
 const withClient=(entry:AttentionEntry):ClientEntry=>({...entry,client_id:byCode.get(entry.client_code)?.id??clientByEntry.get(entry.id)!})
 return mergeFixedFees(buildDebtors(unpaid.items.map(withClient),uninvoiced.items.map(withClient),charges,clients),fixedFees)
}

async function loadOpenFixedFees():Promise<OpenFixedFee[]>{
 if(!supabase)return[]
 const jobs:OpenFixedFee[]=[]
 for(let from=0;;from+=500){const result=await supabase.from('fixed_fee_jobs').select('id,client_id,title,agreed_amount,currency,is_invoiced,invoice_date,created_at').neq('status','cancelled').eq('is_paid',false).order('id').range(from,from+499);if(result.error){if(result.error.code==='PGRST205'||result.error.code==='42P01'||/fixed_fee_jobs.*schema cache/i.test(result.error.message))return[];throw result.error}const page=(result.data??[]) as OpenFixedFee[];jobs.push(...page);if(page.length<500)break}
 return jobs
}
async function mergeFixedFees(rows:Debtor[],jobs:OpenFixedFee[]):Promise<Debtor[]>{
 if(!jobs.length)return rows
 if(!supabase)throw new Error('Ligação ao Supabase indisponível.')
 const byId=new Map(rows.map(row=>[row.id,{...row}]))
 const missing=[...new Set(jobs.map(job=>job.client_id).filter(id=>!byId.has(id)))]
 const clients=await readIdBatches(missing,(batch,from,to)=>supabase!.from('clients').select('id,display_name,client_code').in('id',batch).order('id').range(from,to))
 for(const client of clients)byId.set(client.id,{id:client.id,name:client.display_name,code:client.client_code,unpaidCount:0,unpaidMinutes:0,unpaidAmount:0,unpaidPartial:false,uninvoicedCount:0,uninvoicedMinutes:0,uninvoicedAmount:0,uninvoicedPartial:false,retainerCount:0,retainerAmount:0,retainerPendingCount:0,retainerPendingAmount:0,oldestDate:'',oldestKind:'registo',oldestInvoiceDate:null})
 for(const job of jobs){if(job.currency!=='EUR')throw new Error('Existem trabalhos a preço fixo noutra moeda; os totais não podem ser somados.');const row=byId.get(job.client_id);if(!row)throw new Error('Há trabalhos a preço fixo sem ficha de cliente acessível.');if(job.is_invoiced){row.fixedUnpaidCount=(row.fixedUnpaidCount??0)+1;row.fixedUnpaidAmount=(row.fixedUnpaidAmount??0)+Number(job.agreed_amount)}else{row.fixedPendingCount=(row.fixedPendingCount??0)+1;row.fixedPendingAmount=(row.fixedPendingAmount??0)+Number(job.agreed_amount)}const date=job.invoice_date??job.created_at.slice(0,10);if(!row.oldestDate||date<row.oldestDate){row.oldestDate=date;row.oldestKind=job.is_invoiced?'preço fixo':'preço fixo pendente';row.oldestInvoiceDate=job.invoice_date}}
 return [...byId.values()].sort((a,b)=>((b.unpaidAmount??0)+(b.uninvoicedAmount??0)+b.retainerAmount+b.retainerPendingAmount+(b.fixedUnpaidAmount??0)+(b.fixedPendingAmount??0))-((a.unpaidAmount??0)+(a.uninvoicedAmount??0)+a.retainerAmount+a.retainerPendingAmount+(a.fixedUnpaidAmount??0)+(a.fixedPendingAmount??0))||a.oldestDate.localeCompare(b.oldestDate)||a.name.localeCompare(b.name,'pt-PT'))
}
