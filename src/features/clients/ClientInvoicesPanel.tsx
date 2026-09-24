import {useRef,useState,type DragEvent} from 'react'
import {readInvoiceFile,type InvoiceReading} from './invoiceReading'

type AllocationKind='provision'|'fixed_fee'|'honorarium_note'|'retainer'|'work_entries'|'other'
type Allocation={id:string;kind:AllocationKind;amount:string}
type QueueItem={id:string;file:File;status:'reading'|'ready'|'error';reading?:InvoiceReading;error?:string;allocations:Allocation[];invoiceNumber:string;invoiceDate:string;paid:boolean;paymentDate:string}

const allocationOptions:[AllocationKind,string,string][]=[
  ['provision','Provisão','Pagamento ou reforço de provisão para honorários.'],
  ['fixed_fee','Trabalho a preço fixo','Factura referente a um ou mais trabalhos com preço acordado.'],
  ['honorarium_note','Nota de Honorários','Liquidação de uma nota e dos registos nela incluídos.'],
  ['retainer','Avença','Uma ou várias prestações de avença.'],
  ['work_entries','Registos de trabalho','Registos facturados directamente, sem nota associada.'],
  ['other','Outro','Valor que necessita de classificação manual.'],
]
const kindLabel=(kind:AllocationKind)=>allocationOptions.find(([value])=>value===kind)?.[1]??kind
const makeId=()=>`${Date.now()}-${Math.random().toString(36).slice(2)}`
const blankAllocation=():Allocation=>({id:makeId(),kind:'honorarium_note',amount:''})

