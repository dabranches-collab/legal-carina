import { useEffect, useRef } from 'react'

export function useModalLifecycle(onClose:()=>void,busy=false){
  const containerRef=useRef<HTMLDivElement>(null)
  const busyRef=useRef(busy)
  const closeRef=useRef(onClose)
  busyRef.current=busy
  closeRef.current=onClose
  useEffect(()=>{
    const previousOverflow=document.body.style.overflow
    const previousFocus=document.activeElement instanceof HTMLElement?document.activeElement:null
    document.body.style.overflow='hidden'
    containerRef.current=[...document.querySelectorAll<HTMLDivElement>('[role="dialog"][aria-modal="true"]')].at(-1)??null
    const focusFrame=requestAnimationFrame(()=>{const container=containerRef.current;if(container&&!container.contains(document.activeElement))container.querySelector<HTMLElement>('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')?.focus()})
    const key=(event:KeyboardEvent)=>{
      if(containerRef.current!==[...document.querySelectorAll('[role="dialog"][aria-modal="true"]')].at(-1))return
      if(event.key==='Escape'&&!busyRef.current){event.preventDefault();closeRef.current();return}
      if(event.key!=='Tab'||!containerRef.current)return
      const focusable=[...containerRef.current.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter(item=>item.offsetParent!==null)
      if(!focusable.length)return
      const first=focusable[0],last=focusable[focusable.length-1]
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
    }
    document.addEventListener('keydown',key)
    return()=>{cancelAnimationFrame(focusFrame);document.body.style.overflow=previousOverflow;document.removeEventListener('keydown',key);previousFocus?.focus()}
  },[])
}
