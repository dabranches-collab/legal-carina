import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { StandardDataTable, type TableColumn } from '../../components/table/StandardDataTable'
import { ClientCreditPanel } from './ClientCreditPanel'
import { creditMoney, type CreditAccount } from './credit'

export function ProvisionsPage(){
 const [rows,setRows]=useState<CreditAccount[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[positiveOnly,setPositiveOnly]=useState(true),[client,setClient]=useState<CreditAccount|null>(null)
 const load=useCallback(async()=>{setLoading(true);setError('');try{if(!supabase)throw new Error('Ligação indisponível.');const result=await supabase.rpc('get_client_credit_accounts');if(result.error)throw result.error;setRows(result.data??[])}catch(cause){setError(cause&&typeof cause==='object'&&'message' in cause?String(cause.message):'Não foi possível carregar as provisões.')}finally{setLoading(false)}},[])
 useEffect(()=>{void load()},[load])
 const columns:TableColumn<CreditAccount>[]=[
  {id:'client',label:'Cliente',value:row=>row.client_name,essential:true},
  {id:'treatment',label:'Tratamento',value:()=> 'Provisões'},
  {id:'society',label:'Sociedade',value:row=>row.society_name},
  {id:'currency',label:'Moeda',value:row=>row.currency},
  {id:'received',label:'Provisões recebidas',kind:'money',value:row=>Number(row.received),render:row=><span className="financial-value">{creditMoney(row.received,row.currency)}</span>},
  {id:'consumed',label:'Descontado nas notas',kind:'money',value:row=>Number(row.consumed),render:row=><span className="financial-value">{creditMoney(row.consumed,row.currency)}</span>},
  {id:'balance',label:'Saldo disponível',kind:'money',value:row=>Number(row.balance),render:row=><strong className="financial-value">{creditMoney(row.balance,row.currency)}</strong>},
 ]
 return <section className="space-y-4"><div className="card p-5"><h2 className="font-display text-2xl font-semibold">Provisões</h2><p className="mt-1 text-sm text-text-secondary">Clientes com saldo para desconto nas Notas de Honorários. Mantêm-se nas listas de Particulares e Empresas.</p><label className="mt-3 flex min-h-11 items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={positiveOnly} onChange={event=>setPositiveOnly(event.target.checked)}/>Apenas clientes com saldo disponível</label><p className="text-xs text-text-secondary">Duplo clique para abrir as provisões do cliente.</p></div>
  <StandardDataTable id="client-provisions" label="Clientes com provisões" rows={rows.filter(row=>!positiveOnly||Number(row.balance)>0)} columns={columns} rowKey={row=>row.id} loading={loading} error={error} onRetry={()=>void load()} onRowDoubleClick={setClient}/>
  {client&&<div className="app-safe-fixed fixed z-[80] flex bg-navigation/65 p-0 sm:p-4" role="dialog" aria-modal="true" aria-label={`Provisões · ${client.client_name}`}><section className="card mx-auto flex w-full max-w-5xl flex-col overflow-hidden"><header className="flex shrink-0 items-center justify-between gap-3 border-b border-border p-4"><h2 className="min-w-0 break-words font-semibold">{client.client_name} · Provisões</h2><button type="button" aria-label="Fechar provisões" className="min-h-11 min-w-11 rounded-lg border border-border" onClick={()=>{setClient(null);void load()}}>×</button></header><div className="min-h-0 overflow-auto p-4"><ClientCreditPanel key={client.client_id} clientId={client.client_id}/></div></section></div>}
 </section>
}
