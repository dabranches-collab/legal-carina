import type { CreditAccount, ProvisionNote } from './credit'

export type HonorariumDocument=ProvisionNote&{
 document_id:string;revision:number;client_id:string;billing_entity_id:string;
 society_name:string;currency:string;is_current:boolean;voided:boolean;
 credit_note_id:string|null;credit_note:ProvisionNote|null;credit_active:boolean;
 document_options:Record<string,unknown>;
}
export const documentIsVoided=(note:HonorariumDocument)=>note.voided||Boolean(note.credit_note_id&&!note.credit_active)
export function noteCreditPreview(rows:Array<{id:string;effective_amount:number|null;is_invoiced?:boolean;is_paid?:boolean}>,vatRate:number,account:CreditAccount|undefined,history:HonorariumDocument[],revision:HonorariumDocument|null,apply:boolean){
 const round=(v:number)=>Math.round((v+Number.EPSILON)*100)/100
 const subtotal=round(rows.reduce((sum,row)=>sum+Number(row.effective_amount??0),0)),vat=round(subtotal*vatRate/100),total=round(subtotal+vat)
 const credits=[...new Map(history.filter(n=>n.credit_active&&n.credit_note&&n.billing_entity_id===account?.billing_entity_id).map(n=>[n.credit_note_id,n.credit_note!])).values()]
 const own=credits.find(n=>n.id===revision?.credit_note_id)
 const activeDeduction=round(credits.reduce((sum,n)=>sum+round(Number(n.deducted)*n.items.filter(item=>rows.some(row=>row.id===item.id)).reduce((v,item)=>v+Number(item.effective_amount),0)/Number(n.subtotal||1)),0))
 const sameWork=Boolean(own&&revision&&revision.deducted===Math.min(total,activeDeduction)&&revision.total===total&&revision.vat_rate===vatRate&&revision.items.length===rows.length&&revision.items.every(item=>rows.some(row=>row.id===item.id)))
 const held=Number(own?.deducted??0),available=round(Number(account?.balance??0)+held)
 const others=credits.filter(n=>n.id!==own?.id)
 const ids=new Set(rows.map(row=>row.id)),covered=new Set(others.flatMap(n=>n.items.map(item=>item.id)))
 const carried=round(others.reduce((sum,n)=>sum+round(Number(n.deducted)*n.items.filter(item=>ids.has(item.id)).reduce((v,item)=>v+Number(item.effective_amount),0)/Number(n.subtotal||1)),0))
 const fresh=round(rows.filter(row=>!covered.has(row.id)&&!row.is_invoiced&&!row.is_paid).reduce((sum,row)=>sum+Number(row.effective_amount??0),0))
 const freshTotal=round(fresh+round(fresh*vatRate/100))
 const newDeduction=apply?Math.min(available,freshTotal):0
 const deducted=apply?Math.min(total,carried+newDeduction):0
 if(apply&&sameWork)return {subtotal,vat,total,deducted:Number(revision!.deducted),remaining:round(total-Number(revision!.deducted)),balance_after:Number(account?.balance??0),newDeduction:0,returned:0}
 return {subtotal,vat,total,deducted:round(deducted),remaining:round(total-deducted),balance_after:round(available-newDeduction),newDeduction,returned:held}
}
