import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { useModalLifecycle } from '../../hooks/useModalLifecycle'
import { DurationSelect } from './DurationSelect'
import { getWorkEntryOptions } from './workEntryCompatibility'

type OptionData={
  societies:Array<{id:string;name:string}>
  clientProfiles:Array<{id:string;client_id:string;client_type:'individual'|'company';client_code:string;display_name:string}>
  responsibles:Array<{id:string;display_name:string}>
  processes:Array<{id:string;client_id:string;matter_code:string;title:string}>
}

export function CreateWorkEntryModal({onClose,onCreated}:{onClose:()=>void;onCreated:()=>void}){
  const [options,setOptions]=useState<OptionData>({societies:[],clientProfiles:[],responsibles:[],processes:[]})
  const [date,setDate]=useState(()=>new Date().toISOString().slice(0,10)),[profile,setProfile]=useState(''),[matter,setMatter]=useState(''),[responsible,setResponsible]=useState(''),[society,setSociety]=useState('')
  const [activity,setActivity]=useState(''),[duration,setDuration]=useState(0),[observations,setObservations]=useState('')
  const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState('')
  useModalLifecycle(onClose,saving)
  useEffect(()=>{let active=true;void(async()=>{const result=await getWorkEntryOptions();if(!active)return;if(result.error)setError(result.error.message);else if(result.data)setOptions(result.data);setLoading(false)})();return()=>{active=false}},[])
  const selectedClient=options.clientProfiles.find(item=>item.id===profile)?.client_id
  const processes=useMemo(()=>options.processes.filter(item=>!selectedClient||item.client_id===selectedClient),[options.processes,selectedClient])
  async function submit(event:FormEvent){event.preventDefault();if(!supabase||duration<1)return;setSaving(true);setError('');const result=await supabase.rpc('create_work_entry',{p_work_date:date,p_client_profile_id:profile,p_matter_id:matter||null,p_professional_id:responsible,p_billing_entity_id:society||null,p_activity_description:activity,p_duration_minutes:duration,p_observations:observations||null});if(result.error){setError(result.error.message);setSaving(false);return}onCreated()}
  return <div className="app-safe-fixed fixed z-[90] grid place-items-center overflow-y-auto bg-navigation/65 p-4" role="dialog" aria-modal="true" aria-labelledby="create-work-title" onMouseDown={event=>{if(event.target===event.currentTarget&&!saving)onClose()}}><form onSubmit={submit} className="card my-auto w-full max-w-3xl p-5 sm:p-6">
    <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.15em] text-secondary">Registo de trabalho</p><h2 id="create-work-title" className="mt-1 font-display text-2xl font-semibold">Criar movimento</h2><p className="mt-2 text-sm text-text-secondary">O preço e o valor são resolvidos no backend segundo as regras vigentes.</p></div><button type="button" onClick={onClose} disabled={saving} className="control min-h-11 px-4 font-semibold">Fechar</button></div>
    {error&&<p role="alert" className="mt-4 rounded-lg bg-danger-soft p-3 text-sm text-danger">Não foi possível criar o movimento: {error}</p>}
    {loading?<div role="status" className="mt-5 h-52 animate-pulse rounded-xl bg-surface-subtle"/>:<div className="mt-5 grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-semibold">Data<input required type="date" value={date} onChange={event=>setDate(event.target.value)} className="control mt-1 w-full px-3"/></label>
      <label className="text-sm font-semibold">Cliente e vertente<select required value={profile} onChange={event=>{setProfile(event.target.value);setMatter('')}} className="control mt-1 w-full px-3"><option value="">Seleccionar…</option>{options.clientProfiles.map(item=><option key={item.id} value={item.id}>{item.display_name} · {item.client_code} · {item.client_type==='individual'?'Particular':'Empresa'}</option>)}</select></label>
      <label className="text-sm font-semibold">Processo<select value={matter} onChange={event=>setMatter(event.target.value)} disabled={!profile} className="control mt-1 w-full px-3"><option value="">Sem processo</option>{processes.map(item=><option key={item.id} value={item.id}>{item.matter_code} · {item.title}</option>)}</select></label>
      <label className="text-sm font-semibold">Responsável<select required value={responsible} onChange={event=>setResponsible(event.target.value)} className="control mt-1 w-full px-3"><option value="">Seleccionar…</option>{options.responsibles.map(item=><option key={item.id} value={item.id}>{item.display_name}</option>)}</select></label>
      <label className="text-sm font-semibold">Sociedade<select value={society} onChange={event=>setSociety(event.target.value)} className="control mt-1 w-full px-3"><option value="">Por atribuir</option>{options.societies.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <fieldset><legend className="text-sm font-semibold">Duração</legend><DurationSelect value={duration} onChange={setDuration}/></fieldset>
      <label className="text-sm font-semibold sm:col-span-2">Actividade<textarea required maxLength={2000} value={activity} onChange={event=>setActivity(event.target.value)} className="control mt-1 min-h-24 w-full p-3"/></label>
      <label className="text-sm font-semibold sm:col-span-2">Observações<textarea maxLength={4000} value={observations} onChange={event=>setObservations(event.target.value)} className="control mt-1 min-h-20 w-full p-3"/></label>
    </div>}
    <div className="mt-6 flex flex-wrap justify-end gap-3"><button type="button" onClick={onClose} disabled={saving} className="control min-h-11 px-4 font-semibold">Cancelar</button><button disabled={loading||saving||!profile||!responsible||!activity.trim()||duration<1} className="min-h-11 rounded-lg bg-primary px-5 font-semibold text-surface disabled:opacity-50">{saving?'A guardar…':'Guardar movimento'}</button></div>
  </form></div>
}
