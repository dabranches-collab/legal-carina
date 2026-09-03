import { useEffect, useMemo, useState } from 'react'
import { EditWorkEntryModal } from '../work-entries/EditWorkEntryModal'
import { CalendarDateInput } from '../../components/CalendarDateInput'
import { StandardDataTable, type TableColumn } from '../../components/table/StandardDataTable'
import { supabase } from '../../lib/supabase'
import { professionalName, referrerNames } from '../../lib/professionalNames'
import { allocateHonoraria, allocationPeriod, eligibleAllocationWork, missingTaskReferrer, validAllocationRates, type AllocationWork, type AllocationRates } from './allocation'
import { AllocationChart } from './AllocationChart'
import { allocationColors } from './allocation'
import { saveAllocationPdf } from './allocationPdf'

const euros=(cents:number)=>new Intl.NumberFormat('pt-PT',{style:'currency',currency:'EUR'}).format(cents/100)
const hours=(minutes:number)=>`${Math.floor(minutes/60)} h ${minutes%60} min`
const rateFields=[['client','Angariação do cliente'],['task','Angariação da tarefa'],['execution','Execução'],['office','Escritório']] as const
type Attention='client'|'task'|'executor'|null
type ClientSummary={id:string;name:string;records:number;minutes:number}
function clientHref(id:string){
 const query=new URLSearchParams(window.location.search)
 query.set('view','master-data');query.set('entity','clients');query.set('record',id);query.delete('society');query.delete('clientType');query.delete('clientMode')
 return `?${query}`
}
export function LegalteamAllocation({societyId}:{societyId:string}){
 const [editing,setEditing]=useState<string|null>(null)
 const [exporting,setExporting]=useState(false),[exportError,setExportError]=useState('')
 const [dates,setDates]=useState<{start:string;end:string}|null>(null)
 const [ratesInput,setRatesInput]=useState({client:'10',task:'10',execution:'50',office:'30'})
 const [clientIds,setClientIds]=useState<string[]|null>(null),[clientSearch,setClientSearch]=useState('')
 const [attention,setAttention]=useState<Attention>(null),[selected,setSelected]=useState('all')
 const [paidOnly,setPaidOnly]=useState(false),[work,setWork]=useState<AllocationWork[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[refresh,setRefresh]=useState(0)
 useEffect(()=>{setDates(null);setClientIds(null);setAttention(null);setSelected('all')},[societyId])
 useEffect(()=>{let active=true;setLoading(true);setError('');setWork([]);void(async()=>{
  try{
   if(!supabase)throw new Error('Ligação indisponível.')
   const rows:AllocationWork[]=[];let total=0
   do{
    const result=await supabase.rpc('get_legalteam_allocation_work',{p_billing_entity_id:societyId,p_start:null,p_end:null,p_offset:rows.length,p_limit:500})
    if(result.error)throw new Error(result.error.code==='PGRST202'?'O mapa ficará disponível após a actualização da base de dados.':result.error.message)
    const page=result.data as {items:AllocationWork[];total:number};total=page.total
    if(!page.items.length&&rows.length<total)throw new Error('Não foi possível obter todos os registos.')
    rows.push(...page.items)
   }while(rows.length<total)
   if(active)setWork(rows)
  }catch(cause){if(active)setError(cause instanceof Error?cause.message:'Não foi possível carregar o mapa.')}
  finally{if(active)setLoading(false)}
 })();return()=>{active=false}},[societyId,refresh])
 const bounds=useMemo(()=>allocationPeriod(work),[work]),{start,end}=dates??bounds
 const validDates=!!start&&!!end&&start<=end
 const periodWork=useMemo(()=>validDates?work.filter(r=>eligibleAllocationWork(r)&&r.work_date>=start&&r.work_date<=end):[],[work,start,end,validDates])
 const clients=useMemo(()=>{
  const entries=new Map<string,ClientSummary>()
  for(const row of periodWork){const client=entries.get(row.client_id)??{id:row.client_id,name:row.client_name,records:0,minutes:0};client.records++;client.minutes+=row.duration_minutes;entries.set(client.id,client)}
  return [...entries.values()].sort((a,b)=>a.name.localeCompare(b.name,'pt-PT'))
 },[periodWork])
 const scope=useMemo(()=>periodWork.filter(r=>(clientIds===null||clientIds.includes(r.client_id))&&(!paidOnly||r.is_paid)),[periodWork,clientIds,paidOnly])
 const rates=useMemo(()=>Object.fromEntries(rateFields.map(([key])=>[key,ratesInput[key]===''?NaN:Number(ratesInput[key])])) as AllocationRates,[ratesInput])
 const validRates=validAllocationRates(rates),rateTotal=Object.values(rates).reduce((n,p)=>n+(Number.isFinite(p)?p:0),0)
 const map=useMemo(()=>validRates?allocateHonoraria(scope,false,rates):null,[scope,validRates,rates])
 const allocations=new Map(map?.rows.map(r=>[r.id,r])??[])
 const gaps={client:scope.filter(r=>!r.client_referrer),task:scope.filter(missingTaskReferrer),executor:scope.filter(r=>!r.professional_name?.trim())}
 const missingClients=clients.filter(c=>gaps.client.some(r=>r.client_id===c.id)).map(c=>({...c,records:gaps.client.filter(r=>r.client_id===c.id).length,minutes:gaps.client.filter(r=>r.client_id===c.id).reduce((n,r)=>n+r.duration_minutes,0)}))
 const filtered=(attention?gaps[attention]:scope).filter(row=>selected==='all'||selected==='office'||[
  professionalName(row.professional_name?.trim()||'Responsável por identificar'),
  row.client_referrer?referrerNames[row.client_referrer]:'',
  row.task_referrer==='other'?professionalName(row.task_referrer_other??''):row.task_referrer?referrerNames[row.task_referrer]:'',
 ].some(name=>name.normalize('NFC').trim().toLocaleLowerCase('pt-PT')===selected))
 const choosePerson=(id:string)=>{setSelected(id);setAttention(null)}
 const changeDate=(field:'start'|'end',value:string)=>{setDates({start,end,[field]:value});setSelected('all')}
 const percentage=(key:keyof AllocationRates)=>`${ratesInput[key]||'—'}%`
 const amount=(row:AllocationWork,field:'amount'|'clientShare'|'taskShare'|'executionShare'|'officeShare')=>allocations.get(row.id)?.[field]
 const shareColumn=(id:string,label:string,field:'amount'|'clientShare'|'taskShare'|'executionShare'|'officeShare'):TableColumn<AllocationWork>=>({id,label,value:r=>{const n=amount(r,field);return n===undefined?null:n/100},render:r=>{const n=amount(r,field);return n===undefined?(r.billing_scope==='retainer'||!r.is_billable?'—':'Por apurar'):euros(n)},width:150})
 const columns:TableColumn<AllocationWork>[]=[
  {id:'date',label:'Data',value:r=>r.work_date,width:115},
  {id:'client',label:'Cliente',value:r=>r.client_name,width:190},
  {id:'activity',label:'Actividade',value:r=>r.activity_description,width:260},
  {id:'responsible',label:'Responsável',value:r=>professionalName(r.professional_name?.trim()||'Por identificar'),width:170},
  {id:'hours',label:'Horas',value:r=>r.duration_minutes/60,render:r=>hours(r.duration_minutes),width:110},
  shareColumn('amount','Honorários sem IVA','amount'),
  {id:'clientRef',label:'Angariador do cliente',value:r=>r.client_referrer?referrerNames[r.client_referrer]:'Por identificar',width:185},
  shareColumn('clientShare',`Cliente · ${percentage('client')}`,'clientShare'),
  {id:'taskRef',label:'Angariador da tarefa',value:r=>r.task_referrer==='other'?r.task_referrer_other?.trim()||'Por identificar':r.task_referrer?referrerNames[r.task_referrer]:'Por identificar',width:185},
  shareColumn('taskShare',`Tarefa · ${percentage('task')}`,'taskShare'),
  shareColumn('execution',`Execução · ${percentage('execution')}`,'executionShare'),
  shareColumn('office',`Escritório · ${percentage('office')}`,'officeShare'),
  {id:'paid',label:'Pagamento',value:r=>r.is_paid?'Pago':'Por pagar',width:115},
 ]
 const clientColumns:TableColumn<ClientSummary>[]=[
  {id:'client',label:'Cliente sem angariador',value:c=>c.name,width:260},
  {id:'records',label:'Registos no período',value:c=>c.records,width:160},
  {id:'hours',label:'Horas',value:c=>c.minutes/60,render:c=>hours(c.minutes),width:140},
  {id:'actions',label:'Consultar',value:()=>'',render:c=><div className="flex flex-wrap gap-2"><a className="control inline-flex min-h-10 items-center px-3" href={clientHref(c.id)}>Abrir ficha</a><button type="button" className="control min-h-10 px-3" onClick={()=>{setClientIds([c.id]);setAttention(null)}}>Ver registos</button></div>,width:260},
 ]
 const cardClass=(active:boolean)=>`flex min-w-0 flex-col gap-2 rounded-xl border p-4 text-left transition-colors ${active?'border-secondary bg-secondary-soft':'border-border bg-surface-subtle hover:border-secondary'}`
 const selectedClients=clients.filter(c=>clientIds===null||clientIds.includes(c.id))
 return <section className="card min-w-0 p-4 sm:p-6" aria-label="Repartição LEGALTEAM">
  <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-display text-xl font-semibold">Horas e repartição de honorários</h2><button type="button" disabled={exporting||loading||!!error||!validRates||!validDates||!scope.length} className="control min-h-11 px-4 text-sm font-semibold disabled:opacity-50" onClick={()=>{setExporting(true);setExportError('');void saveAllocationPdf({start,end,rates,paidOnly,clientNames:selectedClients.map(c=>c.name),allClients:clientIds===null,work:scope}).catch(cause=>setExportError(cause instanceof Error?cause.message:'Não foi possível guardar o PDF.')).finally(()=>setExporting(false))}}>{exporting?'A preparar PDF…':'Exportar resumo PDF'}</button></div>
  {exportError&&<p role="alert" className="mt-2 text-sm text-danger">{exportError}</p>}
  <p className="mt-1 text-sm text-text-secondary">Escolha o período, os clientes e a repartição. O cálculo acompanha cada alteração.</p>
  <div className="mt-5 flex flex-wrap items-end gap-4">
   <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:grid-cols-[9.5rem_9.5rem]">
    <label className="min-w-0 text-xs font-semibold">Data inicial<CalendarDateInput required disabled={loading} ariaLabel="Data inicial da repartição" value={start} onChange={v=>changeDate('start',v)} className="mt-1 w-full px-2 text-sm"/></label>
    <label className="min-w-0 text-xs font-semibold">Data final<CalendarDateInput required disabled={loading} ariaLabel="Data final da repartição" value={end} onChange={v=>changeDate('end',v)} className="mt-1 w-full px-2 text-sm"/></label>
   </div>
   <fieldset className="grid min-w-0 flex-1 basis-80 grid-cols-2 gap-2 sm:grid-cols-4"><legend className="sr-only">Percentagens da repartição</legend>
    {rateFields.map(([key,label])=><label key={key} className="min-w-0 text-xs font-semibold">{label}<span className="relative mt-1 block"><input aria-label={`${label} (%)`} type="number" min="0" max="100" step="0.01" value={ratesInput[key]} onChange={e=>setRatesInput(previous=>({...previous,[key]:e.target.value}))} className="control w-full min-w-0 pl-3 pr-8 text-base tabular-nums"/><span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-text-secondary">%</span></span></label>)}
   </fieldset>
  </div>
  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-text-secondary"><span>{dates?'Período personalizado.':'Do primeiro ao último registo da LEGALTEAM.'} {dates&&<button type="button" className="underline" onClick={()=>setDates(null)}>Usar todo o período</button>}</span><span className={validRates?'text-success':'text-danger'}>Total das percentagens: {Number(rateTotal.toFixed(2)).toLocaleString('pt-PT')}%</span></div>
  <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_13rem]">
   <details className="rounded-lg border border-border bg-surface-subtle p-3"><summary className="cursor-pointer text-sm font-semibold">Registos considerados · {clientIds===null?'Todos os clientes':`${selectedClients.length} de ${clients.length} clientes`}</summary>
    <div className="mt-3 space-y-3"><input aria-label="Pesquisar clientes do período" type="search" placeholder="Pesquisar clientes…" value={clientSearch} onChange={e=>setClientSearch(e.target.value)} className="control w-full px-3"/>
     <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm"><input type="checkbox" aria-label="Todos os clientes" checked={clientIds===null} onChange={e=>{setClientIds(e.target.checked?null:[]);setSelected('all')}}/>Todos os clientes <span className="text-text-secondary">({clients.length})</span></label>
     <div className="max-h-48 overflow-y-auto" role="group" aria-label="Clientes com registos no período">{clients.filter(c=>c.name.toLocaleLowerCase('pt-PT').includes(clientSearch.toLocaleLowerCase('pt-PT'))).map(c=><label key={c.id} className="flex min-h-10 cursor-pointer items-center gap-2 text-sm"><input type="checkbox" checked={clientIds===null||clientIds.includes(c.id)} onChange={e=>{const ids=clientIds??clients.map(c=>c.id);setClientIds(e.target.checked?[...ids,c.id]:ids.filter(id=>id!==c.id));setSelected('all')}}/><span className="min-w-0 flex-1 break-words">{c.name}</span><span className="text-xs text-text-secondary">{c.records}</span></label>)}</div>
     {clients.length===0&&<p className="text-sm text-text-secondary">Não há clientes com registos neste período.</p>}
    </div>
   </details>
   <label className="text-xs font-semibold">Pagamento<select aria-label="Estado de pagamento" className="control mt-1 w-full px-3 text-sm" value={paidOnly?'paid':'all'} onChange={e=>{setPaidOnly(e.target.value==='paid');setSelected('all')}}><option value="all">Todos os registos</option><option value="paid">Apenas registos pagos</option></select></label>
  </div>
  <p className="mt-3 text-xs text-text-secondary">Honorários em EUR, sem IVA e após descontos. Despesas debitadas ao cliente ficam excluídas. As percentagens aplicam-se a esta consulta.</p>
  {!validRates&&<p role="alert" className="mt-3 rounded-lg bg-danger-soft p-3 text-sm text-danger">As quatro percentagens devem totalizar 100%, entre 0 e 100 e com até duas casas decimais. Complete a alteração para calcular a repartição.</p>}
  {loading?<p role="status" className="mt-5">A calcular a repartição…</p>:error?<div role="alert" className="mt-5 text-danger">{error}<button type="button" className="control ml-3 px-3" onClick={()=>setRefresh(n=>n+1)}>Voltar a tentar</button></div>:!validDates&&dates!==null?<p role="alert" className="mt-5 text-danger">Escolha uma data inicial igual ou anterior à data final.</p>:<>
   <div className="mt-5 grid gap-3 sm:grid-cols-3" aria-label="Pendências da LEGALTEAM">
    {([['client','Clientes sem angariador'],['task','Registos sem angariador da tarefa'],['executor','Registos sem responsável de execução']] as const).map(([key,label])=><button key={key} type="button" aria-pressed={attention===key} onClick={()=>{setAttention(attention===key?null:key);setSelected('all')}} className={`flex min-h-20 min-w-0 items-center justify-between gap-3 rounded-lg border p-3 text-left ${attention===key?'border-danger bg-danger-soft':'border-border bg-surface-subtle'}`}><span className="text-sm font-semibold">{label}{key==='client'&&<span className="mt-1 block text-xs font-normal text-text-secondary">{missingClients.length} {missingClients.length===1?"cliente":"clientes"}</span>}</span><span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${gaps[key].length?'bg-danger-soft text-danger':'bg-secondary-soft text-text-primary'}`}>{gaps[key].length} {gaps[key].length===1?"registo":"registos"}</span></button>)}
   </div>
   <p className="mt-2 text-xs text-text-secondary">Pendências do período, clientes e pagamento seleccionados, incluindo registos sem preço. Clique novamente no filtro para o retirar.</p>
   {map&&<>
    <div className="mt-5 grid gap-3 sm:grid-cols-2">
     <button type="button" aria-pressed={selected==='all'&&!attention} onClick={()=>choosePerson('all')} className={cardClass(selected==='all'&&!attention)}><span className="text-sm font-semibold">Total do período</span><strong className="financial-value metric-card-value text-2xl">{euros(map.total)}</strong><span className="text-xs text-text-secondary">{hours(scope.reduce((n,r)=>n+r.duration_minutes,0))} · {scope.length} registos · {selectedClients.length} {selectedClients.length===1?"cliente":"clientes"}</span><AllocationChart label="Repartição total" segments={[{label:"Clientes",value:map.rows.reduce((n,r)=>n+r.clientShare,0),color:allocationColors.client},{label:"Tarefas",value:map.rows.reduce((n,r)=>n+r.taskShare,0),color:allocationColors.task},{label:"Execução",value:map.rows.reduce((n,r)=>n+r.executionShare,0),color:allocationColors.execution},{label:"Escritório",value:map.office,color:allocationColors.office}]}/></button>
     <button type="button" aria-pressed={selected==='office'} onClick={()=>choosePerson('office')} className={cardClass(selected==='office')}><span className="text-sm font-semibold">Despesas do escritório · {percentage('office')}</span><strong className="financial-value metric-card-value text-2xl">{euros(map.office)}</strong><span className="text-xs text-text-secondary">Parcela reservada ao escritório</span><AllocationChart label="Parcela do escritório" segments={[{label:"Escritório",value:map.office,color:allocationColors.office},{label:"Restantes parcelas",value:map.total-map.office,color:allocationColors.execution}]}/></button>
    </div>
    <h3 className="mt-5 text-sm font-semibold">Distribuição por pessoa</h3>
    <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
     {map.people.map(person=><button type="button" key={person.id} aria-pressed={selected===person.id} onClick={()=>choosePerson(person.id)} className={cardClass(selected===person.id)}><span className="text-sm font-semibold">{person.name}</span><strong className="financial-value metric-card-value text-2xl">{euros(person.total)}</strong><span className="text-xs text-text-secondary">{hours(person.minutes)} de execução</span><AllocationChart label={`Composição de ${person.name}`} segments={[{label:"Clientes",value:person.client,color:allocationColors.client},{label:"Tarefas",value:person.task,color:allocationColors.task},{label:"Execução",value:person.execution,color:allocationColors.execution}]}/><span className="mt-2 grid gap-2 border-t border-border pt-3 text-xs">{([['Angariação de clientes',person.client],['Angariação de tarefas',person.task],['Execução',person.execution]] as const).map(([label,value])=><span key={label} className="flex justify-between gap-2"><span>{label}</span><span className="financial-value font-semibold">{euros(value)}</span></span>)}</span></button>)}
    </div>
    {map.unassigned>0&&<p className="mt-3 text-sm text-danger">Parcelas por atribuir: <strong className="financial-value">{euros(map.unassigned)}</strong>. Consulte os filtros de pendências.</p>}
    {map.missingPrice>0&&<p role="status" className="mt-3 text-sm text-danger">{map.missingPrice} registo(s) sem valor válido: repartição por apurar.</p>}
    {map.retainerMinutes>0&&<p className="mt-3 text-sm text-text-secondary">{hours(map.retainerMinutes)} em avenças: incluídas nas horas, sem valor individual a repartir.</p>}
   </>}
   {scope.length===0&&<p role="status" className="mt-4 text-sm">Não há registos para a selecção actual.</p>}
   <p className="mt-4 text-xs text-text-secondary">Os cartões permitem consultar os registos de cada pessoa. As parcelas acumulam-se quando alguém exerce várias funções.</p>
   <div className="mt-4">{attention==='client'?<StandardDataTable key="clients" id="legalteam-missing-client-referrer" label="Clientes sem angariador" rows={missingClients} columns={clientColumns} rowKey={c=>c.id}/>:<StandardDataTable key="work" id="legalteam-allocation" label="Registos da repartição" rows={filtered} columns={columns} rowKey={r=>r.id} onRowDoubleClick={r=>setEditing(r.id)}/>}</div>
  </>}
  {editing&&<EditWorkEntryModal entryId={editing} canDelete={false} requiresReason={false} onClose={()=>setEditing(null)} onSaved={()=>{setEditing(null);setRefresh(n=>n+1)}}/>}
 </section>
}
