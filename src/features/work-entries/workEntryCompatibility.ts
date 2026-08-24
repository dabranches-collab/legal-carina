import { supabase } from '../../lib/supabase'

export type WorkEntryOptions={
  societies:Array<{id:string;name:string}>
  clientProfiles:Array<{id:string;client_id:string;client_type:'individual'|'company';client_code:string;display_name:string}>
  responsibles:Array<{id:string;display_name:string}>
  processes:Array<{id:string;client_id:string;matter_code:string;title:string}>
}
export type EditableWorkEntry={id:string;work_date:string;client_profile_id:string;matter_id:string|null;professional_id:string;billing_entity_id:string|null;activity_description:string;observations:string|null;duration_minutes:number;effective_hourly_rate:number|null;effective_amount:number|null;currency:string;status:string;is_billable:boolean;is_invoiced:boolean;invoice_date:string|null;is_paid:boolean;archive_status:string|null;charge_type:string|null;effective_discount_amount:number|null;discount_percentage:number|null;discount_reason:string|null;has_manual_override:boolean;source_type:string;billing_scope:'standard'|'retainer'}

const missingFunction=(error:{code?:string;message?:string}|null)=>error?.code==='PGRST202'||Boolean(error?.message?.includes('schema cache'))

export async function getWorkEntryOptions():Promise<{data:WorkEntryOptions|null;error:{message:string}|null}> {
  if(!supabase)return{data:null,error:{message:'Ligação ao Supabase indisponível.'}}
  const rpc=await supabase.rpc('get_work_entry_form_options')
  const rpcData=rpc.data as WorkEntryOptions|null
  if(!rpc.error&&rpcData?.clientProfiles?.length&&rpcData?.responsibles?.length)return{data:rpcData,error:null}
  if(rpc.error&&!missingFunction(rpc.error))return{data:null,error:rpc.error}
  const [societies,profiles,clients,responsibles,processes]=await Promise.all([
    supabase.from('billing_entities').select('id,name').eq('active',true).order('name'),
    supabase.from('client_profiles').select('id,client_id,client_type,client_code').eq('active',true).order('client_code'),
    supabase.from('clients').select('id,display_name').eq('active',true),
    supabase.from('professionals').select('id,display_name').eq('active',true).order('display_name'),
    supabase.from('matters').select('id,client_id,matter_code,title').order('matter_code'),
  ])
  const failure=societies.error??profiles.error??clients.error??responsibles.error??processes.error
  if(failure)return{data:null,error:failure}
  const clientNames=new Map((clients.data??[]).map(item=>[item.id,item.display_name]))
  return{data:{
    societies:(societies.data??[]) as WorkEntryOptions['societies'],
    clientProfiles:(profiles.data??[]).map(item=>({...item,display_name:clientNames.get(item.client_id)??''})) as WorkEntryOptions['clientProfiles'],
    responsibles:(responsibles.data??[]) as WorkEntryOptions['responsibles'],
    processes:(processes.data??[]) as WorkEntryOptions['processes'],
  },error:null}
}

export async function getWorkEntryForEdit(entryId:string):Promise<{data:EditableWorkEntry|null;error:{message:string}|null}> {
  if(!supabase)return{data:null,error:{message:'Ligação ao Supabase indisponível.'}}
  const rpc=await supabase.rpc('get_work_entry_for_edit',{p_work_entry_id:entryId})
  if(!rpc.error)return{data:rpc.data as unknown as EditableWorkEntry|null,error:null}
  if(!missingFunction(rpc.error))return{data:null,error:rpc.error}
  const result=await supabase.from('work_entries').select('id,work_date,client_profile_id,matter_id,professional_id,billing_entity_id,activity_description,observations,duration_minutes,effective_hourly_rate,effective_amount,currency,status,is_billable,is_invoiced,invoice_date,is_paid,archive_status,charge_type,effective_discount_amount,discount_percentage,discount_reason,has_manual_override,source_type,billing_scope').eq('id',entryId).maybeSingle()
  return{data:result.data as EditableWorkEntry|null,error:result.error}
}

export async function updateWorkEntry(entry:EditableWorkEntry,reason:string):Promise<{error:{message:string}|null}> {
  if(!supabase)return{error:{message:'Ligação ao Supabase indisponível.'}}
  const {id,...values}=entry
  const result=await supabase.rpc('update_work_entry_full',{p_work_entry_id:id,p_values:values as unknown as Record<string,unknown>,p_reason:reason})
  return{error:result.error?.code==='PGRST202'?{message:'A edição completa ficará disponível após a actualização controlada da base de dados.'}:result.error}
}

export async function deleteWorkEntry(entryId:string,reason:string):Promise<{error:{message:string}|null}> {
  if(!supabase)return{error:{message:'Ligação ao Supabase indisponível.'}}
  const result=await supabase.rpc('delete_work_entry',{p_work_entry_id:entryId,p_reason:reason})
  return{error:result.error?.code==='PGRST202'?{message:'A eliminação ficará disponível após a actualização controlada da base de dados.'}:result.error}
}
