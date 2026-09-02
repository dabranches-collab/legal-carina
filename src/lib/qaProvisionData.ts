// Synthetic data used exclusively by the existing local qa-demo fetch interceptor.
import { provisionTotals } from '../features/clients/credit'
export function createQaProvisionData(){
 const work={id:'00000000-0000-4000-8000-000000000040',work_date:'2026-09-01',activity_description:'Preparação de requerimento e análise documental',duration_minutes:90,effective_amount:200,professional_name:'Responsável Sintético',billing_entity_name:'Sociedade Sintética'}
 const account={id:'00000000-0000-4000-8000-000000000050',client_id:'00000000-0000-4000-8000-000000000020',client_name:'Cliente Sintético',billing_entity_id:'00000000-0000-4000-8000-000000000030',society_name:'Sociedade Sintética',currency:'EUR',received:1000,consumed:123,balance:877,noted_work_ids:['00000000-0000-4000-8000-000000000041']}
 const zero={...account,id:'00000000-0000-4000-8000-000000000051',client_id:'00000000-0000-4000-8000-000000000021',client_name:'Cliente Sem Saldo',received:123,balance:0}
 const note={id:'00000000-0000-4000-8000-000000000060',number:'NH-P-00000001',issued_at:'2026-09-01T12:00:00Z',subtotal:100,vat_rate:23,vat:23,total:123,deducted:123,remaining:0,balance_after:877,items:[{...work,id:'00000000-0000-4000-8000-000000000041',effective_amount:100,activity_description:'Consulta jurídica inicial'}]}
 const movements:import('../features/clients/credit').CreditMovement[]=[{id:'deposit',recorded_at:'2026-08-01T12:00:00Z',movement_date:'2026-08-01',kind:'payment',amount:1000,reference:'Saldo inicial',note_id:null,note:null,reversed:false,reverses_id:null},{id:'consumption',recorded_at:note.issued_at,movement_date:'2026-09-01',kind:'consumption',amount:-123,reference:note.number,note_id:note.id,note,reversed:false,reverses_id:null}]
 const requests=new Map<string,unknown>()
 return (rpc:string|undefined,table:string,args:Record<string,unknown>)=>{
  if(!rpc){if(table==='billing_entities')return [{id:account.billing_entity_id,name:account.society_name,default_currency:'EUR',default_vat_rate:23,bank_accounts:[]}];if(table==='clients')return {legal_name:account.client_name,default_billing_entity_id:account.billing_entity_id,honorarium_language:'pt'};return []}
  if(rpc==='get_client_credit_accounts')return args.p_client_id?[account,zero].filter(row=>row.client_id===args.p_client_id):[account,zero]
  if(rpc==='get_client_credit_detail')return {account:args.p_account_id===zero.id?zero:account,movements}
  if(rpc==='search_work_entries')return {items:[work],total:1,pageSize:100}
  if(rpc==='record_client_credit_payment'){
   if(requests.has(String(args.p_request_id)))return requests.get(String(args.p_request_id))
   account.received+=Number(args.p_amount);account.balance+=Number(args.p_amount)
   const id=crypto.randomUUID();movements.push({id,recorded_at:new Date().toISOString(),movement_date:String(args.p_date),kind:'payment',amount:Number(args.p_amount),reference:String(args.p_reference),note_id:null,note:null,reversed:false,reverses_id:null});requests.set(String(args.p_request_id),id);return id
  }
  if(rpc==='issue_provision_honorarium_note'){
   if(requests.has(String(args.p_request_id)))return requests.get(String(args.p_request_id))
   const totals=provisionTotals(work.effective_amount,Number(args.p_vat_rate),account.balance),issued={...note,...totals,id:crypto.randomUUID(),number:'NH-P-00000002',issued_at:new Date().toISOString(),vat_rate:Number(args.p_vat_rate),items:[work]}
   account.noted_work_ids.push(work.id);account.consumed+=totals.deducted;account.balance=totals.balance_after;movements.push({id:crypto.randomUUID(),recorded_at:issued.issued_at,movement_date:issued.issued_at.slice(0,10),kind:'consumption',amount:-totals.deducted,reference:issued.number,note_id:issued.id,note:issued,reversed:false,reverses_id:null});requests.set(String(args.p_request_id),issued);return issued
  }
  if(rpc==='reverse_client_credit'){
   const original=movements.find(row=>row.id===args.p_movement_id)
   if(!original||original.reversed||original.kind==='reversal')throw new Error('Movimento indisponível para estorno.')
   if(account.balance-original.amount<0)throw new Error('Estorne primeiro os consumos; o saldo não pode ficar negativo.')
   original.reversed=true;account.balance-=original.amount
   if(original.note){account.consumed+=original.amount;account.noted_work_ids=account.noted_work_ids.filter(id=>!original.note!.items.some(item=>item.id===id))}else account.received-=original.amount
   const id=crypto.randomUUID();movements.push({...original,id,kind:'reversal',amount:-original.amount,reference:String(args.p_reason),recorded_at:new Date().toISOString(),movement_date:new Date().toISOString().slice(0,10),reversed:false,reverses_id:original.id});return id
  }
  return []
 }
}
