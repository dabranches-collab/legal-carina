export type AllocationSegment={label:string;value:number;color:string}
export function AllocationChart({label,segments}:{label:string;segments:AllocationSegment[]}){
 const total=segments.reduce((sum,segment)=>sum+Math.max(0,segment.value),0)
 let offset=0
 return <span className="mt-2 block w-full" role="img" aria-label={`${label}: ${total?segments.filter(s=>s.value>0).map(s=>`${s.label} ${(s.value/total*100).toLocaleString('pt-PT',{maximumFractionDigits:1})}%`).join(', '):'sem valor a repartir'}`}>
  <svg aria-hidden="true" viewBox="0 0 100 8" preserveAspectRatio="none" className="block h-3 w-full overflow-hidden rounded-full"><rect width="100" height="8" fill="var(--color-border)"/>{segments.filter(s=>s.value>0).map(segment=>{const width=total?segment.value/total*100:0,x=offset;offset+=width;return <rect key={segment.label} x={x} width={width} height="8" fill={segment.color}/>})}</svg>
  <span aria-hidden="true" className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-text-secondary">{segments.filter(s=>s.value>0).map(s=><span key={s.label} className="inline-flex items-center gap-1"><span className="inline-block size-2 rounded-full" style={{backgroundColor:s.color}}/>{s.label} {total?(s.value/total*100).toLocaleString('pt-PT',{maximumFractionDigits:1}):0}%</span>)}</span>
 </span>
}
