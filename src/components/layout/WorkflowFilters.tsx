import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { hasWorkflowScope } from '../../types/workflowScope'
import { clearWorkflowScope, useWorkflowScope } from '../../features/workflow/useWorkflowScope'

type Option = { id: string; label: string }
const detailOpen = () => Boolean(document.querySelector('[role="dialog"][aria-modal="true"],dialog[open]'))
export function WorkflowFilters({ view, aggregate = false }: { view: string; aggregate?: boolean }) {
  const scope = useWorkflowScope()
  const [locked, setLocked] = useState(detailOpen)
  useEffect(() => {
    const observer = new MutationObserver(() => setLocked(detailOpen()))
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])
  const [societies, setSocieties] = useState<Option[]>([]), [professionals, setProfessionals] = useState<Option[]>([]), [error, setError] = useState('')
  useEffect(() => {
    let active = true
    void (async () => {
      try {
        if (!supabase) throw new Error('Ligação indisponível.')
        const read = async (table: string, field: string) => {
          const rows: Option[] = []
          for (let from = 0;; from += 1000) {
            const response = await supabase!.from(table).select(`id,${field}`).eq('active', true).order('id').range(from, from + 999)
            if (response.error) throw response.error
            const page = (response.data ?? []) as unknown as Record<string, string>[]
            rows.push(...page.map(row => ({ id: row.id, label: row[field] })))
            if (page.length < 1000) return rows.sort((a, b) => a.label.localeCompare(b.label, 'pt-PT'))
          }
        }
        const [billing, people] = await Promise.all([read('billing_entities', 'name'), read('professionals', 'display_name')])
        if (active) { setSocieties(billing); setProfessionals(people) }
      } catch (cause) { if (active) setError(cause && typeof cause === 'object' && 'message' in cause ? String(cause.message) : 'Não foi possível carregar os filtros.') }
    })()
    return () => { active = false }
  }, [])
  function update(param: string, value: string) {
    if (detailOpen()) return
    const url = new URL(window.location.href)
    if (value) url.searchParams.set(param, value); else url.searchParams.delete(param)
    window.history.pushState({}, '', url); window.dispatchEvent(new PopStateEvent('popstate'))
  }
  const supported = ['overview','billing','professionals','work', 'clients', 'payments', 'provisions', 'retainers', 'debtors'].includes(view)
  const description = aggregate ? 'Gráficos e métricas mostram trabalho do âmbito seleccionado. Os recebimentos conservam a dívida integral dos clientes seleccionados.' : view === 'work' ? 'Os registos mostram apenas o trabalho do âmbito seleccionado.' : view === 'clients' ? 'Os filtros seleccionam clientes na lista. A ficha conserva todos os dados e movimentos do cliente.' : view === 'retainers' || view === 'debtors' ? 'Clientes seleccionados pelo âmbito. Dívidas e contratos conservam os montantes integrais do cliente, incluindo outras sociedades e responsáveis.' : view === 'provisions' ? 'Contas da sociedade seleccionada. O responsável selecciona os seus clientes; os saldos conservam todos os movimentos da conta.' : 'Registos do âmbito seleccionado. Notas e avenças dos clientes seleccionados conservam os montantes integrais, sem repartição por responsável.'
  return <section aria-label="Filtros partilhados" className="card space-y-3 p-4">
    <div className="grid gap-3 sm:grid-cols-3">{([
      ['scopeSociety', 'Filtrar sociedade', scope.society, societies],
      ['scopeProfessional', 'Filtrar responsável', scope.professional, professionals],
      ['scopeClientType', 'Filtrar tipo de cliente', scope.clientType, [{ id: 'individual', label: 'Particulares' }, { id: 'company', label: 'Empresas' }, { id: 'mixed', label: 'Mistos' }]],
    ] as [string, string, string, Option[]][]).map(([param, label, value, options]) => <label key={param} className="text-sm font-semibold">{label}<select aria-label={label} value={value} disabled={Boolean(error)||locked} onChange={event => update(param, event.target.value)} className="control mt-1 min-h-11 w-full px-3"><option value="">Todos</option>{value && !options.some(option => option.id === value) && <option value={value}>Selecção guardada</option>}{options.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>)}</div>
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    {locked&&<p className="text-sm text-text-secondary">Feche a janela de detalhe antes de alterar o âmbito.</p>}
    {hasWorkflowScope(scope) && <><p className="text-sm text-text-secondary">{supported ? description : 'Este ecrã conserva os filtros para regressar às listas.'}</p><button type="button" className="control min-h-11 px-3" disabled={locked} onClick={()=>{if(!detailOpen())clearWorkflowScope()}}>Limpar âmbito</button></>}
  </section>
}
