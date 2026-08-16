export type ChartPoint = { label: string | number; value: number }

function ChartCard({ title, subtitle, children, className = '' }: { title: string; subtitle: string; children: React.ReactNode; className?: string }) {
  return <figure className={`card min-w-0 p-5 ${className}`}><figcaption><h2 className="font-semibold">{title}</h2><p className="mt-1 text-xs text-text-secondary">{subtitle}</p></figcaption><div className="mt-5">{children}</div></figure>
}
export function AnnualValueChart({ data }: { data: ChartPoint[] }) {
  const max = Math.max(...data.map((point) => point.value), 1)
  return <ChartCard title="Valor por ano" subtitle="2018–2026 · comparação de evolução" className="lg:col-span-2">
    <div className="flex h-56 items-end gap-2 border-b border-border pb-1 sm:gap-3" role="img" aria-label="Valor anual dos movimentos acessíveis">
      {data.map((point) => <div key={point.label} className="group flex h-full min-w-0 flex-1 flex-col justify-end"><span className="mb-2 hidden text-center text-[0.62rem] font-semibold text-text-secondary group-hover:block">{Math.round(point.value / 1000)}k</span><div className="min-h-1 rounded-t-md bg-chart-1 transition-[height,filter] duration-300 hover:brightness-110" style={{ height: `${point.value / max * 100}%` }} /><span className="mt-2 text-center text-[0.62rem] text-text-secondary">{String(point.label).slice(2)}</span></div>)}
    </div>
  </ChartCard>
}

export function MonthlyValueChart({ data }: { data: ChartPoint[] }) {
  const values = Array.from({ length: 12 }, (_, index) => data.find((point) => Number(point.label) === index + 1)?.value ?? 0)
  const max = Math.max(...values, 1)
  const points = values.map((value, index) => `${(index / 11) * 100},${100 - value / max * 90}`).join(' ')
  return <ChartCard title="Valor por mês" subtitle="Ano seleccionado · sazonalidade mensal" className="lg:col-span-2"><div className="h-56">
    <svg viewBox="0 0 100 110" preserveAspectRatio="none" className="h-48 w-full overflow-visible" role="img" aria-label="Linha demonstrativa de valor mensal">
      <defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--color-chart-1)" stopOpacity=".25"/><stop offset="1" stopColor="var(--color-chart-1)" stopOpacity="0"/></linearGradient></defs>
      <path d={`M0,100 L${points} L100,100 Z`} fill="url(#area)"/><polyline points={points} fill="none" stroke="var(--color-chart-1)" strokeWidth="2" vectorEffect="non-scaling-stroke"/>
    </svg><div className="flex justify-between text-[0.62rem] text-text-secondary">{['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'].map((month) => <span key={month}>{month}</span>)}</div>
  </div></ChartCard>
}
export function HorizontalChart({ title, subtitle, labels, values, valueFormatter = (value) => value.toLocaleString('pt-PT') }: { title: string; subtitle: string; labels: string[]; values: number[]; valueFormatter?: (value: number) => string }) {
  const max = Math.max(...values, 1)
  return <ChartCard title={title} subtitle={subtitle}><div className="space-y-3" role="img" aria-label={title}>
    {labels.map((label, index) => <div key={label}><div className="mb-1 flex justify-between gap-3 text-xs"><span className="truncate text-text-secondary">{label}</span><span className="font-semibold tabular-nums">{valueFormatter(values[index])}</span></div><div className="h-2 overflow-hidden rounded-full bg-surface-subtle"><div className="h-full rounded-full bg-chart-1" style={{ width: `${values[index] / max * 100}%` }} /></div></div>)}
  </div></ChartCard>
}

export function DonutChart({ title, subtitle, firstLabel, secondLabel, first, tone = 'secondary' }: { title: string; subtitle: string; firstLabel: string; secondLabel: string; first: number; tone?: 'secondary' | 'success' }) {
  const color = tone === 'success' ? 'var(--color-success)' : 'var(--color-secondary)'
  return <ChartCard title={title} subtitle={subtitle}><div className="flex items-center justify-center gap-7 py-3"><div className="grid size-28 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(${color} ${first}%, var(--color-surface-subtle) 0)` }} role="img" aria-label={`${first}% ${firstLabel}`}><div className="grid size-20 place-items-center rounded-full bg-surface text-lg font-semibold">{first}%</div></div><div className="space-y-3 text-xs"><p><span className="mr-2 inline-block size-2.5 rounded-full bg-secondary" />{firstLabel}</p><p><span className="mr-2 inline-block size-2.5 rounded-full bg-surface-subtle ring-1 ring-border" />{secondLabel}</p></div></div></ChartCard>
}

export function StackedSocietyChart({ data }: { data: ChartPoint[] }) {
  return <ChartCard title="Distribuição das sociedades" subtitle="Valor total por sociedade" className="lg:col-span-2"><div className="space-y-4" role="img" aria-label="Distribuição real das sociedades">
    {data.map((point) => <div key={point.label} className="grid grid-cols-[8rem_1fr] items-center gap-3"><span className="truncate text-xs text-text-secondary">{point.label}</span><div className="h-4 overflow-hidden rounded-full bg-surface-subtle"><span className="block h-full bg-chart-1" style={{ width: `${point.value / Math.max(...data.map((item) => item.value),1) * 100}%` }}/></div></div>)}
  </div></ChartCard>
}
