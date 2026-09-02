export type CreditAccount = { id:string; client_id:string; client_name:string; billing_entity_id:string; society_name:string; currency:string; received:number; consumed:number; balance:number; noted_work_ids?:string[] }
export type ProvisionWork = { id:string; work_date:string; activity_description:string; duration_minutes:number; effective_amount:number }
export type ProvisionNote = { id:string; number:string; issued_at:string; subtotal:number; vat_rate:number; vat:number; total:number; deducted:number; remaining:number; balance_after:number; items:ProvisionWork[]; document_options?:{client_name?:string;society_name?:string} }
export type CreditMovement = { id:string; recorded_at:string; movement_date:string; kind:'payment'|'consumption'|'reversal'; amount:number; reference:string; note_id:string|null; note:ProvisionNote|null; reverses_id:string|null; reversed:boolean }
export type CreditDetail = { account:CreditAccount; movements:CreditMovement[] }
export const creditMoney=(value:number,currency='EUR')=>new Intl.NumberFormat('pt-PT',{style:'currency',currency}).format(value)
export const creditDate=(date:string)=>date.slice(0,10).split('-').reverse().join('/')
export const creditKind=(kind:CreditMovement['kind'])=>({payment:'Provisão recebida',consumption:'Nota de Honorários',reversal:'Estorno'}[kind])
export function creditStatement(movements:CreditMovement[],from='',to=''){
  // Ledger order is immutable; backdated receipts retain their actual posting order.
  let balance=0,opening=0
  const rows:Array<CreditMovement&{balance:number}>=[]
  for(const movement of movements){
    balance=Math.round((balance+Number(movement.amount))*100)/100
    const date=movement.recorded_at.slice(0,10)
    if(from&&date<from)opening=balance
    else if(!to||date<=to)rows.push({...movement,balance})
  }
  return {opening,rows,closing:rows.at(-1)?.balance??opening}
}
export function provisionTotals(subtotal:number,vatRate:number,balance:number){
  const base=Math.round(subtotal*100),vat=Math.round(base*vatRate/100),total=base+vat
  const deducted=Math.min(total,Math.max(0,Math.round(balance*100)))
  return {subtotal:base/100,vat:vat/100,total:total/100,deducted:deducted/100,remaining:(total-deducted)/100,balance_after:(Math.round(balance*100)-deducted)/100}
}
