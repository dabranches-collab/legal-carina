type Props={value:number;onChange:(minutes:number)=>void;compact?:boolean}
const range=(length:number)=>Array.from({length},(_,index)=>index)
export function DurationSelect({value,onChange,compact=false}:Props){
 const safe=Math.max(0,Math.round(value||0)),days=Math.floor(safe/1440),hours=Math.floor((safe%1440)/60),minutes=safe%60
 const update=(d:number,h:number,m:number)=>onChange(d*1440+h*60+m)
 const control=compact?'control h-8 min-w-14 px-1 text-xs':'control mt-1 w-full px-3'
 return <div className={`grid grid-cols-3 ${compact?'gap-1':'gap-2'}`}>
  <label className="text-xs text-text-secondary">{!compact&&'Dias'}<select aria-label="Dias" value={days} onChange={e=>update(Number(e.target.value),hours,minutes)} className={control}>{range(366).map(v=><option key={v} value={v}>{v}{compact?' d':''}</option>)}</select></label>
  <label className="text-xs text-text-secondary">{!compact&&'Horas'}<select aria-label="Horas" value={hours} onChange={e=>update(days,Number(e.target.value),minutes)} className={control}>{range(24).map(v=><option key={v} value={v}>{v}{compact?' h':''}</option>)}</select></label>
  <label className="text-xs text-text-secondary">{!compact&&'Minutos'}<select aria-label="Minutos" value={minutes} onChange={e=>update(days,hours,Number(e.target.value))} className={control}>{range(60).map(v=><option key={v} value={v}>{v}{compact?' min':''}</option>)}</select></label>
 </div>
}
