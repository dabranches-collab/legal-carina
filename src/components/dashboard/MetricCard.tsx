import { Icon, type IconName } from '../ui/Icon'

interface MetricCardProps { label: string; value: string; detail: string; trend?: string; tone?: 'default' | 'success' | 'warning' | 'danger'; icon: IconName; financial?: boolean }

export function MetricCard({ label, value, detail, trend, tone = 'default', icon, financial = false }: MetricCardProps) {
  const tones = { default: 'bg-secondary-soft text-secondary', success: 'bg-success-soft text-success', warning: 'bg-warning-soft text-warning', danger: 'bg-danger-soft text-danger' }
  return <article className="card group min-w-0 p-4 transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-raised">
    <div className="flex items-start justify-between gap-3"><div className={`grid size-9 shrink-0 place-items-center rounded-lg ${tones[tone]}`}><Icon name={icon} className="size-4.5" /></div>{trend && <span className="flex items-center gap-1 text-xs font-semibold text-success"><Icon name="trend" className="size-3.5"/>{trend}</span>}</div>
    <p className="mt-4 truncate text-xs font-medium text-text-secondary">{label}</p><p className={`${financial?'financial-value ':''}mt-1 text-xl font-semibold tabular-nums tracking-tight`}>{value}</p><p className={`${financial&&detail.includes('%')?'financial-value ':''}mt-1 truncate text-xs text-text-secondary`}>{detail}</p>
  </article>
}
