import { supabase } from '../../lib/supabase'

export type WorkEntryOptions={
  societies:Array<{id:string;name:string}>
  clientProfiles:Array<{id:string;client_id:string;client_type:'individual'|'company';client_code:string;display_name:string}>
  responsibles:Array<{id:string;display_name:string}>
  processes:Array<{id:string;client_id:string;matter_code:string;title:string}>
}
export type EditableWorkEntry={id:string;work_date:string;client_profile_id:string;matter_id:string|null;professional_id:string;activity_description:string;observations:string|null}

const missingFunction=(error:{code?:string;message?:string}|null)=>error?.code==='PGRST202'||Boolean(error?.message?.includes('schema cache'))

export async function getWorkEntryOptions():Promise<{data:WorkEntryOptions|null;error:{message:string}|null}> {
  if(!supabase)return{data:null,error:{message:'Ligação ao Supabase indisponível.'}}
  const rpc=await supabase.rpc('get_work_entry_form_options')
  if(!rpc.error)return{data:rpc.data as WorkEntryOptions,error:null}
  if(!missingFunction(rpc.error))return{data:null,error:rpc.error}
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
  const result=await supabase.from('work_entries').select('id,work_date,client_profile_id,matter_id,professional_id,activity_description,observations').eq('id',entryId).maybeSingle()
  return{data:result.data as EditableWorkEntry|null,error:result.error}
}

export async function updateWorkEntry(entry:EditableWorkEntry):Promise<{error:{message:string}|null}> {
  if(!supabase)return{error:{message:'Ligação ao Supabase indisponível.'}}
  const rpc=await supabase.rpc('update_work_entry_details',{p_work_entry_id:entry.id,p_work_date:entry.work_date,p_client_profile_id:entry.client_profile_id,p_matter_id:entry.matter_id||null,p_professional_id:entry.professional_id,p_activity_description:entry.activity_description,p_observations:entry.observations||null})
  if(!rpc.error)return{error:null}
  if(!missingFunction(rpc.error))return{error:rpc.error}
  const profile=await supabase.from('client_profiles').select('client_id').eq('id',entry.client_profile_id).single()
  if(profile.error)return{error:profile.error}
  const result=await supabase.from('work_entries').update({work_date:entry.work_date,client_id:profile.data.client_id,client_profile_id:entry.client_profile_id,matter_id:entry.matter_id||null,professional_id:entry.professional_id,activity_description:entry.activity_description.trim(),observations:entry.observations?.trim()||null}).eq('id',entry.id)
  return{error:result.error}
}