export function ClientInvoicesPanel({readOnly=false}:{firmId:string;clientId:string;readOnly?:boolean}){
  const inputRef=useRef<HTMLInputElement>(null)
  const [queue,setQueue]=useState<QueueItem[]>([]),[dragging,setDragging]=useState(false)

  async function enqueue(files:File[]){
    const next=files.map(file=>({id:makeId(),file,status:'reading' as const,allocations:[blankAllocation()],invoiceNumber:'',invoiceDate:'',paid:false,paymentDate:''}))
    setQueue(current=>[...next,...current])
    await Promise.all(next.map(async item=>{
      try{
        const reading=await readInvoiceFile(item.file)
        setQueue(current=>current.map(entry=>entry.id===item.id?{...entry,status:'ready',reading}:entry))
      }catch(cause){
        setQueue(current=>current.map(entry=>entry.id===item.id?{...entry,status:'error',error:cause instanceof Error?cause.message:'Não foi possível ler a factura.'}:entry))
      }
    }))
  }
  function drop(event:DragEvent<HTMLDivElement>){event.preventDefault();setDragging(false);if(!readOnly)void enqueue(Array.from(event.dataTransfer.files))}
  function updateAllocation(itemId:string,allocationId:string,change:Partial<Allocation>){setQueue(current=>current.map(item=>item.id===itemId?{...item,allocations:item.allocations.map(allocation=>allocation.id===allocationId?{...allocation,...change}:allocation)}:item))}
  function removeAllocation(itemId:string,allocationId:string){setQueue(current=>current.map(item=>item.id===itemId?{...item,allocations:item.allocations.filter(allocation=>allocation.id!==allocationId)}:item))}
  function addAllocation(itemId:string){setQueue(current=>current.map(item=>item.id===itemId?{...item,allocations:[...item.allocations,blankAllocation()]}:item))}
  function updateItem(itemId:string,change:Partial<Pick<QueueItem,'invoiceNumber'|'invoiceDate'|'paid'|'paymentDate'>>){setQueue(current=>current.map(item=>item.id===itemId?{...item,...change}:item))}

  return <section className="mt-6 border-t border-border pt-5" aria-labelledby="client-invoices-title">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 id="client-invoices-title" className="font-display text-xl font-semibold">Facturas do cliente</h3><p className="mt-1 max-w-3xl text-sm text-text-secondary">Arraste a factura para a plataforma. A leitura prepara os dados e as possíveis afectações; o operador confirma tudo antes de guardar.</p></div><span className="rounded-full border border-warning/45 bg-warning-soft px-3 py-1 text-xs font-semibold text-warning-strong">Preparação local</span></div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Tipos de afectação disponíveis">{allocationOptions.slice(0,5).map(([value,label,description])=><article key={value} className="rounded-lg border border-border bg-surface-subtle p-3"><strong className="text-sm">{label}</strong><p className="mt-1 text-xs text-text-secondary">{description}</p></article>)}</div>
    {!readOnly&&<div onDragEnter={event=>{event.preventDefault();setDragging(true)}} onDragOver={event=>event.preventDefault()} onDragLeave={event=>{if(event.currentTarget===event.target)setDragging(false)}} onDrop={drop} className={`mt-5 rounded-xl border-2 border-dashed p-6 text-center transition-colors ${dragging?'border-primary bg-primary/10':'border-border bg-surface-subtle'}`}>
      <input ref={inputRef} type="file" multiple accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png" className="sr-only" aria-label="Escolher facturas" onChange={event=>{void enqueue(Array.from(event.target.files??[]));event.currentTarget.value=''}}/>
      <p className="font-semibold">Arraste as facturas para esta caixa</p><p className="mt-1 text-sm text-text-secondary">PDF, JPG ou PNG · máximo 20 MB por ficheiro</p><button type="button" onClick={()=>inputRef.current?.click()} className="mt-3 min-h-11 rounded-lg bg-primary px-4 font-semibold text-surface">Escolher facturas</button>
    </div>}
    {queue.length===0?<div className="mt-5 rounded-xl border border-border bg-surface p-5 text-sm text-text-secondary">Ainda não foi adicionada nenhuma factura nesta preparação.</div>:<div className="mt-5 space-y-4" aria-label="Facturas em preparação">{queue.map(item=><article key={item.id} className="rounded-xl border border-border bg-surface p-4 shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h4 className="break-all font-semibold">{item.file.name}</h4><p className="text-xs text-text-secondary">{(item.file.size/1024/1024).toLocaleString('pt-PT',{maximumFractionDigits:2})} MB</p></div><div className="flex items-center gap-2"><span role="status" className={`rounded-full px-3 py-1 text-xs font-semibold ${item.status==='ready'?'bg-success-soft text-success':item.status==='error'?'bg-danger-soft text-danger':'bg-warning-soft text-warning-strong'}`}>{item.status==='ready'?'Leitura inicial concluída':item.status==='error'?'Leitura falhou':'A ler factura…'}</span>{!readOnly&&<button type="button" onClick={()=>setQueue(current=>current.filter(entry=>entry.id!==item.id))} className="min-h-9 rounded-lg border border-danger/40 px-3 text-xs font-semibold text-danger">Retirar</button>}</div></header>
      {item.error&&<p role="alert" className="mt-3 rounded-lg bg-danger-soft p-3 text-sm text-danger">{item.error}</p>}
      {item.status==='ready'&&<fieldset disabled={readOnly} className="mt-3 rounded-lg border border-border bg-surface-subtle p-3"><legend className="px-1 text-sm font-semibold">Dados da factura a confirmar</legend><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><label className="text-xs font-semibold">Número da factura<input aria-label="Número da factura" value={item.invoiceNumber} onChange={event=>updateItem(item.id,{invoiceNumber:event.target.value})} className="control mt-1 w-full px-2" placeholder="Será proposto pela leitura"/></label><label className="text-xs font-semibold">Data da factura<input aria-label="Data da factura" type="date" value={item.invoiceDate} onChange={event=>updateItem(item.id,{invoiceDate:event.target.value})} className="control mt-1 w-full px-2"/></label><label className="flex min-h-11 items-center gap-2 self-end rounded-lg border border-border bg-surface px-3 text-sm font-semibold"><input type="checkbox" aria-label="Factura paga" checked={item.paid} onChange={event=>updateItem(item.id,{paid:event.target.checked,paymentDate:event.target.checked?item.paymentDate:''})}/>Factura paga</label><label className="text-xs font-semibold">Data do pagamento<input aria-label="Data do pagamento" type="date" disabled={!item.paid||readOnly} value={item.paymentDate} onChange={event=>updateItem(item.id,{paymentDate:event.target.value})} className="control mt-1 w-full px-2 disabled:opacity-50"/></label></div><p className="mt-3 rounded-lg border border-primary/25 bg-primary/5 p-2 text-xs text-text-secondary">Ao confirmar, todos os elementos escolhidos passam a <strong>Facturados</strong>. Se assinalar «Factura paga», passam também a <strong>Pagos</strong>. Avenças e trabalhos a preço fixo actualizam o estado próprio, sem duplicar os valores dos registos internos.</p></fieldset>}
      {item.reading&&<div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)]"><div className="rounded-lg border border-border bg-surface-subtle p-3"><strong className="text-sm">Resultado da leitura</strong><p className="mt-1 text-xs text-text-secondary">{item.reading.pageCount} {item.reading.pageCount===1?'página':'páginas'} · {item.reading.needsVisualRecognition?'Sem texto seleccionável; necessita de reconhecimento visual.':'Texto disponível para interpretação dos campos.'}</p>{item.reading.text&&<details className="mt-3"><summary className="cursor-pointer text-xs font-semibold text-primary">Ver texto reconhecido</summary><pre className="mt-2 max-h-44 overflow-auto whitespace-pre-wrap break-words rounded bg-surface p-2 text-xs">{item.reading.text.slice(0,8000)}</pre></details>}</div>
        <div className="rounded-lg border border-border bg-surface-subtle p-3"><div className="flex items-center justify-between gap-2"><strong className="text-sm">Afectações da factura</strong>{!readOnly&&<button type="button" onClick={()=>addAllocation(item.id)} className="min-h-9 rounded-lg border border-primary/40 px-3 text-xs font-semibold text-primary">Adicionar afectação</button>}</div><p className="mt-1 text-xs text-text-secondary">Pode repartir a mesma factura por vários elementos. A soma será validada quando estiverem definidos os campos da leitura.</p><div className="mt-3 space-y-2">{item.allocations.map(allocation=><div key={allocation.id} className="grid gap-2 rounded-lg border border-border bg-surface p-2 sm:grid-cols-[minmax(0,1fr)_8rem_auto]"><label className="text-xs font-semibold">Tipo<select aria-label="Tipo de afectação" disabled={readOnly} value={allocation.kind} onChange={event=>updateAllocation(item.id,allocation.id,{kind:event.target.value as AllocationKind})} className="control mt-1 w-full px-2">{allocationOptions.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><label className="text-xs font-semibold">Montante<input aria-label={`Montante de ${kindLabel(allocation.kind)}`} disabled={readOnly} type="number" min="0" step="0.01" inputMode="decimal" value={allocation.amount} onChange={event=>updateAllocation(item.id,allocation.id,{amount:event.target.value})} className="control mt-1 w-full px-2 text-right" placeholder="0,00"/></label>{!readOnly&&<button type="button" disabled={item.allocations.length===1} onClick={()=>removeAllocation(item.id,allocation.id)} className="self-end min-h-10 rounded-lg border border-danger/40 px-3 text-xs font-semibold text-danger disabled:opacity-30">Remover</button>}</div>)}</div></div>
      </div>}
      <footer className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3"><p className="text-xs text-text-secondary">Nenhum dado é guardado enquanto a grelha final de interpretação não estiver definida.</p><button type="button" disabled className="min-h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-surface opacity-40">Confirmar e guardar</button></footer>
    </article>)}</div>}
  </section>
}
