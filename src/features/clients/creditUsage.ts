import type { CreditDetail, ProvisionWork } from './credit'

export type CreditWork = Omit<ProvisionWork,'effective_amount'> & {effective_amount:number|null;client_id:string;billing_entity_id:string;currency:string;billing_scope:string;is_billable:boolean;is_paid:boolean;is_invoiced:boolean;status:string}
export type CreditUsage = {startsOn:string|null;subtotal:number;vat:number;total:number;consumed:number;balance:number;excess:number;minutes:number;missingPrice:number;rows:Array<CreditWork&{balance:number}>}

// Read-only position: service values are counted once, whether or not a note exists.
// The original ledger remains available to the explicit note-issuing workflow.
export function calculateCreditUsage(detail:CreditDetail,work:CreditWork[],vatRate:number,today:string):CreditUsage{
 const {account,movements}=detail
 const startsOn=movements.filter(row=>row.kind==='payment'&&!row.reversed).map(row=>row.movement_date).sort()[0]??null
 const noted=new Set(account.noted_work_ids??[])
 const eligible=work.filter(row=>startsOn&&row.work_date>=startsOn&&row.work_date<=today&&row.client_id===account.client_id&&row.billing_entity_id===account.billing_entity_id&&row.currency===account.currency&&row.billing_scope==='standard'&&row.is_billable&&!row.is_paid&&!row.is_invoiced&&!noted.has(row.id)&&!['cancelled','uncollectible_uninvoiced','uncollectible_invoiced'].includes(row.status)).sort((a,b)=>a.work_date.localeCompare(b.work_date)||a.id.localeCompare(b.id))
 let cents=0
 const ledgerCents=Math.round(Number(account.balance)*100)
 const rows=eligible.map(row=>{cents+=Math.round(Number(row.effective_amount??0)*100);return {...row,balance:Math.max(0,ledgerCents-cents-Math.round(cents*vatRate/100))/100}})
 const vatCents=Math.round(cents*vatRate/100),totalCents=cents+vatCents
 return {startsOn,subtotal:cents/100,vat:vatCents/100,total:totalCents/100,consumed:(Math.round(Number(account.consumed)*100)+Math.min(ledgerCents,totalCents))/100,balance:Math.max(0,ledgerCents-totalCents)/100,excess:Math.max(0,totalCents-ledgerCents)/100,minutes:rows.reduce((n,row)=>n+row.duration_minutes,0),missingPrice:rows.filter(row=>row.effective_amount===null).length,rows}
}
