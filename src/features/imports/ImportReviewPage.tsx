import { useEffect, useState } from 'react'
import { Icon } from '../../components/ui/Icon'
import { supabase } from '../../lib/supabase'
import { StandardDataTable, type TableColumn } from '../../components/table/StandardDataTable'

type ReviewRow = {
  id: string
  source_row_number: number
  validation_warnings: string[]
  status: string
}

const labels: Record<string, string> = {
  possible_duplicate: 'Possível duplicado',
  existing_duplicate: 'Possível duplicado já existente',
  invoiced_without_invoice_date: 'Facturado sem data',
  paid_without_invoiced: 'Pago sem marca de facturado',
  client_category_conflict: 'Cliente com vertente particular e empresa',
  unknown_client_type: 'Tipo de cliente por confirmar',
  unknown_client_code: 'Código não encontrado na folha CLIENTES',
  invalid_price: 'Sem preço ou preço inválido',
  amount_mismatch: 'Valor histórico diferente do cálculo',
  manual_amount: 'Valor possivelmente introduzido manualmente',
  source_row_updated: 'Movimento actualizado a partir do ficheiro',
}

export function ImportReviewPage() {
  const [rows, setRows] = useState<ReviewRow[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function load() {
      if (!supabase) { setError('Ligação ao Supabase indisponível.'); setLoading(false); return }
      const client = supabase
      const warningCodes = Object.keys(labels)
      const [queue, ...totals] = await Promise.all([
        client.from('import_rows').select('id,source_row_number,validation_warnings,status').not('validation_warnings', 'eq', '[]').order('source_row_number').limit(100),
        ...warningCodes.map((code) => client.from('import_rows').select('id', { count: 'exact', head: true }).contains('validation_warnings', [code])),
      ])
      if (!active) return
      if (queue.error) setError(queue.error.message)
      else setRows((queue.data ?? []) as ReviewRow[])
      setCounts(Object.fromEntries(warningCodes.map((code, index) => [code, totals[index].count ?? 0])))
      setLoading(false)
    }
    void load()
    return () => { active = false }
  }, [])

  if (loading) return <div role="status" className="rounded-2xl border border-border bg-surface p-6">A carregar a fila de revisão…</div>
  if (error) return <div role="alert" className="rounded-2xl border border-danger/30 bg-danger-soft p-6 text-danger">Não foi possível carregar a revisão: {error}</div>
  const columns:TableColumn<ReviewRow>[]=[
    {id:'row',label:'Linha Excel',kind:'number',essential:true,sticky:true,align:'right',value:item=>item.source_row_number},
    {id:'warnings',label:'Avisos',value:item=>item.validation_warnings.map(warning=>labels[warning]??warning).join(', '),render:item=><div className="flex flex-wrap gap-2">{item.validation_warnings.map(warning=><span key={warning} className="rounded-full bg-warning-soft px-2.5 py-1 text-xs font-medium text-warning">{labels[warning]??warning}</span>)}</div>},
    {id:'status',label:'Estado',value:()=> 'Importado'},
  ]

  return <section aria-labelledby="review-heading" className="space-y-5">
    <div className="rounded-2xl border border-warning/25 bg-warning-soft p-5">
      <div className="flex gap-3"><Icon name="warning" className="mt-0.5 size-5 shrink-0 text-warning"/><div><h2 id="review-heading" className="font-semibold">Movimentos importados que requerem confirmação</h2><p className="mt-1 text-sm text-text-secondary">Estes movimentos foram importados sem alterar o histórico. Um aviso não elimina nem recalcula o movimento.</p></div></div>
    </div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {Object.entries(labels).map(([code, label]) => <article key={code} className="rounded-xl border border-border bg-surface p-4 shadow-sm"><p className="text-sm text-text-secondary">{label}</p><p className="mt-2 text-2xl font-semibold">{counts[code] ?? 0}</p></article>)}
    </div>
    <div><p className="mb-2 text-sm text-text-secondary">Primeiros 100 movimentos da fila. A linha refere-se à folha DADOS do ficheiro original.</p><StandardDataTable id="import-review" label="Movimentos em revisão" rows={rows} columns={columns} rowKey={item=>item.id} defaultPageSize={20}/></div>
  </section>
}
