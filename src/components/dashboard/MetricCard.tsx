import { Icon, type IconName } from '../ui/Icon'
import { AppLink } from '../ui/AppLink'

interface MetricCardProps { label: string; value: string; detail: string; trend?: string; tone?: 'default' | 'success' | 'warning' | 'danger'; icon: IconName; financial?: boolean; detailHref?: string; subtotals?:{label:string;value:string}[] }

export function MetricCard({ label, value, detail, trend, tone = 'default', icon, financial = false, detailHref, subtotals=[] }: MetricCardProps) {
  const tones = { default: 'bg-secondary-soft text-secondary', success: 'bg-success-soft text-success', warning: 'bg-warning-soft text-warning', danger: 'bg-danger-soft text-danger' }
  return <article className={`card group min-w-0 p-4 transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-raised ${tone==='danger'?'card-danger':''}`}>
    <div className="flex min-h-9 items-center justify-between gap-3"><p className={`truncate text-xs font-semibold ${tone==='danger'?'text-danger':'text-text-secondary'}`}>{label}</p><div className="flex shrink-0 items-center gap-2">{trend&&<span className="flex items-center gap-1 text-xs font-semibold text-success"><Icon name="trend" className="size-3.5"/>{trend}</span>}<span className={`grid size-9 place-items-center rounded-lg ${tones[tone]}`}><Icon name={icon} className="size-4.5" /></span></div></div>
    <p className={`${financial?'financial-value ':''}metric-card-value mt-2 text-xl font-semibold tabular-nums tracking-tight`}>{value}</p><p className={`${financial&&detail.includes('%')?'financial-value ':''}metric-card-detail mt-1 truncate text-xs text-text-secondary`}>{detail}</p>
    {subtotals.length>0&&<dl className="mt-3 grid gap-1.5 border-t border-border pt-3 text-[0.68rem]">{subtotals.map(item=><div key={item.label} className="flex min-w-0 items-center justify-between gap-2"><dt className="truncate text-text-secondary">{item.label}</dt><dd className={`${financial?'financial-value ':''}shrink-0 font-semibold tabular-nums`}>{item.value}</dd></div>)}</dl>}
    {detailHref&&<AppLink href={detailHref} aria-label={`Abrir movimentos de ${label}`} className={`mt-3 flex min-h-9 items-center justify-center gap-2 rounded-lg px-3 text-xs font-semibold text-surface shadow-sm hover:brightness-110 ${tone==='danger'?'bg-danger':tone==='success'?'bg-success':'bg-secondary'}`}><Icon name="eye" className="size-4"/>Ver movimentos</AppLink>}
  </article>
}
