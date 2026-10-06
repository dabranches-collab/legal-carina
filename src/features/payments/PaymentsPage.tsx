import {useCallback,useEffect,useRef,useState} from 'react'
import {supabase} from '../../lib/supabase'
import {StandardDataTable,type TableColumn} from '../../components/table/StandardDataTable'
import {EditWorkEntryModal} from '../work-entries/EditWorkEntryModal'
import {openClientRecord} from '../master-data/openClientRecord'
import {RetainerChargeDialog,type RetainerCharge} from '../master-data/RetainerChargeDialog'
import {PaymentDialog} from './PaymentDialog'
import {paymentCategories,paymentCounts,money,type PaymentCategory,type PaymentItem} from './payments'

export function PaymentsPage(){
 const [rows,setRows]=useState<PaymentItem[]>([]),[category,setCategory]=useState<PaymentCategory>('unbilled'),[loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState('')
 const [invoicing,setInvoicing]=useState<{item:PaymentItem;charge:RetainerCharge}|null>(null)
 const [selected,setSelected]=useState<PaymentItem|null>(null),[editing,setEditing]=useState<string|null>(null),generation=useRef(0)
 const load=useCallback(async()=>{const run=++generation.current;setLoading(true);setError('');try{if(!supabase)throw new Error('Ligação ao Supabase indisponível.');const result=await supabase.rpc('get_payment_queue');if(result.error)throw result.error;if(run===generation.current)setRows(result.data??[])}catch(cause){if(run===generation.current){setRows([]);setError(cause&&typeof cause==='object'&&'message' in cause?String(cause.message):'Não foi possível consultar as pendências.')}}finally{if(run===generation.current)setLoading(false)}},[])
 useEffect(()=>{void load();const refresh=()=>{void load()};window.addEventListener('entity-record-saved',refresh);return()=>{window.removeEventListener('entity-record-saved',refresh)}},[load])
 const counts=paymentCounts(rows)
 const columns:TableColumn<PaymentItem>[]=[
  {id:'client',label:'Cliente',value:row=>row.client_name,render:row=><button type="button" aria-label={'Abrir detalhe de '+row.title} onClick={()=>setSelected(row)} className="min-h-11 w-full whitespace-normal break-words px-2 text-left font-semibold text-primary underline underline-offset-4">{row.client_name}</button>,essential:true,width:200,align:'left'},
  {id:'society',label:'Sociedade',value:row=>row.society_name},
  {id:'title',label:'Detalhe',value:row=>row.title,essential:true,width:300,render:row=><button type="button" onClick={()=>setSelected(row)} className="min-h-11 w-full whitespace-normal break-words rounded-lg px-2 py-2 text-left font-semibold text-primary underline underline-offset-4">{row.title}</button>},
  {id:'date',label:'Data',kind:'date',value:row=>row.date},
  {id:'status',label:'Estado',value:row=>row.status},
  {id:'remaining',label:category==='unbilled'?'Valor':'Por receber',kind:'money',value:row=>row.remaining,render:row=><span className="financial-value tabular-nums">{money(row.remaining,row.currency)}</span>},
  {id:'currency',label:'Moeda',value:row=>row.currency},
 ]
 function saved(){setSelected(null);setEditing(null);setNotice('Pagamento registado. A actualizar as pendências.');void load()}
 return <section className="space-y-5"><header><h1 className="font-display text-2xl font-semibold">Pagamentos</h1><p className="mt-2 max-w-3xl text-sm text-text-secondary">Consulte as pendências e abra um item para conferir o saldo. Facturação e recebimento são operações distintas.</p></header>
  <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{(Object.keys(paymentCategories) as PaymentCategory[]).map(key=><button key={key} type="button" aria-pressed={key===category} onClick={()=>{setCategory(key);setNotice('')}} className={`flex min-h-28 flex-col items-start justify-between gap-3 sm:flex-row sm:items-center rounded-xl border p-4 text-left transition-colors ${key===category?'border-primary bg-secondary-soft shadow-sm':'border-border bg-surface hover:border-primary'}`}><span className="max-w-52 break-words text-sm font-semibold">{paymentCategories[key]}</span><span aria-label={loading?'A carregar':error?'Indisponível':counts[key]+' pendências'} className="min-w-12 rounded-lg bg-surface-subtle px-3 py-2 text-center text-2xl font-bold tabular-nums">{loading?'…':error?'—':counts[key]}</span></button>)}</div>
  {notice&&<p role="status" className="rounded-lg bg-success-soft p-3 text-sm text-success">{notice}</p>}
  <StandardDataTable key={category} id={'payments-'+category} label={paymentCategories[category]} rows={rows.filter(row=>row.category===category)} columns={columns} rowKey={row=>row.id} loading={loading} error={error} onRetry={()=>void load()} emptyMessage="Sem pendências nesta categoria." defaultPageSize={20} rowHeight={64}/>
  {selected&&<PaymentDialog key={selected.category+selected.id} item={selected} onClose={()=>setSelected(null)} onSaved={saved} onEdit={(current,charge)=>{if(current.category==='work'||current.category==='unbilled')setEditing(current.id);else if(current.category==='retainer'&&charge)setInvoicing({item:current,charge});else openClientRecord(current.client_id,current.fixed_fee_job_id?'fixedFees':undefined);setSelected(null)}}/>}
  {invoicing&&<RetainerChargeDialog charge={invoicing.charge} readOnly={false} billingOnly onClose={()=>setInvoicing(null)} onSave={async charge=>{if(!supabase)return false;const result=await supabase.rpc('invoice_pending_retainer',{p_id:charge.id,p_expected_token:invoicing.item.token,p_invoice_date:charge.invoice_date,p_invoice_reference:charge.invoice_reference,p_due_on:charge.due_on,p_notes:charge.notes});if(result.error)throw new Error(result.error.message);setNotice('Facturação registada. Abra a prestação para registar o recebimento.');void load();return true}}/>}
  {editing&&<EditWorkEntryModal entryId={editing} billingOnly canDelete={false} requiresReason={false} onClose={()=>{setEditing(null);void load()}} onSaved={()=>{setEditing(null);void load()}}/>}
 </section>
}
