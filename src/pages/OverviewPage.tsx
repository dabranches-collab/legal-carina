import { useState } from 'react'
import { MetricCard } from '../components/dashboard/MetricCard'
import { AnnualValueChart, DonutChart, HorizontalChart, MonthlyValueChart, StackedSocietyChart } from '../components/dashboard/Charts'

const metrics = [
  ['Total de horas', '8 426 h', 'No período selecionado', '+8,4%', 'clock', 'default'], ['Total de minutos', '505 560', 'Equivalente em minutos', undefined, 'clock', 'default'],
  ['Valor trabalhado', '€ 842 680', 'Antes de descontos', '+11,2%', 'trend', 'default'], ['Valor faturado', '€ 731 240', '86,8% do trabalhado', '+9,1%', 'invoice', 'default'],
  ['Valor recebido', '€ 654 920', '89,6% do faturado', '+12,6%', 'payment', 'success'], ['Por receber', '€ 76 320', 'Inclui valores vencidos', undefined, 'warning', 'warning'],
  ['Não faturados', '384', 'Movimentos aprovados', undefined, 'invoice', 'warning'], ['Faturados não pagos', '126', 'Requer acompanhamento', undefined, 'payment', 'warning'],
  ['Preço médio/hora', '€ 100,01', 'Média ponderada', '+2,3%', 'rules', 'default'], ['Clientes ativos', '147', 'Com movimento no período', undefined, 'clients', 'default'],
  ['Movimentos sem preço', '18', 'Necessitam de regra', undefined, 'warning', 'danger'], ['Com override', '42', 'Alterações justificadas', undefined, 'audit', 'default'],
  ['Importações com erros', '2', 'Aguardam correção', undefined, 'import', 'danger'],
] as const

export function OverviewPage() {
  const [compare, setCompare] = useState('2025')
  return <div className="space-y-6">
    <section aria-labelledby="summary-title"><div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><h2 id="summary-title" className="font-semibold">Resumo operacional</h2><p className="mt-1 text-sm text-text-secondary">Indicadores do período selecionado</p></div><div className="flex items-center gap-2 text-sm"><label htmlFor="compare-year" className="text-text-secondary">Comparar com</label><select id="compare-year" value={compare} onChange={(event) => setCompare(event.target.value)} className="control px-3"><option>2025</option><option>2024</option><option>2023</option><option>2022</option><option>2021</option><option>2020</option><option>2019</option><option>2018</option></select></div></div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">{metrics.map(([label,value,detail,trend,icon,tone]) => <MetricCard key={label} label={label} value={value} detail={detail} trend={trend} icon={icon} tone={tone} />)}</div>
    </section>
    <section aria-labelledby="analysis-title"><div className="mb-4"><h2 id="analysis-title" className="font-semibold">Análise e tendências</h2><p className="mt-1 text-sm text-text-secondary">Comparação visual com {compare}; valores meramente demonstrativos</p></div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"><AnnualValueChart/><MonthlyValueChart/>
        <HorizontalChart title="Horas por ano" subtitle="Volume de trabalho anual" labels={['2026','2025','2024','2023','2022']} values={[64,86,72,61,53]}/>
        <HorizontalChart title="Valor por cliente" subtitle="Cinco maiores no período" labels={['Cliente Atlas','Cliente Boreal','Cliente Cobalto','Cliente Duna','Cliente Estrela']} values={[96,82,68,55,43]}/>
        <HorizontalChart title="Valor por sociedade" subtitle="Sociedades faturantes" labels={['Carina Santos','Legal Team','Massive Search']} values={[128,96,72]}/>
        <HorizontalChart title="Valor por responsável" subtitle="Distribuição do trabalho" labels={['Carina','Paula','Hugo']} values={[146,91,59]}/>
        <DonutChart title="Faturação" subtitle="Faturado versus não faturado" firstLabel="Faturado" secondLabel="Não faturado" first={87}/>
        <DonutChart title="Recebimentos" subtitle="Pago versus por receber" firstLabel="Pago" secondLabel="Por receber" first={90} tone="success"/>
        <HorizontalChart title="Preço médio/hora" subtitle="Evolução recente (€)" labels={['2026','2025','2024','2023']} values={[100,98,94,91]}/>
        <DonutChart title="Tipo de cliente" subtitle="Particulares versus sociedades" firstLabel="Sociedades" secondLabel="Particulares" first={61}/>
        <HorizontalChart title="Arquivo" subtitle="Movimentos por localização" labels={['Dossier','Digital','Findos','Gaveta','Outro']} values={[82,64,42,28,8]}/>
        <StackedSocietyChart/>
      </div>
    </section>
  </div>
}
