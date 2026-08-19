import {useRef} from 'react'

type Props={value:string;onChange:(value:string)=>void;required?:boolean;ariaLabel?:string;className?:string}

export function CalendarDateInput({value,onChange,required=false,ariaLabel,className=''}:Props){
 const inputRef=useRef<HTMLInputElement>(null)
 const openCalendar=()=>{try{inputRef.current?.showPicker()}catch{/* O clique mantém o selector nativo disponível. */}}
 return <span className="flex min-w-0 items-center gap-1">
  <input ref={inputRef} required={required} aria-label={ariaLabel} type="date" value={value} onInput={event=>onChange(event.currentTarget.value)} onChange={event=>onChange(event.target.value)} onClick={openCalendar} onKeyDown={event=>event.preventDefault()} onPaste={event=>event.preventDefault()} className={`control min-w-0 flex-1 ${className}`}/>
  {!required&&<button type="button" disabled={!value} onClick={()=>onChange('')} className="min-h-9 rounded-md border border-border px-2 text-xs font-semibold text-text-secondary disabled:opacity-35" title="Limpar a data">Limpar</button>}
 </span>
}
