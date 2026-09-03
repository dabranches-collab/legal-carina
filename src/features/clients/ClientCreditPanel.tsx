import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { creditDate, creditKind, creditMoney, creditStatement, type CreditAccount, type CreditDetail } from './credit'
import { saveProvisionNotePdf } from './creditPdf'
import { loadCreditUsage } from './loadCreditUsage'
import { CreditUsageSummary } from './CreditUsageSummary'
import type { CreditUsage } from './creditUsage'

const today=()=>new Date().toLocaleDateString('sv-SE')
const button='min-h-11 rounded-lg border border-border px-3 text-sm font-semibold disabled:opacity-40'
export function ClientCreditPanel({clientId,initialAccountId,readOnly=false,onRequestEdit}:{clientId:string;initialAccountId?:string;readOnly?:boolean;onRequestEdit?:()=>void}){
  const [accounts,setAccounts]=useState<CreditAccount[]>([]),[societies,setSocieties]=useState<{id:string;name:string}[]>([])
  const [accountId,setAccountId]=useState(''),[detail,setDetail]=useState<CreditDetail|null>(null)
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('')
  const [paymentOpen,setPaymentOpen]=useState(false),[society,setSociety]=useState(''),[currency,setCurrency]=useState('EUR'),[amount,setAmount]=useState(''),[date,setDate]=useState(today),[reference,setReference]=useState('')
  const [usage,setUsage]=useState<CreditUsage|null>(null),[from,setFrom]=useState(''),[to,setTo]=useState('')
  const [reverseId,setReverseId]=useState(''),[reason,setReason]=useState('')
  const paymentRequest=useRef(crypto.randomUUID()),reverseRequest=useRef(crypto.randomUUID()),lock=useRef(false)
  const generation=useRef(0)
  const refresh=useCallback(async(preferred?:string)=>{
    if(!supabase)throw new Error('Ligação ao Supabase indisponível.')
    const result=await supabase.rpc('get_client_credit_accounts',{p_client_id:clientId})
    if(result.error)throw result.error
    const rows=(result.data??[]) as CreditAccount[];setAccounts(rows)
    const next=preferred||rows.find(row=>row.id===initialAccountId)?.id||rows[0]?.id||'';setAccountId(next)
    if(next){const response=await supabase.rpc('get_client_credit_detail',{p_account_id:next});if(response.error)throw response.error;setUsage(await loadCreditUsage(response.data as CreditDetail));setDetail(response.data as CreditDetail)}else setDetail(null)
  },[clientId,initialAccountId])
  useEffect(()=>{let active=true;setLoading(true);setError('');setDetail(null);void(async()=>{
    try{await refresh();if(supabase){const result=await supabase.from('billing_entities').select('id,name').eq('active',true).order('name');if(result.error)throw result.error;if(active)setSocieties(result.data??[])}}
    catch(cause){if(active)setError(message(cause))}finally{if(active)setLoading(false)}
  })();return()=>{active=false}},[refresh])
  async function choose(id:string){const version=++generation.current;setAccountId(id);setDetail(null);setLoading(true);setError('');try{const result=await supabase!.rpc('get_client_credit_detail',{p_account_id:id});if(result.error)throw result.error;const nextUsage=await loadCreditUsage(result.data as CreditDetail);if(version===generation.current){setDetail(result.data as CreditDetail);setUsage(nextUsage)}}catch(cause){if(version===generation.current)setError(message(cause))}finally{if(version===generation.current)setLoading(false)}}
  async function mutate(action:()=>Promise<void>){if(lock.current)return;lock.current=true;setBusy(true);setError('');setNotice('');try{await action()}catch(cause){setError(message(cause))}finally{lock.current=false;setBusy(false)}}
  const validMovements=(detail?.movements??[]).filter(row=>!row.reversed&&row.kind!=='reversal').map(row=>({...row,recorded_at:row.movement_date+'T00:00:00Z'}))
  const statement=creditStatement(validMovements,from,to),invalidPeriod=Boolean(from&&to&&from>to)
  async function payment(){await mutate(async()=>{
    const value=Number(amount.replace(',','.'));if(!Number.isFinite(value)||value<=0||Math.abs(value*100-Math.round(value*100))>0.00001||!society||!reference.trim()||!date||date>today())throw new Error('Preencha sociedade, valor positivo com até duas casas decimais, data e referência.')
    const result=await supabase!.rpc('record_client_credit_payment',{p_client_id:clientId,p_billing_entity_id:society,p_currency:currency,p_amount:value,p_date:date,p_reference:reference,p_request_id:paymentRequest.current});if(result.error)throw result.error
    paymentRequest.current=crypto.randomUUID();setAmount('');setReference('');setPaymentOpen(false);await refresh();setNotice('Provisão registada. O saldo acompanha os registos desde a data do depósito.')
  })}
  async function reverse(){await mutate(async()=>{const result=await supabase!.rpc('reverse_client_credit',{p_movement_id:reverseId,p_reason:reason,p_request_id:reverseRequest.current});if(result.error)throw result.error;reverseRequest.current=crypto.randomUUID();setReverseId('');setReason('');await refresh(accountId);setNotice('Provisão anulada. O saldo foi actualizado.')})}
  return <section aria-label="Provisões para honorários" className="min-w-0 space-y-4">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-semibold">Provisões para honorários</h3><p className="mt-1 text-sm text-text-secondary">Saldo inicial, reforços e consumo dos registos desde o depósito.</p></div>{readOnly?<button type="button" className={button} onClick={onRequestEdit}>Gerir provisões</button>:<button type="button" className={`${button} bg-primary text-surface`} disabled={busy||loading} onClick={()=>setPaymentOpen(!paymentOpen)}>Registar provisão</button>}</div>
    {error&&<div role="alert" className="rounded-lg bg-danger-soft p-3 text-danger">{error}<button type="button" className={`${button} ml-2`} disabled={busy} onClick={()=>void mutate(()=>refresh(accountId))}>Tentar novamente</button></div>}
    {notice&&<p role="status" className="rounded-lg bg-success-soft p-3 text-success">{notice}</p>}
    {paymentOpen&&!readOnly&&<fieldset disabled={busy} className="grid gap-3 rounded-xl border border-border bg-surface-subtle p-4 sm:grid-cols-2"><legend className="px-2 font-semibold">Saldo inicial / reforço da provisão</legend>
      <label>Sociedade<select className="control mt-1 block w-full px-2" value={society} onChange={event=>setSociety(event.target.value)}><option value="">Seleccionar sociedade</option>{societies.map(row=><option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
      <label>Moeda<select className="control mt-1 block w-full px-2" value={currency} onChange={event=>setCurrency(event.target.value)}>{['EUR'].map(value=><option key={value}>{value}</option>)}</select></label>
      <label>Montante<input className="control mt-1 block w-full px-2" inputMode="decimal" value={amount} onChange={event=>setAmount(event.target.value)} placeholder="0,00"/></label>
      <label>Data de entrada<input className="control mt-1 block w-full min-w-0 px-2" type="date" max={today()} value={date} onInput={event=>setDate(event.currentTarget.value)} onChange={event=>setDate(event.target.value)}/></label>
      <label className="sm:col-span-2">Origem / referência<input maxLength={1000} className="control mt-1 block w-full px-2" value={reference} onChange={event=>setReference(event.target.value)} placeholder="Ex.: saldo inicial, transferência, referência do recibo…"/></label>
      <div className="flex flex-wrap gap-2 sm:col-span-2"><button type="button" className={`${button} bg-primary text-surface`} onClick={()=>void payment()}>Confirmar provisão</button><button type="button" className={button} onClick={()=>setPaymentOpen(false)}>Cancelar</button></div>
    </fieldset>}
    {accounts.length>0&&<label className="block text-sm font-semibold">Conta de provisões<select className="control mt-1 block w-full px-2" value={accountId} disabled={busy||loading} onChange={event=>void choose(event.target.value)}>{accounts.map(row=><option key={row.id} value={row.id}>{row.society_name} · {row.currency}</option>)}</select></label>}
    {loading?<p role="status">A carregar as provisões…</p>:!detail&&!error?<p className="rounded-lg bg-surface-subtle p-4">Ainda não existem pagamentos antecipados neste cliente.</p>:null}
    {detail&&!loading&&<>
      {usage&&<CreditUsageSummary account={detail.account} usage={usage} movements={detail.movements}/>}
      <div className="space-y-3"><div className="flex flex-wrap items-end gap-3"><h4 className="mr-auto font-semibold">Provisões e notas válidas</h4><label className="text-xs">Lançamentos desde<input className="control mt-1 block min-w-0 px-2" type="date" value={from} onChange={event=>setFrom(event.target.value)}/></label><label className="text-xs">Até<input className="control mt-1 block min-w-0 px-2" type="date" value={to} onChange={event=>setTo(event.target.value)}/></label></div>
        {invalidPeriod?<p role="alert" className="text-danger">A data final deve ser igual ou posterior à inicial.</p>:<><div className="space-y-2">{statement.rows.map(row=><article key={row.id} className="rounded-lg border border-border p-3"><div className="flex flex-wrap justify-between gap-2"><strong>{creditDate(row.recorded_at)} · {creditKind(row.kind)}{row.reversed?' · Estornado':''}</strong><span className="financial-value font-semibold">{creditMoney(row.amount,detail.account.currency)}</span></div><details className="mt-2 text-sm"><summary className="cursor-pointer">Referência</summary><p className="mt-1 break-words">{row.reference}</p></details>{row.note&&<><p className="mt-1 text-sm text-text-secondary">Total da nota: {creditMoney(row.note.total,detail.account.currency)} · Provisão descontada: {creditMoney(row.note.deducted,detail.account.currency)} · A pagar: {creditMoney(row.note.remaining,detail.account.currency)}</p><details className="mt-2 text-sm"><summary className="cursor-pointer font-semibold">Ver os {row.note.items.length} registos da nota</summary>{row.note.items.map(item=><p key={item.id} className="mt-2 break-words">{creditDate(item.work_date)} · {item.activity_description} · {item.duration_minutes} min · {creditMoney(item.effective_amount,detail.account.currency)}</p>)}</details><button type="button" className={`${button} mt-2`} onClick={()=>saveProvisionNotePdf(detail.account,row.note!,row.reversed||row.kind==='reversal')}>Guardar cópia da nota</button></>}<div className="mt-2 flex flex-wrap items-center justify-between gap-2">{!readOnly&&!row.reversed&&row.kind!=='reversal'&&<button type="button" className={button} disabled={busy} onClick={()=>{setReverseId(row.id);setReason('');reverseRequest.current=crypto.randomUUID()}}>Estornar</button>}</div>{reverseId===row.id&&<div className="mt-2 space-y-2"><label className="block text-sm">Motivo do estorno<input className="control mt-1 w-full px-2" maxLength={1000} value={reason} onChange={event=>setReason(event.target.value)}/></label><button type="button" className={`${button} text-danger`} disabled={busy||reason.trim().length<3} onClick={()=>void reverse()}>Confirmar estorno</button><button type="button" className={`${button} ml-2`} disabled={busy} onClick={()=>setReverseId('')}>Cancelar</button></div>}</article>)}</div></>}
      </div>
    </>}
  </section>
}
function message(cause:unknown){const text=cause&&typeof cause==='object'&&'message' in cause?String(cause.message):'Não foi possível concluir a operação.';return /get_client_credit|schema cache/.test(text)?'O módulo de provisões ainda não está instalado neste ambiente. A activação depende da publicação da nova versão.':text}
