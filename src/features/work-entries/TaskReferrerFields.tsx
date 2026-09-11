import { referrerNames } from '../../lib/professionalNames'

export function TaskReferrerFields({value,other,onChange}:{value:string;other:string;onChange:(value:string,other:string)=>void}) {
 return <fieldset className="rounded-lg border border-secondary/40 bg-secondary-soft p-3 sm:col-span-2 lg:col-span-full">
  <legend className="px-1 text-sm font-semibold">Angariação da tarefa · LEGALTEAM</legend>
  <div className="grid gap-3 sm:grid-cols-2">
   <label className="text-sm font-semibold">Angariador da tarefa<select aria-label="Angariador da tarefa" required value={value} onChange={e=>onChange(e.target.value,e.target.value==='other'?other:'')} className="control mt-1 w-full px-3"><option value="">Seleccionar…</option>{Object.entries(referrerNames).map(([id,name])=><option key={id} value={id}>{name}</option>)}<option value="other">Outro</option></select></label>
   {value==='other'&&<label className="text-sm font-semibold">Nome do angariador da tarefa<input aria-label="Nome do angariador da tarefa" required maxLength={200} value={other} onChange={e=>onChange(value,e.target.value)} className="control mt-1 w-full px-3"/></label>}
  </div><p className="mt-2 text-xs text-text-secondary">Pessoa que trouxe este assunto. Recebe a parcela de 10% da angariação da tarefa.</p>
 </fieldset>
}
