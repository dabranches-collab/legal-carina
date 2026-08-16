import { useEffect, useRef } from 'react'

export function useModalLifecycle(onClose:()=>void,busy=false){
  const containerRef=useRef<HTMLDivElement>(null)
  const busyRef=useRef(busy)
  busyRef.current=busy
  useEffect(()=>{
    const previousOverflow=document.body.style.overflow
    const previousFocus=document.activeElement instanceof HTMLElement?document.activeElement:null
    document.body.style.overflow='hidden'
    containerRef.current=[...document.querySelectorAll<HTMLDivElement>('[role="dialog"][aria-modal="true"]')].at(-1)??null
    requestAnimationFrame(()=>containerRef.current?.querySelector<HTMLElement>('button,input,select,textarea,[tabindex]:not([tabindex="-1"])')?.focus())
    const key=(event:KeyboardEvent)=>{
      if(event.key==='Escape'&&!busyRef.current){event.preventDefault();onClose();return}
      if(event.key!=='Tab'||!containerRef.current)return
      const focusable=[...containerRef.current.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter(item=>item.offsetParent!==null)
      if(!focusable.length)return
      const first=focusable[0],last=focusable[focusable.length-1]
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
    }
    document.addEventListener('keydown',key)
    return()=>{document.body.style.overflow=previousOverflow;document.removeEventListener('keydown',key);previousFocus?.focus()}
  },[onClose])
}
