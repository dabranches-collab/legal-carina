import type { IconName } from '../components/ui/Icon'
import type { ViewId } from './navigation'

export type WorkflowArea = 'resumo' | 'clientes' | 'trabalho' | 'financeiro' | 'notas' | 'definicoes'
export function workflowPreviewEnabled(search: string, development: boolean, appEnvironment?: string, navigationLayout?: string): boolean {
  // Deployment opt-in is separate from APP_ENV=test, which also enables synthetic QA.
  return navigationLayout === 'five-areas' || ((development || appEnvironment === 'test') && new URLSearchParams(search).get('workflow') === 'preview')
}
export function workflowArea(view: ViewId, clientDashboard = false): WorkflowArea {
  if (view === 'overview' || view === 'billing' || view === 'professionals' || (view === 'clients' && clientDashboard)) return 'resumo'
  if (view === 'clients' || view === 'retainers') return 'clientes'
  if (view === 'work') return 'trabalho'
  if (view === 'debtors' || view === 'payments' || view === 'provisions') return 'financeiro'
  if (view === 'notes') return 'notas'
  return 'definicoes'
}
export const workflowAreas: { id: WorkflowArea; view: ViewId; label: string; icon: IconName }[] = [
  { id: 'resumo', view: 'overview', label: 'Resumo', icon: 'overview' },
  { id: 'clientes', view: 'clients', label: 'Clientes', icon: 'clients' },
  { id: 'trabalho', view: 'work', label: 'Registos', icon: 'clock' },
  { id: 'financeiro', view: 'debtors', label: 'Financeiro', icon: 'payment' },
  { id: 'notas', view: 'notes', label: 'Notas', icon: 'audit' },
]
export const workflowAreaLabel = (area: WorkflowArea) => workflowAreas.find(item => item.id === area)?.label ?? 'Definições'
