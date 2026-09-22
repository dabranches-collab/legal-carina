import {useCallback,useEffect,useState} from 'react'
import {supabase} from '../../lib/supabase'
import {formatDate} from '../../utils/date'
import {creditMoney} from './credit'
import {documentIsVoided,type HonorariumDocument} from './honorariumDocuments'

export function ClientHonorariumNotesPanel({clientId,onOpen}:{clientId:string;onOpen:()=>void}){
  const [notes,setNotes]=useState<HonorariumDocument[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('')
  const load=useCallback(async()=>{
    if(!supabase)return
    setLoading(true);setError('')
    const result=await supabase.rpc('get_client_honorarium_documents',{p_client_id:clientId})
    if(result.error)setError(result.error.message)
    else setNotes(Array.isArray(result.data)?result.data:[])
    setLoading(false)
  },[clientId])
  useEffect(()=>{void load()},[load])
  const current=notes.filter(note=>note.is_current),active=current.filter(note=>!documentIsVoided(note)),totalDue=active.reduce((sum,note)=>sum+Number(note.remaining??0),0)
  return <section className="mt-6 border-t border-border pt-5" aria-labelledby="client-honorarium-notes-title">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 id="client-honorarium-notes-title" className="font-display text-xl font-semibold">Notas de Honorários</h3><p className="mt-1 text-sm text-text-secondary">Documentos emitidos pela plataforma, com versões, provisões aplicadas, pagamentos directos e saldo por pagar.</p></div><button type="button" onClick={onOpen} className="min-h-11 rounded-lg bg-primary px-4 font-semibold text-surface">Preparar ou gerir notas</button></div>
    {loading&&<p role="status" className="mt-4 rounded-lg border border-border bg-surface-subtle p-4">A carregar o histórico de notas…</p>}
    {error&&<div className="mt-4 rounded-lg bg-danger-soft p-4 text-danger"><p role="alert">{error}</p><button type="button" onClick={()=>void load()} className="mt-2 min-h-9 rounded-lg border border-danger/40 px-3 text-sm font-semibold">Tentar novamente</button></div>}
    {!loading&&!error&&<><dl className="mt-4 grid gap-3 sm:grid-cols-3"><div className="rounded-lg border border-border bg-surface-subtle p-3"><dt className="text-xs text-text-secondary">Notas vigentes</dt><dd className="mt-1 text-xl font-semibold">{active.length}</dd></div><div className="rounded-lg border border-border bg-surface-subtle p-3"><dt className="text-xs text-text-secondary">Versões guardadas</dt><dd className="mt-1 text-xl font-semibold">{notes.length}</dd></div><div className="rounded-lg border border-border bg-surface-subtle p-3"><dt className="text-xs text-text-secondary">Total por pagar nas notas vigentes</dt><dd className="financial-value mt-1 text-xl font-semibold">{creditMoney(totalDue,active[0]?.currency??'EUR')}</dd></div></dl>
      <div className="mt-4 space-y-3">{notes.length===0?<p className="rounded-lg border border-border bg-surface p-4 text-sm text-text-secondary">Este cliente ainda não tem notas de honorários guardadas.</p>:notes.map(note=>{const direct=Number((note.document_options.direct_payment as {amount?:number}|undefined)?.amount??0),voided=documentIsVoided(note),state=!note.is_current?'Versão anterior':voided?'Anulada / estornada':'Actual';return <article key={note.id} className="rounded-xl border border-border bg-surface p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><h4 className="font-semibold">{note.number} · versão {note.revision}</h4><p className="mt-1 text-xs text-text-secondary">{note.society_name} · {formatDate(note.issued_at)} · {note.fixed_fee_job_id?'Trabalho a preço fixo':`${note.items.length} registos`}</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${!note.is_current?'bg-surface-subtle text-text-secondary':voided?'bg-danger-soft text-danger':'bg-success-soft text-success'}`}>{state}</span></div><dl className="mt-3 grid gap-2 text-sm sm:grid-cols-4"><div><dt className="text-xs text-text-secondary">Total</dt><dd className="financial-value font-semibold">{creditMoney(Number(note.total),note.currency)}</dd></div><div><dt className="text-xs text-text-secondary">Provisão</dt><dd className="financial-value font-semibold">{creditMoney(Number(note.deducted),note.currency)}</dd></div><div><dt className="text-xs text-text-secondary">Pagamento directo</dt><dd className="financial-value font-semibold">{creditMoney(direct,note.currency)}</dd></div><div><dt className="text-xs text-text-secondary">Por pagar</dt><dd className="financial-value font-semibold">{creditMoney(Number(note.remaining),note.currency)}</dd></div></dl><button type="button" onClick={onOpen} className="mt-3 min-h-9 rounded-lg border border-primary/40 px-3 text-xs font-semibold text-primary">Consultar, reimprimir ou rever</button></article>})}</div>
      <p className="mt-3 text-xs text-text-secondary">A revisão, reimpressão e anulação continuam na gestão de notas, preservando todas as versões.</p></>}
  </section>
}
