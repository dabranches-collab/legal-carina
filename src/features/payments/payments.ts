export const paymentCategories = {
  unbilled: 'Registos não facturados',
  work: 'Registos facturados não pagos',
  note: 'Notas de honorários não pagas',
  retainer: 'Avenças não pagas',
} as const
export type PaymentCategory = keyof typeof paymentCategories
export type PaymentItem = {
  id: string; category: PaymentCategory; client_id: string; client_name: string;
  society_name: string; title: string; date: string; currency: string;
  total: number | null; received: number; deducted: number; remaining: number | null;
  token: string; can_pay: boolean; can_edit: boolean; status: string;
  revision?: number; fixed_fee_job_id?: string | null; note_associated?: boolean;
}
export type PaymentReceipt = { id: string; amount: number; received_on: string; reference: string }
export type PaymentDetail = { charge?:import('../master-data/RetainerChargeDialog').RetainerCharge; item: PaymentItem; receipts: PaymentReceipt[]; items: Array<{id:string;activity_description:string;effective_amount:number}> }
export const money = (value:number|null,currency:string) => value===null?'Por definir':new Intl.NumberFormat('pt-PT',{style:'currency',currency}).format(value)
export function paymentAmount(value:string):number|null {
  if(!/^\d+(?:[,.]\d{1,2})?$/.test(value.trim()))return null
  const amount=Number(value.replace(',','.'))
  return Number.isFinite(amount)&&amount>0&&amount<=1e9?Math.round(amount*100)/100:null
}
export function paymentCounts(rows:PaymentItem[]){
  const counts={unbilled:0,work:0,note:0,retainer:0}
  for(const row of rows)counts[row.category]++
  return counts
}
