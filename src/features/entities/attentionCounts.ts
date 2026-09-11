import { supabase } from '../../lib/supabase'
import { readIdBatches } from '../../lib/readBatches'

export type AttentionCounts={uninvoiced:number;unpaid:number;missingPrice:number}

export async function getAttentionCounts(filters:{clientType?:string;professionalId?:string;billingEntityId?:string}):Promise<AttentionCounts>{
 const db=supabase
 if(!db)return {uninvoiced:0,unpaid:0,missingPrice:0}
 if(filters.clientType==='mixed'){
  const profiles=await db.from('client_profiles').select('client_id,client_type').eq('active',true)
  if(profiles.error)return {uninvoiced:0,unpaid:0,missingPrice:0}
  const types=new Map<string,Set<string>>();for(const profile of profiles.data??[]){const current=types.get(profile.client_id)??new Set<string>();current.add(profile.client_type);types.set(profile.client_id,current)}
  const ids=[...types.entries()].filter(([,value])=>value.size>1).map(([id])=>id)
  const rows=await readIdBatches(ids,(batch,from,to)=>db.from('work_entries').select('is_invoiced,is_paid,effective_hourly_rate,status').in('client_id',batch).order('id').range(from,to))
  return {uninvoiced:rows.filter(row=>!row.is_invoiced&&row.status!=='uncollectible_uninvoiced').length,unpaid:rows.filter(row=>row.is_invoiced&&!row.is_paid&&row.status!=='uncollectible_invoiced').length,missingPrice:rows.filter(row=>row.effective_hourly_rate==null).length}
 }
 const base={p_page:1,p_page_size:1,p_search:null,p_year:null,p_professional_id:filters.professionalId??null,p_billing_entity_id:filters.billingEntityId??null,p_archive:null,p_review_only:false,p_client_type:filters.clientType??null,p_client_id:null,p_missing_society:false,p_sort:'work_date',p_direction:'desc'}
 const [uninvoiced,unpaid,missingPrice]=await Promise.all([
  db.rpc('get_attention_work_entries',{p_kind:'uninvoiced',p_search:base.p_search,p_year:base.p_year,p_professional_id:base.p_professional_id,p_billing_entity_id:base.p_billing_entity_id,p_archive:base.p_archive,p_missing_price:false,p_client_type:base.p_client_type,p_client_id:base.p_client_id,p_missing_society:base.p_missing_society}),
  db.rpc('get_attention_work_entries',{p_kind:'unpaid',p_search:base.p_search,p_year:base.p_year,p_professional_id:base.p_professional_id,p_billing_entity_id:base.p_billing_entity_id,p_archive:base.p_archive,p_missing_price:false,p_client_type:base.p_client_type,p_client_id:base.p_client_id,p_missing_society:base.p_missing_society}),
  db.rpc('search_work_entries',{...base,p_invoiced:null,p_paid:null,p_missing_price:true}),
 ])
 const total=(response:{data:unknown;error:unknown})=>response.error?0:Number((response.data as {total?:number}|null)?.total??0)
 return {uninvoiced:total(uninvoiced),unpaid:total(unpaid),missingPrice:total(missingPrice)}
}
