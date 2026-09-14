import {useEffect,useRef,useState} from 'react'
import {displayDateToIso,formatDate,maskDisplayDate} from '../utils/date'

type Props={value:string;onChange:(value:string)=>void;required?:boolean;disabled?:boolean;ariaLabel?:string;className?:string;min?:string;max?:string}

export function CalendarDateInput({value,onChange,required=false,disabled=false,ariaLabel,className='',min,max}:Props){
 const inputRef=useRef<HTMLInputElement>(null)
 const [display,setDisplay]=useState(()=>formatDate(value,''))
 useEffect(()=>setDisplay(formatDate(value,'')),[value])
 const openCalendar=()=>{try{inputRef.current?.showPicker()}catch{/* O clique mantém o selector nativo disponível. */}}
 return <span className="flex min-w-0 items-center gap-1">
  <input required={required} disabled={disabled} aria-label={ariaLabel} type="text" inputMode="numeric" autoComplete="off" placeholder="DD-MM-AAAA" pattern="[0-9]{2}-[0-9]{2}-[0-9]{4}" value={display} onChange={event=>{const raw=event.target.value,enteredIso=/^\d{4}-\d{2}-\d{2}$/.test(raw)?raw:null,next=enteredIso?formatDate(enteredIso,''):maskDisplayDate(raw);setDisplay(next);if(!next)onChange('');else{const iso=enteredIso??displayDateToIso(next);if(iso&&(!min||iso>=min)&&(!max||iso<=max))onChange(iso)}}} onBlur={()=>setDisplay(formatDate(value,''))} className={`control min-w-0 flex-1 ${className}`}/>
  <input ref={inputRef} aria-hidden="true" tabIndex={-1} type="date" min={min} max={max} value={value} disabled={disabled} onChange={event=>onChange(event.target.value)} className="sr-only"/>
  <button type="button" disabled={disabled} onClick={openCalendar} className="min-h-9 rounded-md border border-border px-2 text-xs font-semibold text-text-secondary disabled:opacity-35" title={ariaLabel?`Abrir calendário — ${ariaLabel}`:'Abrir calendário'} aria-label="Abrir calendário">📅</button>
  {!required&&<button type="button" disabled={disabled||!value} onClick={()=>onChange('')} className="min-h-9 rounded-md border border-border px-2 text-xs font-semibold text-text-secondary disabled:opacity-35" title="Limpar a data">Limpar</button>}
 </span>
}
