import { chargeStatuses } from './retainerCharge'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useModalLifecycle } from '../../hooks/useModalLifecycle'

export type RetainerCharge={id:string;period_start:string;amount:number;currency:string;status:'pending'|'invoiced'|'paid'|'uncollectible';invoice_reference:string|null;invoice_date:string|null;due_on:string|null;paid_on:string|null;notes:string|null}

export function RetainerChargeDialog({charge,readOnly,onClose,onSave}:{charge:RetainerCharge;readOnly:boolean;onClose:()=>void;onSave:(value:RetainerCharge)=>Promise<boolean>}){
 const [draft,setDraft]=useState(charge),[busy,setBusy]=useState(false),[error,setError]=useState('')
 useModalLifecycle(onClose,busy)
 const period=new Intl.DateTimeFormat('pt-PT',{month:'long',year:'numeric'}).format(new Date(`${charge.period_start}T12:00:00`))
 return createPortal(<div className="app-safe-fixed fixed z-[90] flex items-center justify-center bg-navigation/60 p-3"><form role="dialog" aria-modal="true" aria-label={`Prestação de avença · ${period}`} className="card max-h-full w-full max-w-xl overflow-auto p-5" onSubmit={async event=>{event.preventDefault();event.stopPropagation();if(readOnly||busy)return;setBusy(true);setError('');try{if(await onSave(draft))onClose();else setError('Não foi possível guardar a prestação. Os dados não foram confirmados.')}catch(cause){setError(cause instanceof Error?cause.message:'Não foi possível guardar a prestação.')}finally{setBusy(false)}}}>
  <header className="flex items-center justify-between gap-3"><h3 className="font-semibold">Prestação de avença · {period}</h3><button type="button" aria-label="Fechar prestação" disabled={busy} onClick={onClose} className="control min-h-11 min-w-11">×</button></header>
  <p className="mt-2 text-sm">{new Intl.NumberFormat('pt-PT',{style:'currency',currency:charge.currency}).format(charge.amount)}</p>
  <fieldset disabled={readOnly||busy} className="mt-4 grid gap-3 sm:grid-cols-2">
   <label>Estado<select aria-label="Estado" className="control mt-1 w-full px-2" value={draft.status} onChange={event=>setDraft({...draft,status:event.target.value as RetainerCharge['status']})}>{Object.entries(chargeStatuses).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
   <label>N.º factura<input aria-label="N.º factura" className="control mt-1 w-full px-2" disabled={draft.status==='pending'} value={draft.invoice_reference??''} onChange={event=>setDraft({...draft,invoice_reference:event.target.value})}/></label>
   {([['invoice_date','Data da factura'],['due_on','Vencimento'],['paid_on','Liquidação']] as const).map(([key,label])=><label key={key}>{label}<input aria-label={label} type="date" className="control mt-1 w-full min-w-0 px-2" disabled={key==='invoice_date'?draft.status==='pending':key==='paid_on'?draft.status!=='paid':false} value={draft[key]??''} onChange={event=>setDraft({...draft,[key]:event.target.value||null})}/></label>)}
   <label className="sm:col-span-2">Observações<textarea aria-label="Observações" className="control mt-1 w-full p-2" value={draft.notes??''} onChange={event=>setDraft({...draft,notes:event.target.value})}/></label>
  </fieldset>
  {error&&<p role="alert" className="mt-3 text-danger">{error}</p>}
  <footer className="mt-4 flex justify-end gap-2"><button type="button" disabled={busy} className="control px-3" onClick={onClose}>Cancelar</button>{!readOnly&&<button type="submit" disabled={busy||JSON.stringify(draft)===JSON.stringify(charge)} className="control bg-primary px-3 text-surface disabled:opacity-50">{busy?'A guardar…':'Guardar prestação'}</button>}</footer>
 </form></div>,document.body)
}
