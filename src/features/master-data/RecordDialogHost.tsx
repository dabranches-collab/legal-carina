import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const MasterDataPage=lazy(()=>import('./MasterDataPage').then(module=>({default:module.MasterDataPage})))
type RecordTarget={section:'clients'|'billing_entities'|'professionals';id:string;clientPage?:'fixedFees'}

function targetFromLocation():RecordTarget|null{
 const params=new URLSearchParams(window.location.search),section=params.get('recordSection'),id=params.get('record')
 if(!id||!section||!['clients','billing_entities','professionals'].includes(section))return null
 return {section:section as RecordTarget['section'],id,clientPage:params.get('recordPage')==='fixedFees'?'fixedFees':undefined}
}

function writeTarget(target:RecordTarget|null){
 const url=new URL(window.location.href)
 if(target){url.searchParams.set('record',target.id);url.searchParams.set('recordSection',target.section);if(target.clientPage)url.searchParams.set('recordPage',target.clientPage);else url.searchParams.delete('recordPage')}
 else{url.searchParams.delete('record');url.searchParams.delete('recordSection');url.searchParams.delete('recordPage')}
 window.history.replaceState(window.history.state,'',url)
}

function RecordOverlay({target,onClose}:{target:RecordTarget;onClose:()=>void}){
 const saved=useRef(false)
 useEffect(()=>{
  const focus=document.activeElement instanceof HTMLElement?document.activeElement:null
  const x=window.scrollX,y=window.scrollY,overflow=document.body.style.overflow
  document.body.style.overflow='hidden'
  return()=>{
   document.body.style.overflow=overflow
   focus?.focus({preventScroll:true})
   window.scrollTo(x,y)
   if(saved.current)window.dispatchEvent(new Event('entity-record-saved'))
  }
 },[])
 useEffect(()=>{
  const escape=(event:KeyboardEvent)=>{
   const top=[...document.querySelectorAll('[role="dialog"][aria-modal="true"]')].at(-1)
   if(event.key==='Escape'&&!event.defaultPrevented&&top?.closest('[data-record-overlay]')){
    const close=top.querySelector<HTMLButtonElement>('[data-close-record]')
    if(close&&!close.disabled){event.preventDefault();close.click()}
   }
  }
  document.addEventListener('keydown',escape)
  return()=>document.removeEventListener('keydown',escape)
 },[])
 return createPortal(<div data-record-overlay><Suspense fallback={<div className="app-safe-fixed fixed z-[75] grid place-items-center bg-navigation/55"><div className="card p-6"><p role="status">A abrir ficha…</p><button type="button" onClick={onClose} className="control mt-3 px-3">Fechar</button></div></div>}><MasterDataPage key={`${target.section}-${target.id}-${target.clientPage??''}`} initialSection={target.section} initialClientPage={target.clientPage} focusedRecordId={target.id} onDismiss={onClose} onRecordSaved={()=>{saved.current=true}}/></Suspense></div>,document.body)
}

export function RecordDialogHost(){
 const [target,setTarget]=useState<RecordTarget|null>(()=>targetFromLocation())
 useEffect(()=>{
  const open=(event:Event)=>{
   const next=(event as CustomEvent<RecordTarget>).detail
   if(next&&['clients','billing_entities','professionals'].includes(next.section)&&typeof next.id==='string'&&next.id){writeTarget(next);setTarget(next)}
  }
  const navigate=()=>setTarget(targetFromLocation())
  window.addEventListener('open-entity-record',open)
  window.addEventListener('popstate',navigate)
  return()=>{window.removeEventListener('open-entity-record',open);window.removeEventListener('popstate',navigate)}
 },[])
 return target?<RecordOverlay target={target} onClose={()=>{writeTarget(null);setTarget(null)}}/>:null
}
