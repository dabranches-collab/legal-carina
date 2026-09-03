import { EditWorkEntryModal } from '../work-entries/EditWorkEntryModal'
import { useEffect, useMemo, useState } from 'react'
import { CalendarDateInput } from '../../components/CalendarDateInput'
import { StandardDataTable, type TableColumn } from '../../components/table/StandardDataTable'
import { supabase } from '../../lib/supabase'
import { professionalName } from '../../lib/professionalNames'
import { allocateHonoraria, type AllocationWork, type AllocationRow } from './allocation'

const euros=(cents:number)=>new Intl.NumberFormat('pt-PT',{style:'currency',currency:'EUR'}).format(cents/100)
const hours=(minutes:number)=>`${Math.floor(minutes/60)} h ${minutes%60} min`
export function LegalteamAllocation({societyId}:{societyId:string}){
 const [editing,setEditing]=useState<string|null>(null)
 const [start,setStart]=useState(()=>`${new Date().getFullYear()}-01-01`),[end,setEnd]=useState(()=>new Date().toLocaleDateString('sv-SE'))
 const [paidOnly,setPaidOnly]=useState(false),[work,setWork]=useState<AllocationWork[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[selected,setSelected]=useState('all'),[refresh,setRefresh]=useState(0)
 useEffect(()=>{let active=true;setLoading(true);setError('');setWork([]);setSelected('all');void(async()=>{
  try{
   if(!start||!end||start>end)throw new Error('Escolha uma data inicial igual ou anterior à data final.')
   if(!supabase)throw new Error('Ligação indisponível.')
   const rows:AllocationWork[]=[];let total=0
   do{
    const result=await supabase.rpc('get_legalteam_allocation_work',{p_billing_entity_id:societyId,p_start:start,p_end:end,p_offset:rows.length,p_limit:500})
    if(result.error)throw new Error(result.error.code==='PGRST202'?'O mapa ficará disponível após a actualização da base de dados.':result.error.message)
    const page=result.data as {items:AllocationWork[];total:number};total=page.total
    if(!page.items.length&&rows.length<total)throw new Error('A lista ficou incompleta. Actualize o mapa.')
    rows.push(...page.items)
   }while(rows.length<total)
   if(active)setWork(rows)
  }catch(cause){if(active)setError(cause instanceof Error?cause.message:'Não foi possível carregar o mapa.')}
  finally{if(active)setLoading(false)}
 })();return()=>{active=false}},[societyId,start,end,refresh])
 const map=useMemo(()=>allocateHonoraria(work,paidOnly),[work,paidOnly])
 const filtered=map.rows.filter(row=>selected==='all'||selected==='office'||(selected==='pending'?row.pending:[professionalName(row.professional_name),row.clientRecipient,row.taskRecipient].some(name=>name.toLocaleLowerCase('pt-PT')===selected)))
 const columns:TableColumn<AllocationRow>[]=[
  {id:'date',label:'Data',value:r=>r.work_date,width:115},
  {id:'client',label:'Cliente',value:r=>r.client_name,width:190},
  {id:'activity',label:'Actividade',value:r=>r.activity_description,width:260},
  {id:'responsible',label:'Responsável',value:r=>professionalName(r.professional_name),width:170},
  {id:'hours',label:'Horas',value:r=>r.duration_minutes/60,render:r=>hours(r.duration_minutes),width:110},
  {id:'amount',label:'Honorários sem IVA',value:r=>r.amount/100,render:r=>euros(r.amount),width:155},
  {id:'clientRef',label:'Angariador do cliente',value:r=>r.clientRecipient,width:185},
  {id:'clientShare',label:'Cliente · 10%',value:r=>r.clientShare/100,render:r=>euros(r.clientShare),width:130},
  {id:'taskRef',label:'Angariador da tarefa',value:r=>r.taskRecipient,width:185},
  {id:'taskShare',label:'Tarefa · 10%',value:r=>r.taskShare/100,render:r=>euros(r.taskShare),width:130},
  {id:'execution',label:'Execução · 50%',value:r=>r.executionShare/100,render:r=>euros(r.executionShare),width:140},
  {id:'office',label:'Escritório · 30%',value:r=>r.officeShare/100,render:r=>euros(r.officeShare),width:140},
  {id:'paid',label:'Pagamento',value:r=>r.is_paid?'Pago':'Por pagar',width:115},
 ]
 return <section className="card min-w-0 p-4 sm:p-6" aria-label="Repartição LEGALTEAM">
  <h2 className="font-display text-xl font-semibold">Horas e repartição de honorários</h2>
  <p className="mt-1 text-sm text-text-secondary">Angariação do cliente 10% · Angariação da tarefa 10% · Execução 50% · Escritório 30%</p>
  <div className="mt-4 grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-4">
   <label className="text-sm font-semibold">Data inicial<CalendarDateInput required ariaLabel="Data inicial da repartição" value={start} onChange={setStart} className="mt-1 w-full px-3"/></label>
   <label className="text-sm font-semibold">Data final<CalendarDateInput required ariaLabel="Data final da repartição" value={end} onChange={setEnd} className="mt-1 w-full px-3"/></label>
   <label className="text-sm font-semibold">Registos considerados<select className="control mt-1 w-full px-3" value={paidOnly?'paid':'all'} onChange={e=>setPaidOnly(e.target.value==='paid')}><option value="all">Todos os registos</option><option value="paid">Apenas registos pagos</option></select></label>
   <button type="button" className="control min-h-11 px-4 font-semibold" disabled={loading} onClick={()=>setRefresh(n=>n+1)}>Actualizar repartição</button>
  </div>
  <p className="mt-3 text-xs text-text-secondary">Período pela data do trabalho, incluindo ambos os dias. Valores em EUR, sem IVA e após descontos; despesas debitadas ao cliente não entram na repartição. O mapa é informativo e não lança pagamentos.</p>
  {loading?<p role="status" className="mt-5">A calcular a repartição…</p>:error?<p role="alert" className="mt-5 text-danger">{error}</p>:<>
   <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
    <button type="button" aria-pressed={selected==='all'} onClick={()=>setSelected('all')} className={`rounded-xl border p-4 text-left ${selected==='all'?'border-secondary bg-secondary-soft':'border-border bg-surface-subtle'}`}><span className="text-sm font-semibold">Total do período</span><strong className="financial-value mt-2 block text-2xl">{euros(map.total)}</strong><span className="mt-2 block text-xs">{hours(map.people.reduce((n,p)=>n+p.minutes,0))} · {map.rows.length} registos com valor</span></button>
    {map.people.map(person=><button type="button" key={person.id} aria-pressed={selected===person.id} onClick={()=>setSelected(person.id)} className={`rounded-xl border p-4 text-left ${selected===person.id?'border-secondary bg-secondary-soft':'border-border bg-surface-subtle'}`}><span className="text-sm font-semibold">{person.name}</span><strong className="financial-value mt-2 block text-2xl">{euros(person.total)}</strong><span className="mt-1 block text-xs">{hours(person.minutes)} de trabalho realizado</span><span className="financial-value mt-3 block text-xs leading-6">Clientes: {euros(person.client)}<br/>Tarefas: {euros(person.task)}<br/>Execução: {euros(person.execution)}</span></button>)}
    <button type="button" aria-pressed={selected==='office'} onClick={()=>setSelected('office')} className={`rounded-xl border p-4 text-left ${selected==='office'?'border-secondary bg-secondary-soft':'border-border bg-surface-subtle'}`}><span className="text-sm font-semibold">Despesas do escritório · 30%</span><strong className="financial-value mt-2 block text-2xl">{euros(map.office)}</strong><span className="mt-2 block text-xs">Parcela reservada ao escritório</span></button>
   </div>
   {(map.unassigned>0||map.rows.some(r=>r.pending))&&<button type="button" onClick={()=>setSelected('pending')} className="financial-value mt-4 min-h-11 rounded-lg bg-danger-soft p-3 text-left text-sm text-danger">Angariações por identificar: {euros(map.unassigned)} ainda por atribuir. Ver registos incompletos.</button>}
   {map.missingPrice>0&&<p role="alert" className="mt-3 text-danger">{map.missingPrice} registo(s) sem valor válido: repartição por apurar.</p>}
   {map.retainerMinutes>0&&<p className="mt-3 text-sm text-text-secondary">{hours(map.retainerMinutes)} em avenças: incluídas nas horas, sem valor individual a repartir.</p>}
   <p className="mt-4 text-xs text-text-secondary">Clique num cartão para consultar os registos que contribuem para essa parcela. Quando uma pessoa acumula funções, as parcelas somam-se. Arredondamento por registo ao cêntimo.</p>
   <div className="mt-4"><StandardDataTable id="legalteam-allocation" label="Registos da repartição" rows={filtered} columns={columns} rowKey={r=>r.id} onRowDoubleClick={r=>setEditing(r.id)}/></div>
  </>}
  {editing&&<EditWorkEntryModal entryId={editing} canDelete={false} requiresReason={false} onClose={()=>setEditing(null)} onSaved={()=>{setEditing(null);setRefresh(n=>n+1)}}/>}
 </section>
}
