const years = ['2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025', '2026']
const yearValues = [28, 35, 31, 44, 53, 61, 72, 86, 64]
const monthValues = [42, 57, 48, 64, 55, 72, 68, 79, 63, 84, 76, 58]

function ChartCard({ title, subtitle, children, className = '' }: { title: string; subtitle: string; children: React.ReactNode; className?: string }) {
  return <figure className={`card min-w-0 p-5 ${className}`}><figcaption><h2 className="font-semibold">{title}</h2><p className="mt-1 text-xs text-text-secondary">{subtitle}</p></figcaption><div className="mt-5">{children}</div></figure>
}

export function AnnualValueChart() {
  return <ChartCard title="Valor por ano" subtitle="2018–2026 · comparação de evolução" className="lg:col-span-2">
    <div className="flex h-56 items-end gap-2 border-b border-border pb-1 sm:gap-3" role="img" aria-label="Gráfico demonstrativo do valor anual entre 2018 e 2026">
      {yearValues.map((value, index) => <div key={years[index]} className="group flex h-full min-w-0 flex-1 flex-col justify-end"><span className="mb-2 hidden text-center text-[0.62rem] font-semibold text-text-secondary group-hover:block">{value}k</span><div className="min-h-1 rounded-t-md bg-chart-1 transition-[height,filter] duration-300 hover:brightness-110" style={{ height: `${value}%` }} /><span className="mt-2 text-center text-[0.62rem] text-text-secondary">{years[index].slice(2)}</span></div>)}
    </div>
  </ChartCard>
}

export function MonthlyValueChart() {
  const points = monthValues.map((value, index) => `${(index / 11) * 100},${100 - value}`).join(' ')
  return <ChartCard title="Valor por mês" subtitle="Ano selecionado · sazonalidade mensal" className="lg:col-span-2"><div className="h-56">
    <svg viewBox="0 0 100 110" preserveAspectRatio="none" className="h-48 w-full overflow-visible" role="img" aria-label="Linha demonstrativa de valor mensal">
      <defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--color-chart-1)" stopOpacity=".25"/><stop offset="1" stopColor="var(--color-chart-1)" stopOpacity="0"/></linearGradient></defs>
      <path d={`M0,100 L${points} L100,100 Z`} fill="url(#area)"/><polyline points={points} fill="none" stroke="var(--color-chart-1)" strokeWidth="2" vectorEffect="non-scaling-stroke"/>
    </svg><div className="flex justify-between text-[0.62rem] text-text-secondary">{['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'].map((month) => <span key={month}>{month}</span>)}</div>
  </div></ChartCard>
}

export function HorizontalChart({ title, subtitle, labels, values }: { title: string; subtitle: string; labels: string[]; values: number[] }) {
  const max = Math.max(...values)
  return <ChartCard title={title} subtitle={subtitle}><div className="space-y-3" role="img" aria-label={`${title}, dados demonstrativos`}>
    {labels.map((label, index) => <div key={label}><div className="mb-1 flex justify-between gap-3 text-xs"><span className="truncate text-text-secondary">{label}</span><span className="font-semibold tabular-nums">{values[index]}k</span></div><div className="h-2 overflow-hidden rounded-full bg-surface-subtle"><div className="h-full rounded-full bg-chart-1" style={{ width: `${values[index] / max * 100}%` }} /></div></div>)}
  </div></ChartCard>
}

export function DonutChart({ title, subtitle, firstLabel, secondLabel, first, tone = 'secondary' }: { title: string; subtitle: string; firstLabel: string; secondLabel: string; first: number; tone?: 'secondary' | 'success' }) {
  const color = tone === 'success' ? 'var(--color-success)' : 'var(--color-secondary)'
  return <ChartCard title={title} subtitle={subtitle}><div className="flex items-center justify-center gap-7 py-3"><div className="grid size-28 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(${color} ${first}%, var(--color-surface-subtle) 0)` }} role="img" aria-label={`${first}% ${firstLabel}`}><div className="grid size-20 place-items-center rounded-full bg-surface text-lg font-semibold">{first}%</div></div><div className="space-y-3 text-xs"><p><span className="mr-2 inline-block size-2.5 rounded-full bg-secondary" />{firstLabel}</p><p><span className="mr-2 inline-block size-2.5 rounded-full bg-surface-subtle ring-1 ring-border" />{secondLabel}</p></div></div></ChartCard>
}

export function StackedSocietyChart() {
  return <ChartCard title="Evolução das sociedades" subtitle="Comparação anual por sociedade faturante" className="lg:col-span-2"><div className="space-y-4" role="img" aria-label="Evolução anual demonstrativa das sociedades faturantes">
    {years.slice(3).map((year, index) => <div key={year} className="grid grid-cols-[2.5rem_1fr] items-center gap-3"><span className="text-xs text-text-secondary">{year}</span><div className="flex h-4 overflow-hidden rounded-full bg-surface-subtle"><span className="bg-chart-1" style={{ width: `${34 + index * 3}%` }}/><span className="bg-chart-2" style={{ width: `${28 + index}%` }}/><span className="bg-chart-3" style={{ width: `${18 + index * 2}%` }}/></div></div>)}
    <div className="flex flex-wrap gap-4 pl-14 text-xs text-text-secondary"><span><i className="mr-1.5 inline-block size-2 rounded-full bg-chart-1"/>Carina Santos</span><span><i className="mr-1.5 inline-block size-2 rounded-full bg-chart-2"/>Legal Team</span><span><i className="mr-1.5 inline-block size-2 rounded-full bg-chart-3"/>Massive Search</span></div>
  </div></ChartCard>
}
