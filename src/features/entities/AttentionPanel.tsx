import type { AttentionCounts } from './attentionCounts'
import { AppLink } from '../../components/ui/AppLink'

export function AttentionPanel({counts,links,twoColumns=false}:{counts:AttentionCounts;links:{uninvoiced:string;unpaid:string;missingPrice:string};twoColumns?:boolean}){
 const items=([['Por facturar',counts.uninvoiced,links.uninvoiced],['Facturados não pagos',counts.unpaid,links.unpaid],['Movimentos sem preço',counts.missingPrice,links.missingPrice]] as const)
 const columns=twoColumns?'grid-cols-2':'grid-cols-3'
 return <div className={`mt-4 grid ${columns} gap-2`}>{items.map(([label,count,href])=>{const clear=count===0;return <div key={label} className="flex min-w-0 flex-col"><div className={`rounded-t-lg border border-b-0 p-2 text-center ${clear?'border-success/40 bg-success-soft text-success':'border-danger/40 bg-danger-soft text-danger'}`}><p className="flex min-h-8 items-center justify-center whitespace-normal text-center text-[0.65rem] font-medium leading-4" title={label}>{label}</p><p className="mt-1 text-xl font-bold tabular-nums">{count.toLocaleString('pt-PT')}</p></div><AppLink href={href} className={`flex min-h-9 items-center justify-center rounded-b-lg px-2 text-center text-xs font-semibold leading-4 text-white hover:brightness-110 ${clear?'bg-success':'bg-danger'}`}>Abrir tabela →</AppLink></div>})}</div>
}
