import { useEffect, useState } from 'react'
import { Icon } from '../../components/ui/Icon'
import { supabase } from '../../lib/supabase'

type ReviewRow = {
  id: string
  source_row_number: number
  validation_warnings: string[]
  status: string
}

const labels: Record<string, string> = {
  possible_duplicate: 'Possível duplicado',
  invoiced_without_invoice_date: 'Faturado sem data',
  paid_without_invoiced: 'Pago sem marca de faturado',
  client_category_conflict: 'Categoria do cliente variável',
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

  return <section aria-labelledby="review-heading" className="space-y-5">
    <div className="rounded-2xl border border-warning/25 bg-warning-soft p-5">
      <div className="flex gap-3"><Icon name="warning" className="mt-0.5 size-5 shrink-0 text-warning"/><div><h2 id="review-heading" className="font-semibold">Movimentos importados que requerem confirmação</h2><p className="mt-1 text-sm text-text-secondary">Estes movimentos foram importados sem alterar o histórico. Um aviso não elimina nem recalcula o movimento.</p></div></div>
    </div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {Object.entries(labels).map(([code, label]) => <article key={code} className="rounded-xl border border-border bg-surface p-4 shadow-sm"><p className="text-sm text-text-secondary">{label}</p><p className="mt-2 text-2xl font-semibold">{counts[code] ?? 0}</p></article>)}
    </div>
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <div className="border-b border-border px-5 py-4"><h3 className="font-semibold">Primeiros 100 movimentos da fila</h3><p className="mt-1 text-sm text-text-secondary">A linha refere-se à folha DADOS do ficheiro original.</p></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-surface-subtle text-text-secondary"><tr><th className="px-5 py-3">Linha Excel</th><th className="px-5 py-3">Avisos</th><th className="px-5 py-3">Estado</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-t border-border"><td className="px-5 py-3 font-medium">{row.source_row_number}</td><td className="px-5 py-3"><div className="flex flex-wrap gap-2">{row.validation_warnings.map((warning) => <span key={warning} className="rounded-full bg-warning-soft px-2.5 py-1 text-xs font-medium text-warning">{labels[warning] ?? warning}</span>)}</div></td><td className="px-5 py-3">Importado</td></tr>)}</tbody></table></div>
    </div>
  </section>
}
