import { supabase } from '../../lib/supabase'
import type { CreditDetail } from './credit'
import { calculateCreditUsage, type CreditWork } from './creditUsage'

export async function loadCreditUsage(detail:CreditDetail){
 if(!supabase)throw new Error('Ligação indisponível.')
 const today=new Date().toLocaleDateString('sv-SE')
 const empty=calculateCreditUsage(detail,[],0,today)
 if(!empty.startsOn)return empty
 const {account}=detail
 const society=await supabase.from('billing_entities').select('default_vat_rate').eq('id',account.billing_entity_id).maybeSingle()
 if(society.error)throw society.error
 const items:CreditWork[]=[]
 let total=0
 do{
  const response=await supabase.from('work_entries').select('id,client_id,billing_entity_id,currency,work_date,activity_description,duration_minutes,effective_amount,billing_scope,is_billable,is_paid,is_invoiced,status',{count:'exact'})
   .eq('client_id',account.client_id).eq('billing_entity_id',account.billing_entity_id).eq('currency',account.currency)
   .gte('work_date',empty.startsOn).lte('work_date',today).eq('billing_scope','standard').eq('is_billable',true).eq('is_paid',false).eq('is_invoiced',false)
   .order('work_date').order('id').range(items.length,items.length+999)
  if(response.error)throw response.error
  total=response.count??response.data.length
  if(!response.data.length&&items.length<total)throw new Error('A lista de registos ficou incompleta. Actualize as provisões.')
  items.push(...response.data as CreditWork[])
 }while(items.length<total)
 if(!society.data)throw new Error('Sociedade indisponível para calcular o saldo.')
 return calculateCreditUsage(detail,items,Number(society.data.default_vat_rate??0),today)
}
