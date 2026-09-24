import {useState} from 'react'
import {documentColumnLabels,type DocumentColumn} from './documentContent'

const allColumns=Object.keys(documentColumnLabels) as DocumentColumn[]

export function DocumentContentLayout({columns,onColumnsChange,showTimeTotal,onShowTimeTotal,showAmountTotal,onShowAmountTotal}:{columns:DocumentColumn[];onColumnsChange:(columns:DocumentColumn[])=>void;showTimeTotal:boolean;onShowTimeTotal:(value:boolean)=>void;showAmountTotal:boolean;onShowAmountTotal:(value:boolean)=>void}){
  const [dragged,setDragged]=useState<DocumentColumn|null>(null)
  const available=allColumns.filter(column=>!columns.includes(column))
  function place(column:DocumentColumn,target:number){
    const source=columns.indexOf(column)
    if(source<0||target<0||target>=columns.length||source===target)return
    const next=[...columns]
    next.splice(source,1)
    next.splice(target,0,column)
    onColumnsChange(next)
  }
  function remove(column:DocumentColumn){onColumnsChange(columns.filter(value=>value!==column))}

  return <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
    <div className="space-y-4">
      <fieldset>
        <legend className="text-sm font-semibold">Colunas incluídas e ordem final</legend>
        <p className="mt-1 text-xs text-text-secondary">A sequência abaixo é exactamente a ordem da esquerda para a direita no documento. Arraste uma coluna ou escolha directamente a sua posição.</p>
        <ol className="mt-3 space-y-2" aria-label="Ordem das colunas no documento">
          {columns.map((column,index)=><li key={column} draggable onDragStart={()=>setDragged(column)} onDragEnd={()=>setDragged(null)} onDragOver={event=>event.preventDefault()} onDrop={event=>{event.preventDefault();if(dragged)place(dragged,index);setDragged(null)}} className={`grid min-h-12 items-center gap-2 rounded-lg border bg-surface px-3 py-2 sm:grid-cols-[auto_auto_minmax(0,1fr)_auto_auto] ${dragged===column?'border-primary opacity-60':'border-border'}`}>
            <span aria-hidden="true" title="Arrastar para mudar a ordem" className="cursor-grab select-none text-lg text-text-secondary">⠿</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary font-semibold text-surface">{index+1}</span>
            <strong className="text-sm">{documentColumnLabels[column]}</strong>
            <label className="flex items-center gap-2 text-xs font-semibold">Posição<select aria-label={`Posição de ${documentColumnLabels[column]}`} value={index} onChange={event=>place(column,Number(event.target.value))} className="control min-h-9 px-2">{columns.map((_,position)=><option key={position} value={position}>{position+1}</option>)}</select></label>
            <button type="button" onClick={()=>remove(column)} className="min-h-9 rounded-lg border border-danger/40 px-3 text-xs font-semibold text-danger">Retirar</button>
          </li>)}
        </ol>
        {columns.length===0&&<p className="mt-3 rounded-lg border border-warning/40 bg-warning-soft p-3 text-sm text-warning-strong">Adicione pelo menos uma coluna ao documento.</p>}
        {available.length>0&&<div className="mt-3 flex flex-wrap items-center gap-2"><span className="text-xs font-semibold text-text-secondary">Adicionar coluna:</span>{available.map(column=><button key={column} type="button" onClick={()=>onColumnsChange([...columns,column])} className="min-h-9 rounded-lg border border-primary/40 bg-surface px-3 text-xs font-semibold text-primary">+ {documentColumnLabels[column]}</button>)}</div>}
      </fieldset>

      <fieldset>
        <legend className="text-sm font-semibold">Totais no fim da tabela</legend>
        <p className="mt-1 text-xs text-text-secondary">O visto indica que esse resumo será apresentado no rodapé do documento.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <label className={`flex min-h-16 cursor-pointer items-start gap-3 rounded-lg border p-3 ${showTimeTotal?'border-primary bg-primary/5':'border-border bg-surface'}`}><input type="checkbox" aria-label="Total de tempo" checked={showTimeTotal} onChange={event=>onShowTimeTotal(event.target.checked)} className="mt-1"/><span><strong className="block text-sm">Total de tempo</strong><span className="mt-1 block text-xs text-text-secondary">{showTimeTotal?'Incluído: soma das durações no rodapé.':'Não incluído no documento.'}</span></span></label>
          <label className={`flex min-h-16 cursor-pointer items-start gap-3 rounded-lg border p-3 ${showAmountTotal?'border-primary bg-primary/5':'border-border bg-surface'}`}><input type="checkbox" aria-label="Total monetário" checked={showAmountTotal} onChange={event=>onShowAmountTotal(event.target.checked)} className="mt-1"/><span><strong className="block text-sm">Total monetário</strong><span className="mt-1 block text-xs text-text-secondary">{showAmountTotal?'Incluído: soma dos honorários no rodapé.':'Não incluído no documento.'}</span></span></label>
        </div>
      </fieldset>
    </div>

    <aside aria-label="Pré-visualização do resultado" className="rounded-xl border border-primary/30 bg-surface p-3 shadow-sm">
      <div className="flex items-center justify-between gap-2"><strong className="text-sm">Miniatura do documento</strong><span className="rounded-full bg-success-soft px-2 py-1 text-[.65rem] font-semibold text-success">Actualização imediata</span></div>
      <div className="mx-auto mt-3 aspect-[210/297] w-full max-w-[18rem] overflow-hidden rounded border border-border bg-white p-4 text-slate-800 shadow-inner">
        <div className="h-3 w-2/3 rounded bg-slate-800"/><div className="mt-2 h-1.5 w-1/2 rounded bg-slate-300"/>
        <div className="mt-6 overflow-hidden rounded border border-slate-300">
          {columns.length>0?<><div className="grid bg-slate-100" style={{gridTemplateColumns:`repeat(${columns.length}, minmax(0, 1fr))`}}>{columns.map(column=><div key={column} className="border-r border-slate-300 px-1 py-2 text-center text-[.55rem] font-bold last:border-r-0">{documentColumnLabels[column]}</div>)}</div>{[0,1,2].map(row=><div key={row} className="grid border-t border-slate-200" style={{gridTemplateColumns:`repeat(${columns.length}, minmax(0, 1fr))`}}>{columns.map(column=><div key={column} className="border-r border-slate-200 px-1 py-2 last:border-r-0"><span className={`block h-1 rounded bg-slate-200 ${column==='description'?'w-full':'mx-auto w-2/3'}`}/></div>)}</div>)}</>:<div className="p-4 text-center text-[.6rem] text-slate-500">Sem colunas seleccionadas</div>}
          {(showTimeTotal||showAmountTotal)&&<div className="border-t border-slate-300 bg-slate-50 px-2 py-2 text-right text-[.55rem] font-bold">{[showTimeTotal?'Tempo total: 0:00:00':'',showAmountTotal?'Valor total: 0,00 €':''].filter(Boolean).join(' · ')}</div>}
        </div>
        <div className="mt-5 h-1.5 w-full rounded bg-slate-200"/><div className="mt-2 h-1.5 w-4/5 rounded bg-slate-200"/><div className="mt-2 h-1.5 w-2/3 rounded bg-slate-200"/>
      </div>
      <p className="mt-2 text-center text-xs text-text-secondary">A miniatura reflecte a selecção, a ordem e os totais.</p>
    </aside>
  </div>
}
