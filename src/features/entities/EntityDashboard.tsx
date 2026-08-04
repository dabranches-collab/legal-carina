import { AnnualValueChart, HorizontalChart, MonthlyValueChart } from '../../components/dashboard/Charts'
import { Icon } from '../../components/ui/Icon'

type EntityKind = 'client' | 'billing' | 'professional'

const configurations = {
  client: { eyebrow:'Cliente · C-0142', title:'Cliente Atlas', subtitle:'Sociedade · Ativo desde 2019', icon:'clients' as const,
    metrics:[['Total de horas','1 248 h'],['Valor total','€ 148 920'],['Valor faturado','€ 132 400'],['Valor pago','€ 119 800'],['Valor pendente','€ 12 600'],['Preço médio','€ 119,33/h']],
    details:[['Responsáveis','Carina, Paula'],['Sociedades que faturaram','Carina Santos, Legal Team'],['Processos ativos','4'],['Observações','Condições comerciais revistas em janeiro de 2026.']] },
  billing: { eyebrow:'Sociedade faturante', title:'Carina Santos', subtitle:'Entidade ativa · EUR', icon:'building' as const,
    metrics:[['Valor total','€ 382 640'],['Valor faturado','€ 341 200'],['Valor recebido','€ 309 780'],['Valor pendente','€ 31 420'],['Clientes','82'],['Não faturados','€ 41 440']],
    details:[['Responsáveis','Carina, Paula, Hugo'],['Clientes ativos','64 no período'],['Movimentos pendentes','178'],['Observações','Valores demonstrativos consolidados por sociedade.']] },
  professional: { eyebrow:'Profissional', title:'Carina', subtitle:'Advogada · Ativa', icon:'people' as const,
    metrics:[['Horas','3 842 h'],['Valor','€ 418 760'],['Preço médio','€ 109,00/h'],['Clientes','103'],['Faturado','€ 372 500'],['Não faturado','€ 46 260']],
    details:[['Clientes principais','Atlas, Boreal, Cobalto'],['Movimentos','2 186 no histórico'],['Comparação anual','+8,2% face a 2025'],['Observações','Indicadores calculados por responsável do movimento.']] },
}

export function EntityDashboard({ kind }: { kind: EntityKind }) {
  const config = configurations[kind]
  return <div className="space-y-6">
    <section className="card overflow-hidden"><div className="h-1 bg-gradient-to-r from-secondary via-accent to-secondary"/><div className="flex flex-wrap items-center gap-4 p-6"><div className="grid size-14 place-items-center rounded-xl bg-secondary-soft text-secondary"><Icon name={config.icon} className="size-7"/></div><div><p className="text-xs font-semibold uppercase tracking-[0.15em] text-secondary">{config.eyebrow}</p><h2 className="mt-1 font-display text-2xl font-semibold">{config.title}</h2><p className="mt-1 text-sm text-text-secondary">{config.subtitle}</p></div><button className="control ml-auto px-4 text-sm font-semibold">Editar ficha</button></div></section>
    <section aria-label="Indicadores" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">{config.metrics.map(([label,value]) => <article key={label} className="card p-4"><p className="text-xs text-text-secondary">{label}</p><p className="mt-2 text-xl font-semibold tabular-nums">{value}</p></article>)}</section>
    <div className="grid gap-4 lg:grid-cols-3"><section className="card p-5 lg:col-span-1"><h2 className="font-semibold">Informação operacional</h2><dl className="mt-4 divide-y divide-border">{config.details.map(([label,value]) => <div key={label} className="py-3"><dt className="text-xs text-text-secondary">{label}</dt><dd className="mt-1 text-sm font-medium">{value}</dd></div>)}</dl></section><div className="grid gap-4 lg:col-span-2 lg:grid-cols-2"><AnnualValueChart/><MonthlyValueChart/></div></div>
    <div className="grid gap-4 lg:grid-cols-2"><HorizontalChart title={kind === 'client' ? 'Atividade por ano' : kind === 'billing' ? 'Distribuição por cliente' : 'Comparação anual'} subtitle="Valores demonstrativos" labels={['2026','2025','2024','2023','2022']} values={[82,74,68,57,44]}/><section className="card overflow-hidden"><div className="border-b border-border p-5"><h2 className="font-semibold">{kind === 'client' ? 'Movimentos recentes e processos' : kind === 'billing' ? 'Movimentos ainda não faturados' : 'Movimentos recentes'}</h2><p className="mt-1 text-xs text-text-secondary">Última atividade demonstrativa</p></div><ul className="divide-y divide-border">{['Análise e preparação documental','Reunião de acompanhamento','Correspondência processual','Revisão de minuta'].map((activity,index) => <li key={activity} className="flex items-center gap-3 px-5 py-3"><span className="grid size-8 place-items-center rounded-lg bg-surface-subtle text-xs font-semibold text-secondary">{index+1}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{activity}</p><p className="text-xs text-text-secondary">Abril de 2026 · Processo sintético</p></div><span className="text-sm font-semibold">{45 + index*25} min</span></li>)}</ul></section></div>
  </div>
}
