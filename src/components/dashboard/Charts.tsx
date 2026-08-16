export type ChartPoint = { label: string | number; value: number }
export type MonthlyYearPoint = { year:number; month:number; value:number }
export type SocietyYearPoint = { society:string; year:number; value:number }

const compactMoney = new Intl.NumberFormat('pt-PT', { style:'currency', currency:'EUR', notation:'compact', maximumFractionDigits:1 })

function ChartCard({ title, subtitle, children, className = '' }: { title: string; subtitle: string; children: React.ReactNode; className?: string }) {
  return <figure className={`card min-w-0 p-5 ${className}`}><figcaption><h2 className="font-semibold">{title}</h2><p className="mt-1 text-xs text-text-secondary">{subtitle}</p></figcaption><div className="mt-5">{children}</div></figure>
}
export function AnnualValueChart({ data }: { data: ChartPoint[] }) {
  const max = Math.max(...data.map((point) => point.value), 1)
  return <ChartCard title="Valor por ano" subtitle="2018–2026 · comparação de evolução" className="lg:col-span-2">
    <div className="overflow-x-auto pb-1"><div className="flex h-56 min-w-[34rem] items-end gap-2 border-b border-border pb-1 sm:gap-3" role="img" aria-label="Valor anual dos movimentos acessíveis">
      {data.map((point) => <div key={point.label} className="group flex h-full min-w-0 flex-1 flex-col justify-end"><span className="financial-value mb-2 whitespace-nowrap text-center text-[0.62rem] font-semibold tabular-nums text-text-primary">{compactMoney.format(point.value)}</span><div className="min-h-1 rounded-t-md bg-chart-1 transition-[height,filter] duration-300 hover:brightness-110" style={{ height: `${point.value / max * 100}%` }} /><span className="mt-2 text-center text-[0.62rem] text-text-secondary">{String(point.label).slice(2)}</span></div>)}
    </div></div>
  </ChartCard>
}

export function MonthlyValueChart({ data }: { data: ChartPoint[] }) {
  const values = Array.from({ length: 12 }, (_, index) => data.find((point) => Number(point.label) === index + 1)?.value ?? 0)
  const max = Math.max(...values, 1)
  const points = values.map((value, index) => `${(index / 11) * 100},${100 - value / max * 90}`).join(' ')
  return <ChartCard title="Valor por mês" subtitle="Ano seleccionado · sazonalidade mensal" className="lg:col-span-2"><div className="overflow-x-auto pb-1"><div className="h-56 min-w-[42rem]">
    <div className="relative h-48"><svg viewBox="0 0 100 110" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible" role="img" aria-label="Valor mensal">
      <defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--color-chart-1)" stopOpacity=".25"/><stop offset="1" stopColor="var(--color-chart-1)" stopOpacity="0"/></linearGradient></defs>
      <path d={`M0,100 L${points} L100,100 Z`} fill="url(#area)"/><polyline points={points} fill="none" stroke="var(--color-chart-1)" strokeWidth="2" vectorEffect="non-scaling-stroke"/>
    </svg>{values.map((value,index)=><span key={index} className="financial-value absolute -translate-x-1/2 rounded bg-surface/90 px-1 text-[0.58rem] font-semibold tabular-nums text-text-primary shadow-sm" style={{left:`${(index/11)*100}%`,top:`${Math.max(0,88-value/max*82)}%`}}>{compactMoney.format(value)}</span>)}</div><div className="flex justify-between text-[0.62rem] text-text-secondary">{['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'].map((month) => <span key={month}>{month}</span>)}</div>
  </div></div></ChartCard>
}
export function HorizontalChart({ title, subtitle, labels, values, valueFormatter = (value) => value.toLocaleString('pt-PT') }: { title: string; subtitle: string; labels: string[]; values: number[]; valueFormatter?: (value: number) => string }) {
  const max = Math.max(...values, 1)
  const financial = /valor|preço|factura|receb/i.test(`${title} ${subtitle}`)
  return <ChartCard title={title} subtitle={subtitle}><div className="space-y-3" role="img" aria-label={title}>
    {labels.map((label, index) => <div key={label}><div className="mb-1 flex justify-between gap-3 text-xs"><span className="truncate text-text-secondary">{label}</span><span className={`${financial?'financial-value ':''}font-semibold tabular-nums`}>{valueFormatter(values[index])}</span></div><div className="h-2 overflow-hidden rounded-full bg-surface-subtle"><div className="h-full rounded-full bg-chart-1" style={{ width: `${values[index] / max * 100}%` }} /></div></div>)}
  </div></ChartCard>
}

