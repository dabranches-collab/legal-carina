import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { useModalLifecycle } from '../../hooks/useModalLifecycle'
import { DurationSelect } from './DurationSelect'
import { getWorkEntryOptions } from './workEntryCompatibility'
import { CalendarDateInput } from '../../components/CalendarDateInput'

type OptionData={
  societies:Array<{id:string;name:string}>
  clientProfiles:Array<{id:string;client_id:string;client_type:'individual'|'company';client_code:string;display_name:string}>
  responsibles:Array<{id:string;display_name:string}>
}

export function CreateWorkEntryModal({onClose,onCreated}:{onClose:()=>void;onCreated:()=>void}){
  const [options,setOptions]=useState<OptionData>({societies:[],clientProfiles:[],responsibles:[]})
  const [date,setDate]=useState(()=>new Date().toISOString().slice(0,10)),[profile,setProfile]=useState(''),[responsible,setResponsible]=useState(''),[society,setSociety]=useState('')
  const [activity,setActivity]=useState(''),[duration,setDuration]=useState(0),[observations,setObservations]=useState('')
  const [clientQuery,setClientQuery]=useState(''),[clientOptionsOpen,setClientOptionsOpen]=useState(false)
  const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState('')
  useModalLifecycle(onClose,saving)
  useEffect(()=>{let active=true;void(async()=>{const result=await getWorkEntryOptions();if(!active)return;if(result.error)setError(result.error.message);else if(result.data)setOptions(result.data);setLoading(false)})();return()=>{active=false}},[])
  const clientLabel=useCallback((item:OptionData['clientProfiles'][number])=>`${item.display_name} · ${item.client_code} · ${item.client_type==='individual'?'Particular':'Empresa'}`,[])
  const sortedClientProfiles=useMemo(()=>[...options.clientProfiles].sort((left,right)=>left.display_name.localeCompare(right.display_name,'pt-PT',{sensitivity:'base'})||left.client_type.localeCompare(right.client_type)||left.client_code.localeCompare(right.client_code,'pt-PT',{numeric:true})),[options.clientProfiles])
  const matchingClientProfiles=useMemo(()=>{const words=clientQuery.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-PT').split(/\s+/).filter(Boolean);return sortedClientProfiles.filter(item=>{const candidate=clientLabel(item).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-PT');return words.every(word=>candidate.includes(word))}).slice(0,15)},[clientLabel,clientQuery,sortedClientProfiles])
  async function submit(event:FormEvent){event.preventDefault();if(!supabase||duration<1)return;setSaving(true);setError('');const result=await supabase.rpc('create_work_entry',{p_work_date:date,p_client_profile_id:profile,p_matter_id:null,p_professional_id:responsible,p_billing_entity_id:society||null,p_activity_description:activity,p_duration_minutes:duration,p_observations:observations||null});if(result.error){setError(result.error.message);setSaving(false);return}onCreated()}
  return <div className="app-safe-fixed fixed z-[90] grid place-items-center overflow-y-auto bg-navigation/65 p-4" role="dialog" aria-modal="true" aria-labelledby="create-work-title" onMouseDown={event=>{if(event.target===event.currentTarget&&!saving)onClose()}}><form onSubmit={submit} className="card my-auto max-h-[calc(100dvh-2rem)] w-full max-w-3xl overflow-y-auto p-5 pb-0 sm:p-6 sm:pb-0">
    <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.15em] text-secondary">Registo de trabalho</p><h2 id="create-work-title" className="mt-1 font-display text-2xl font-semibold">Criar movimento</h2><p className="mt-2 text-sm text-text-secondary">O preço e o valor são resolvidos no backend segundo as regras vigentes.</p></div><button type="button" onClick={onClose} disabled={saving} className="control min-h-11 px-4 font-semibold">Fechar</button></div>
    {error&&<p role="alert" className="mt-4 rounded-lg bg-danger-soft p-3 text-sm text-danger">Não foi possível criar o movimento: {error}</p>}
    {loading?<div role="status" className="mt-5 h-52 animate-pulse rounded-xl bg-surface-subtle"/>:<div className="mt-5 grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-semibold">Data<CalendarDateInput required value={date} onChange={setDate} className="mt-1 w-full px-3"/></label>
      <label className="relative text-sm font-semibold">Cliente e vertente<input required role="combobox" aria-autocomplete="list" aria-expanded={clientOptionsOpen} aria-controls="create-client-options" value={clientQuery} onFocus={()=>setClientOptionsOpen(true)} onChange={event=>{setClientQuery(event.target.value);setProfile('');setClientOptionsOpen(true)}} placeholder="Comece a escrever o nome ou código…" autoComplete="off" className="control mt-1 w-full px-3"/>{clientOptionsOpen&&<div id="create-client-options" role="listbox" className="scrollbar-thin absolute z-40 mt-1 max-h-[26.25rem] w-full overflow-y-auto rounded-lg border border-border bg-surface p-1 shadow-raised">{matchingClientProfiles.map(item=><button key={item.id} type="button" role="option" aria-selected={profile===item.id} onClick={()=>{setProfile(item.id);setClientQuery(clientLabel(item));setClientOptionsOpen(false)}} className="block h-8 w-full truncate rounded px-2 text-left text-xs font-normal text-text-primary hover:bg-secondary-soft focus:bg-secondary-soft" title={clientLabel(item)}>{clientLabel(item)}</button>)}{!matchingClientProfiles.length&&<p className="p-2 text-xs font-normal text-text-secondary">Nenhum cliente encontrado.</p>}</div>}</label>
      <label className="text-sm font-semibold">Responsável<select required value={responsible} onChange={event=>setResponsible(event.target.value)} className="control mt-1 w-full px-3"><option value="">Seleccionar…</option>{[...options.responsibles].sort((a,b)=>a.display_name.localeCompare(b.display_name,'pt-PT',{sensitivity:'base'})).map(item=><option key={item.id} value={item.id}>{item.display_name}</option>)}</select></label>
      <label className="text-sm font-semibold">Sociedade<select value={society} onChange={event=>setSociety(event.target.value)} className="control mt-1 w-full px-3"><option value="">Por atribuir</option>{[...options.societies].sort((a,b)=>a.name.localeCompare(b.name,'pt-PT',{sensitivity:'base'})).map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <fieldset><legend className="text-sm font-semibold">Duração</legend><DurationSelect value={duration} onChange={setDuration}/></fieldset>
      <label className="text-sm font-semibold sm:col-span-2">Actividade<textarea required maxLength={2000} value={activity} onChange={event=>setActivity(event.target.value)} className="control mt-1 min-h-24 w-full p-3"/></label>
      <label className="text-sm font-semibold sm:col-span-2">Observações<textarea maxLength={4000} value={observations} onChange={event=>setObservations(event.target.value)} className="control mt-1 min-h-20 w-full p-3"/></label>
    </div>}
    <div className="sticky bottom-0 z-50 -mx-5 mt-6 flex flex-wrap justify-end gap-3 border-t border-border bg-surface px-5 py-3 pb-[max(.75rem,var(--safe-bottom))] shadow-[0_-8px_18px_-14px_rgba(0,0,0,.45)] sm:-mx-6 sm:px-6"><button type="button" onClick={onClose} disabled={saving} className="control min-h-11 px-4 font-semibold">Cancelar</button><button disabled={loading||saving||!profile||!responsible||!activity.trim()||duration<1} className="min-h-11 rounded-lg bg-primary px-5 font-semibold text-surface disabled:opacity-50">{saving?'A guardar…':'Guardar movimento'}</button></div>
  </form></div>
}
