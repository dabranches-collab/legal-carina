import { useState } from 'react'
import { AppShell } from './components/layout/AppShell'
import { PlaceholderPage } from './components/feedback/PlaceholderPage'
import { EntityDashboard } from './features/entities/EntityDashboard'
import { ImportWizard } from './features/imports/ImportWizard'
import { ImportReviewPage } from './features/imports/ImportReviewPage'
import { WorkEntriesPage } from './features/work-entries/WorkEntriesPage'
import { OverviewPage } from './pages/OverviewPage'
import type { ViewId } from './types/navigation'
import { AuthGate } from './features/auth/AuthGate'
import { PwaUpdateNotice } from './components/feedback/PwaUpdateNotice'

const placeholders: Partial<Record<ViewId, { title:string; description:string; icon: Parameters<typeof PlaceholderPage>[0]['icon'] }>> = {
  matters:{ title:'Processos', description:'Gestão de assuntos, responsáveis, arquivo, movimentos e ligação ao cliente.', icon:'matters' },
  invoices:{ title:'Faturação', description:'Preparação, emissão interna, agrupamento de movimentos e acompanhamento do estado das faturas.', icon:'invoice' },
  payments:{ title:'Recebimentos', description:'Reconciliação de pagamentos, valores pendentes, vencidos e parcialmente recebidos.', icon:'payment' },
  pricing:{ title:'Regras de preços', description:'Hierarquia comercial, vigências, descontos, overrides e pré-visualização de recálculos.', icon:'rules' },
  reports:{ title:'Relatórios', description:'Análises autorizadas, vistas guardadas e exportações controladas.', icon:'reports' },
  audit:{ title:'Auditoria', description:'Histórico imutável das alterações relevantes, com ator, data, motivo e valores antes/depois.', icon:'audit' },
  admin:{ title:'Administração', description:'Utilizadores, papéis, sociedades, segurança, retenção e configurações do escritório.', icon:'admin' },
}

export function AuthenticatedApplication() {
  const [view, setView] = useState<ViewId>('overview')
  let content: React.ReactNode
  if (view === 'overview') content = <OverviewPage />
  else if (view === 'work') content = <WorkEntriesPage />
  else if (view === 'clients') content = <EntityDashboard kind="client" />
  else if (view === 'billing') content = <EntityDashboard kind="billing" />
  else if (view === 'professionals') content = <EntityDashboard kind="professional" />
  else if (view === 'imports') content = <ImportWizard />
  else if (view === 'import-review') content = <ImportReviewPage />
  else { const page = placeholders[view]!; content = <PlaceholderPage {...page} /> }
  return <AppShell activeView={view} onNavigate={setView}>{content}</AppShell>
}

export default function App() {
  if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('qa-iphone') === '1') {
    return <><AuthenticatedApplication /><PwaUpdateNotice /></>
  }
  return <><AuthGate><AuthenticatedApplication /></AuthGate><PwaUpdateNotice /></>
}