export function DonutChart({ title, subtitle, firstLabel, secondLabel, first, tone = 'secondary' }: { title: string; subtitle: string; firstLabel: string; secondLabel: string; first: number; tone?: 'secondary' | 'success' }) {
  const color = tone === 'success' ? 'var(--color-success)' : 'var(--color-secondary)'
  const financial = /factura|receb/i.test(title)
  return <ChartCard title={title} subtitle={subtitle}><div className="flex items-center justify-center gap-7 py-3"><div className="grid size-28 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(${color} ${first}%, var(--color-surface-subtle) 0)` }} role="img" aria-label={`${firstLabel}`}><div className={`${financial?'financial-value ':''}grid size-20 place-items-center rounded-full bg-surface text-lg font-semibold`}>{first}%</div></div><div className="space-y-3 text-xs"><p className="flex items-center"><span className="mr-2 inline-block size-2.5 rounded-full bg-secondary" /><span>{firstLabel}</span><strong className={`${financial?'financial-value ':''}ml-2 tabular-nums`}>{first}%</strong></p><p className="flex items-center"><span className="mr-2 inline-block size-2.5 rounded-full bg-surface-subtle ring-1 ring-border" /><span>{secondLabel}</span><strong className={`${financial?'financial-value ':''}ml-2 tabular-nums`}>{100-first}%</strong></p></div></div></ChartCard>
}

export function StackedSocietyChart({ data }: { data: ChartPoint[] }) {
  return <ChartCard title="Distribuição das sociedades" subtitle="Valor total por sociedade" className="lg:col-span-2"><div className="space-y-4" role="img" aria-label="Distribuição real das sociedades">
    {data.map((point) => <div key={point.label} className="grid grid-cols-[8rem_minmax(0,1fr)_auto] items-center gap-3"><span className="truncate text-xs text-text-secondary">{point.label}</span><div className="h-4 overflow-hidden rounded-full bg-surface-subtle"><span className="block h-full bg-chart-1" style={{ width: `${point.value / Math.max(...data.map((item) => item.value),1) * 100}%` }}/></div><strong className="financial-value text-xs tabular-nums">{compactMoney.format(point.value)}</strong></div>)}
  </div></ChartCard>
}

export function YearComparisonChart({data,years}:{data:MonthlyYearPoint[];years:number[]}){
  const months=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  const values=years.flatMap(year=>months.map((_,index)=>data.find(point=>point.year===year&&point.month===index+1)?.value??0))
  const max=Math.max(...values,1)
  return <ChartCard title="Comparação mensal entre anos" subtitle={years.length?years.join(' versus '):'Seleccione anos'} className="lg:col-span-2"><div className="overflow-x-auto"><div className="min-w-[42rem]"><div className="mb-3 flex justify-end gap-4 text-xs">{years.map((year,index)=><span key={year} className="flex items-center gap-2"><i className="size-2.5 rounded-full" style={{background:`var(--color-chart-${index+1})`}}/>{year}</span>)}</div><div className="grid h-60 grid-cols-12 items-end gap-2 border-b border-border">{months.map((month,monthIndex)=><div key={month} className="flex h-full min-w-0 items-end justify-center gap-0.5">{years.map((year,yearIndex)=>{const value=data.find(point=>point.year===year&&point.month===monthIndex+1)?.value??0;return <div key={year} className="group flex h-full min-w-0 flex-1 flex-col justify-end"><span className="financial-value mb-1 -rotate-45 whitespace-nowrap text-[0.5rem] font-semibold tabular-nums">{compactMoney.format(value)}</span><span className="min-h-0.5 rounded-t" style={{height:`${value/max*90}%`,background:`var(--color-chart-${yearIndex+1})`}}/></div>})}</div>)}</div><div className="grid grid-cols-12 gap-2 pt-2 text-center text-[0.62rem] text-text-secondary">{months.map(month=><span key={month}>{month}</span>)}</div></div></div></ChartCard>
}

export function SocietyEvolutionChart({data}:{data:SocietyYearPoint[]}){
  const years=[...new Set(data.map(point=>point.year))].sort(),societies=[...new Set(data.map(point=>point.society))]
  const max=Math.max(...data.map(point=>point.value),1)
  return <ChartCard title="Evolução anual das sociedades" subtitle="Comparação por sociedade" className="lg:col-span-2"><div className="overflow-x-auto"><div className="min-w-[36rem] space-y-4">{societies.map((society,societyIndex)=><div key={society}><p className="mb-2 truncate text-xs font-semibold">{society}</p><div className="grid gap-2" style={{gridTemplateColumns:`repeat(${Math.max(years.length,1)},minmax(3rem,1fr))`}}>{years.map(year=>{const value=data.find(point=>point.society===society&&point.year===year)?.value??0;return <div key={year} className="min-w-0"><span className="financial-value block truncate text-[0.58rem] font-semibold tabular-nums">{compactMoney.format(value)}</span><span className="mt-1 block h-2 rounded-full bg-surface-subtle"><i className="block h-full rounded-full" style={{width:`${value/max*100}%`,background:`var(--color-chart-${societyIndex%4+1})`}}/></span><span className="mt-1 block text-[0.58rem] text-text-secondary">{year}</span></div>})}</div></div>)}</div></div></ChartCard>
}
