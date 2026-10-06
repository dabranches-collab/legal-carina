import {useEffect,useRef,useState} from 'react'
import {createPortal} from 'react-dom'
import {supabase} from '../../lib/supabase'
import {useModalLifecycle} from '../../hooks/useModalLifecycle'
import {formatDate} from '../../utils/date'
import {money,paymentAmount,type PaymentItem,type PaymentDetail} from './payments'

export function PaymentDialog({item,onClose,onSaved,onEdit}:{item:PaymentItem;onClose:()=>void;onSaved:()=>void;onEdit:(item:PaymentItem,charge?:PaymentDetail['charge'])=>void}){
 const [detail,setDetail]=useState<PaymentDetail|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false)
 const [amount,setAmount]=useState(''),[date,setDate]=useState(new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10)),[reference,setReference]=useState(''),[confirmed,setConfirmed]=useState(false)
 const lock=useRef(false),request=useRef<{id:string;payload:string}|null>(null)
 useModalLifecycle(onClose,busy)
 useEffect(()=>{let active=true;void(async()=>{try{if(!supabase)throw new Error('Ligação indisponível.');const result=await supabase.rpc('get_payment_detail',{p_category:item.category,p_id:item.id});if(result.error)throw result.error;if(active){setDetail(result.data);setAmount(String(result.data.item.remaining??''))}}catch(cause){if(active)setError(cause&&typeof cause==='object'&&'message' in cause?String(cause.message):'Não foi possível abrir o detalhe.')}finally{if(active)setLoading(false)}})();return()=>{active=false}},[item.category,item.id])
 const current=detail?.item??item,partial=current.category==='note'&&!current.fixed_fee_job_id
 async function save(){
  if(lock.current||!supabase||!detail)return
  const value=paymentAmount(amount)
  if(!value||value>Number(current.remaining)||(!partial&&value!==current.remaining)||!date||!reference.trim()||!confirmed){setError('Confirme o montante, a data, a referência e o recebimento.');return}
  const args={p_category:current.category,p_id:current.id,p_amount:value,p_received_on:date,p_reference:reference.trim(),p_expected_token:current.token}
  const payload=JSON.stringify(args)
  if(!request.current||request.current.payload!==payload)request.current={id:crypto.randomUUID(),payload}
  lock.current=true;setBusy(true);setError('')
  try{const result=await supabase.rpc('record_pending_payment',{...args,p_request_id:request.current.id});if(result.error)throw result.error;onSaved()}
  catch(cause){setError(cause&&typeof cause==='object'&&'message' in cause?String(cause.message):'Não foi possível confirmar o pagamento. Pode reenviar o mesmo pedido com segurança.')}
  finally{lock.current=false;setBusy(false)}
 }
 return createPortal(<div className="app-safe-fixed fixed z-[90] grid place-items-center bg-navigation/65 p-3"><section role="dialog" aria-modal="true" aria-labelledby="payment-title" className="card max-h-full w-full max-w-2xl overflow-y-auto p-5">
  <header className="flex items-start justify-between gap-3"><div><p className="text-sm text-text-secondary">{current.client_name} · {current.society_name}</p><h2 id="payment-title" className="mt-1 break-words font-display text-xl font-semibold">{current.title}</h2></div><button type="button" disabled={busy} aria-label="Fechar pagamento" onClick={onClose} className="control min-h-11 min-w-11">×</button></header>
  {loading&&<p role="status" className="my-4">A consultar o saldo actual…</p>}
  {error&&<p role="alert" className="my-3 rounded-lg bg-danger-soft p-3 text-danger">{error}</p>}
  {detail&&<><dl className="my-5 grid grid-cols-2 gap-3 sm:grid-cols-4">{(current.category==='unbilled'?[['Valor do registo',current.total]]:[['Total',current.total],['Provisão',current.deducted],['Recebido',current.received],['Por receber',current.remaining]]).map(([label,value])=><div key={String(label)} className="rounded-lg bg-surface-subtle p-3"><dt className="text-xs text-text-secondary">{label}</dt><dd className="financial-value mt-1 break-words font-semibold">{money(value as number|null,current.currency)}</dd></div>)}</dl>
   <p className="text-sm text-text-secondary">{current.status}{current.revision? ' · Versão '+current.revision:''}</p>
   {detail.items.length>0&&<details className="my-4 rounded-lg border border-border p-3"><summary className="min-h-11 cursor-pointer font-semibold">Registos incluídos ({detail.items.length})</summary><ul className="space-y-2">{detail.items.map(row=><li key={row.id} className="break-words border-t border-border pt-2 text-sm">{row.activity_description}</li>)}</ul></details>}
   {detail.receipts.length>0&&<section className="my-4"><h3 className="font-semibold">Recebimentos registados</h3><ul className="mt-2 space-y-2">{detail.receipts.map(receipt=><li key={receipt.id} className="rounded-lg bg-surface-subtle p-3 text-sm">{formatDate(receipt.received_on)} · {money(receipt.amount,current.currency)}<span className="block break-words text-text-secondary">{receipt.reference}</span></li>)}</ul><p className="mt-2 text-xs text-text-secondary">O total recebido inclui também pagamentos anteriores ao histórico acima.</p></section>}
   {current.can_pay?<form onSubmit={event=>{event.preventDefault();void save()}} className="mt-5 space-y-4"><p className="rounded-lg bg-secondary-soft p-3 text-sm">{partial?'Pode registar um recebimento parcial ou liquidar o saldo.':'Confirme a liquidação integral do saldo.'} O recebimento não emite factura ou recibo fiscal e não utiliza provisões.</p><fieldset disabled={busy} className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Valor recebido ({current.currency})<input aria-label="Valor recebido" required readOnly={!partial} inputMode="decimal" value={amount} onChange={event=>{setAmount(event.target.value);setConfirmed(false)}} className="control mt-1 w-full px-3"/></label><label className="text-sm">Data do recebimento<input aria-label="Data do recebimento" required type="date" value={date} onChange={event=>setDate(event.target.value)} className="control mt-1 w-full px-3"/></label><label className="text-sm sm:col-span-2">Referência / motivo<input aria-label="Referência / motivo" required maxLength={1000} value={reference} onChange={event=>setReference(event.target.value)} className="control mt-1 w-full px-3"/></label><label className="flex min-h-11 items-center gap-3 text-sm sm:col-span-2"><input type="checkbox" checked={confirmed} onChange={event=>setConfirmed(event.target.checked)}/>Confirmo que este valor foi recebido.</label></fieldset><footer className="sticky bottom-0 flex flex-wrap justify-end gap-3 bg-surface py-3 pb-[max(.75rem,var(--safe-bottom))]"><button type="button" disabled={busy} onClick={onClose} className="control min-h-11 px-4">Cancelar</button><button disabled={busy||!confirmed} type="submit" className="min-h-11 rounded-lg bg-primary px-4 font-semibold text-surface disabled:opacity-50">{busy?'A registar…':'Registar pagamento'}</button></footer></form>:<div className="mt-5 space-y-3"><p className="rounded-lg bg-surface-subtle p-3 text-sm">{current.note_associated?'O pagamento deste registo é tratado na nota de honorários. Pode actualizar a facturação na ficha.':current.category==='unbilled'||current.status==='Por facturar'?'Registe primeiro a facturação na ficha. O pagamento não altera automaticamente o estado de facturação.':'Não existe saldo elegível ou permissão para registar este pagamento.'}</p>{current.can_edit&&<button type="button" onClick={()=>onEdit(current,detail.charge)} className="control min-h-11 px-4">Abrir ficha para facturar</button>}</div>}
  </>}
 </section></div>,document.body)
}
