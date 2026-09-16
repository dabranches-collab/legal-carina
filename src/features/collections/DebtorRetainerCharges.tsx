import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { formatDate } from '../../utils/date'
import { RetainerChargeDialog, type RetainerCharge } from '../master-data/RetainerChargeDialog'
import { chargeStatuses } from '../master-data/retainerCharge'

type Charge=RetainerCharge&{client_id:string}
const money=(amount:number,currency:string)=>new Intl.NumberFormat('pt-PT',{style:'currency',currency}).format(amount)

export function DebtorRetainerCharges({clientId,status,onSaved}:{clientId:string;status:'pending'|'invoiced';onSaved:()=>void}){
 const [charges,setCharges]=useState<Charge[]>([]),[editing,setEditing]=useState<Charge|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState('')
 const load=useCallback(async()=>{
  if(!supabase){setError('Ligação ao Supabase indisponível.');setLoading(false);return}
  setLoading(true);setError('')
  const result=await supabase.from('retainer_charges').select('id,client_id,period_start,amount,currency,status,invoice_reference,invoice_date,due_on,paid_on,notes').eq('client_id',clientId).eq('status',status).order('period_start',{ascending:true})
  if(result.error)setError(result.error.message)
  else setCharges((result.data??[]) as Charge[])
  setLoading(false)
 },[clientId,status])
 useEffect(()=>{void load()},[load])
 async function save(value:RetainerCharge){
  if(!supabase)return false
  const today=new Date().toISOString().slice(0,10)
  const next={...value}
  if(next.status==='invoiced')next.invoice_date ||=today
  if(next.status==='paid'){next.invoice_date ||=today;next.paid_on ||=today}
  if(next.status==='pending'){next.invoice_date=null;next.paid_on=null;next.invoice_reference=null}
  if(next.status==='uncollectible'){next.invoice_date ||=today;next.paid_on=null}
  const result=await supabase.from('retainer_charges').update({status:next.status,invoice_reference:next.invoice_reference||null,invoice_date:next.invoice_date||null,due_on:next.due_on||null,paid_on:next.paid_on||null,notes:next.notes||null,updated_at:new Date().toISOString()}).eq('id',next.id).eq('client_id',clientId)
  if(result.error){setError(result.error.message);return false}
  await load();onSaved();return true
 }
 return <div className="space-y-3">
  {loading&&<p role="status" className="text-sm">A carregar as prestações…</p>}
  {error&&<p role="alert" className="text-sm text-danger">{error}</p>}
  {!loading&&<div className="space-y-2">{charges.map(charge=><button key={charge.id} type="button" className="flex w-full flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface p-3 text-left hover:border-primary hover:bg-secondary-soft" onClick={()=>setEditing(charge)}><span><strong className="block capitalize">{new Intl.DateTimeFormat('pt-PT',{month:'long',year:'numeric'}).format(new Date(`${charge.period_start}T12:00:00`))}</strong><small className="text-text-secondary">{chargeStatuses[charge.status]} · factura {charge.invoice_reference||'—'} · {formatDate(charge.invoice_date)}</small></span><strong className="financial-value tabular-nums">{money(charge.amount,charge.currency)}</strong></button>)}{!charges.length&&<p className="text-sm text-text-secondary">Não há prestações nesta situação.</p>}</div>}
  {editing&&<RetainerChargeDialog charge={editing} readOnly={false} onClose={()=>setEditing(null)} onSave={save}/>}
 </div>
}
