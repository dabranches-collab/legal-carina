import type { AttentionCounts } from './attentionCounts'

export function AttentionPanel({counts,links}:{counts:AttentionCounts;links:{uninvoiced:string;unpaid:string;missingPrice:string}}){
 const items=[['Por facturar',counts.uninvoiced,links.uninvoiced],['Facturados não pagos',counts.unpaid,links.unpaid],['Movimentos sem preço',counts.missingPrice,links.missingPrice]] as const
 return <div className="mt-4 grid grid-cols-3 gap-2">{items.map(([label,count,href])=><div key={label} className="flex min-w-0 flex-col"><div className="rounded-t-lg border border-b-0 border-danger/40 bg-danger-soft p-2 text-center text-danger"><p className="flex min-h-8 items-center justify-center whitespace-normal text-center text-[0.65rem] font-medium leading-4" title={label}>{label}</p><p className="mt-1 text-xl font-bold tabular-nums">{count.toLocaleString('pt-PT')}</p></div><a href={href} className="flex min-h-9 items-center justify-center rounded-b-lg bg-danger px-2 text-center text-xs font-semibold leading-4 text-white hover:brightness-110">Abrir tabela →</a></div>)}</div>
}
