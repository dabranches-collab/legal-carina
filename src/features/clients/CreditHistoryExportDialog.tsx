import { useState } from 'react'
import type { CreditAccount, CreditMovement } from './credit'
import type { CreditUsage } from './creditUsage'
import { saveCreditHistory, type HistoryMode } from './creditHistoryExport'

export function CreditHistoryExportDialog({account,usage,movements,format,onClose}:{account:CreditAccount;usage:CreditUsage;movements:CreditMovement[];format:'pdf'|'xlsx';onClose:()=>void}){
 const [mode,setMode]=useState<HistoryMode>('values'),[busy,setBusy]=useState(false),[error,setError]=useState('')
 return <div role="dialog" aria-modal="true" aria-label="Apresentação do histórico" className="app-safe-fixed fixed z-[110] grid place-items-center overflow-y-auto bg-navigation/65 p-4" onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();if(!busy)onClose()}}}>
  <div className="card my-auto w-full max-w-lg p-5"><h3 className="text-xl font-semibold">Guardar histórico em {format.toUpperCase()}</h3><p className="mt-2 text-sm">Como quer apresentar os registos?</p>
   <fieldset disabled={busy} className="mt-4 space-y-3"><legend className="sr-only">Modalidade de apresentação</legend>
    <label className="flex min-h-14 items-start gap-3 rounded-lg border border-border p-3"><input autoFocus type="radio" name="history-mode" checked={mode==='values'} onChange={()=>setMode('values')}/><span><strong>Tempos e valores em cada registo</strong><span className="mt-1 block text-sm text-text-secondary">Honorários, IVA e saldo após cada movimento.</span></span></label>
    <label className="flex min-h-14 items-start gap-3 rounded-lg border border-border p-3"><input type="radio" name="history-mode" checked={mode==='time'} onChange={()=>setMode('time')}/><span><strong>Apenas tempos nos registos</strong><span className="mt-1 block text-sm text-text-secondary">Sem preços por serviço. Provisões, consumo e saldo monetário no resumo final.</span></span></label>
   </fieldset>
   {error&&<p role="alert" className="mt-3 text-danger">{error}</p>}
   <div className="mt-5 flex flex-wrap gap-3"><button type="button" disabled={busy} className="control min-h-11 bg-primary px-4 font-semibold text-surface" onClick={()=>{setBusy(true);void saveCreditHistory(account,usage,movements,mode,format).then(onClose).catch(cause=>{setError(cause instanceof Error?cause.message:'Não foi possível exportar.');setBusy(false)})}}>{busy?'A preparar…':`Guardar ${format.toUpperCase()}`}</button><button type="button" disabled={busy} className="control min-h-11 px-4" onClick={onClose}>Cancelar</button></div>
  </div>
 </div>
}
