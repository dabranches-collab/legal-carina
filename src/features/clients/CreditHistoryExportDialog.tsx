import { useEffect, useRef, useState } from 'react'
import type { CreditAccount, CreditMovement } from './credit'
import type { CreditUsage } from './creditUsage'
import { createCreditHistoryFile, type HistoryMode } from './creditHistoryExport'

export function CreditHistoryExportDialog({account,usage,movements,format,onClose}:{account:CreditAccount;usage:CreditUsage;movements:CreditMovement[];format:'pdf'|'xlsx';onClose:()=>void}){
 const [mode,setMode]=useState<HistoryMode>('values'),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const [file,setFile]=useState<{url:string;filename:string}|null>(null),mounted=useRef(true)
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false}},[])
 useEffect(()=>()=>{if(file)window.setTimeout(()=>URL.revokeObjectURL(file.url),60_000)},[file])
 async function prepare(){
  setBusy(true);setError('')
  try{
   const prepared=await createCreditHistoryFile(account,usage,movements,mode,format)
   if(!mounted.current)return
   const url=URL.createObjectURL(prepared.blob)
   setFile({url,filename:prepared.filename})
   const link=document.createElement('a');link.href=url;link.download=prepared.filename;document.body.appendChild(link);link.click();link.remove()
  }catch(cause){if(mounted.current)setError(cause instanceof Error?cause.message:'Não foi possível exportar.')}
  finally{if(mounted.current)setBusy(false)}
 }
 return <div role="dialog" aria-modal="true" aria-label="Apresentação do histórico" className="app-safe-fixed fixed z-[110] grid place-items-center overflow-y-auto bg-navigation/65 p-4" onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();if(!busy)onClose()}}}>
  <div className="card my-auto w-full max-w-lg p-5"><h3 className="text-xl font-semibold">Guardar histórico em {format.toUpperCase()}</h3><p className="mt-2 text-sm">{file?'O ficheiro está pronto.':'Como quer apresentar os registos?'}</p>
   {!file&&<fieldset disabled={busy} className="mt-4 space-y-3"><legend className="sr-only">Modalidade de apresentação</legend>
    <label className="flex min-h-14 items-start gap-3 rounded-lg border border-border p-3"><input autoFocus type="radio" name="history-mode" checked={mode==='values'} onChange={()=>setMode('values')}/><span><strong>Tempos e valores em cada registo</strong><span className="mt-1 block text-sm text-text-secondary">Honorários, IVA e saldo após cada movimento.</span></span></label>
    <label className="flex min-h-14 items-start gap-3 rounded-lg border border-border p-3"><input type="radio" name="history-mode" checked={mode==='time'} onChange={()=>setMode('time')}/><span><strong>Apenas tempos nos registos</strong><span className="mt-1 block text-sm text-text-secondary">Sem preços por serviço. Provisões, consumo e saldo monetário no resumo final.</span></span></label>
   </fieldset>}
   {file&&<div role="status" className="mt-4 rounded-lg border border-success/40 bg-success-soft p-4 text-sm"><p className="font-semibold text-success">{format.toUpperCase()} preparado · {mode==='values'?'tempos e valores':'apenas tempos e resumo final'}</p><p className="mt-2 break-all">{file.filename}</p><p className="mt-2">Foi pedida a descarga. Se o ficheiro não aparecer nas descargas do navegador, use o botão abaixo.</p><div className="mt-3 flex flex-wrap gap-3"><a className="control inline-flex min-h-11 items-center bg-surface px-4 font-semibold" href={file.url} download={file.filename}>Descarregar {format.toUpperCase()} novamente</a>{format==='pdf'&&<a className="control inline-flex min-h-11 items-center bg-surface px-4 font-semibold" href={file.url} target="_blank" rel="noopener noreferrer">Abrir PDF</a>}</div></div>}
   {error&&<p role="alert" className="mt-3 text-danger">{error}</p>}
   <div className="mt-5 flex flex-wrap gap-3">{file?<button type="button" className="control min-h-11 px-4" onClick={()=>setFile(null)}>Alterar modalidade</button>:<button type="button" disabled={busy} className="control min-h-11 bg-primary px-4 font-semibold text-surface" onClick={()=>void prepare()}>{busy?'A preparar…':`Guardar ${format.toUpperCase()}`}</button>}<button type="button" disabled={busy} className="control min-h-11 px-4" onClick={onClose}>{file?'Fechar':'Cancelar'}</button></div>
  </div>
 </div>
}
