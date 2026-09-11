import { lazy, Suspense, useCallback, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { WorkResultsContext } from './WorkResultsContext'

const WorkEntriesPage=lazy(()=>import('./WorkEntriesPage').then(module=>({default:module.WorkEntriesPage})))
type Selection={href:string;label:string;source:HTMLElement;request:number}

export function WorkResultsProvider({children,enabled,contextKey}:{children:ReactNode;enabled:boolean;contextKey:string}){
 const [selection,setSelection]=useState<Selection|null>(null),target=useRef<HTMLElement>(null)
 const close=useCallback(()=>setSelection(null),[])
 const open=useCallback((href:string,label:string,source:HTMLElement)=>setSelection(previous=>({href,label,source,request:(previous?.request??0)+1})),[])
 const context=useMemo(()=>enabled?{open,close}:null,[enabled,open,close])
 useLayoutEffect(()=>{close()},[contextKey,close])
 useLayoutEffect(()=>{
  if(!selection||!target.current)return
  const element=target.current,header=document.querySelector('.app-shell-header')
  element.style.scrollMarginTop=`${(header?.getBoundingClientRect().height??0)+16}px`
  element.focus({preventScroll:true});element.scrollIntoView({block:'start',behavior:'instant'})
 },[selection])
 function returnToCard(){
  const source=selection?.source
  close()
  if(source?.isConnected){source.focus({preventScroll:true});source.scrollIntoView({block:'center',behavior:'instant'})}
 }
 return <WorkResultsContext.Provider value={context}>{children}{enabled&&selection&&<section ref={target} tabIndex={-1} aria-label="Resultados do acompanhamento" className="mt-6 min-w-0 space-y-4 rounded-lg focus:outline-none">
  <div className="card flex flex-wrap items-center justify-between gap-3 p-4"><h2 className="font-display text-xl font-semibold">{selection.label}</h2><button type="button" className="control min-h-11 px-4" onClick={returnToCard}>Fechar resultados</button></div>
  <Suspense fallback={<p role="status" className="card p-5">A carregar os movimentos deste pré-filtro…</p>}><WorkEntriesPage key={`${selection.href}-${selection.request}`} embeddedQuery={new URL(selection.href,window.location.href).search} canDelete={false} onEntrySaved={()=>window.dispatchEvent(new Event('entity-record-saved'))}/></Suspense>
 </section>}</WorkResultsContext.Provider>
}
