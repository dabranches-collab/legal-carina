import { useEffect, useState } from 'react'
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
import { AdminPage } from './features/admin/AdminPage'
import { AdminLandingPage } from './features/admin/AdminLandingPage'
import { MasterDataPage } from './features/master-data/MasterDataPage'

const placeholders: Partial<Record<ViewId, { title:string; description:string; icon: Parameters<typeof PlaceholderPage>[0]['icon'] }>> = {
  matters:{ title:'Processos', description:'Gestão de assuntos, responsáveis, arquivo, movimentos e ligação ao cliente.', icon:'matters' },
  invoices:{ title:'Facturação', description:'Preparação, emissão interna, agrupamento de movimentos e acompanhamento do estado das facturas.', icon:'invoice' },
  payments:{ title:'Recebimentos', description:'Reconciliação de pagamentos, valores pendentes, vencidos e parcialmente recebidos.', icon:'payment' },
  pricing:{ title:'Regras de preços', description:'Hierarquia comercial, vigências, descontos, overrides e pré-visualização de recálculos.', icon:'rules' },
  reports:{ title:'Relatórios', description:'Análises autorizadas, vistas guardadas e exportações controladas.', icon:'reports' },
  audit:{ title:'Auditoria', description:'Histórico imutável das alterações relevantes, com ator, data, motivo e valores antes/depois.', icon:'audit' },
  admin:{ title:'Administração', description:'Utilizadores, papéis, sociedades, segurança, retenção e configurações do escritório.', icon:'admin' },
}

export function AuthenticatedApplication() {
  const validViews:ViewId[] = ['overview','work','clients','matters','billing','professionals','invoices','payments','pricing','imports','import-review','reports','audit','master-data','admin','admin-users']
  const readLocation = () => {
    const params = new URLSearchParams(window.location.search)
    const requested = params.get('view') as ViewId|null
    const requestedClientType=params.get('clientType')
    const requestedEntity=params.get('entity')
    return { view:requested && validViews.includes(requested) ? requested : 'overview' as ViewId, society:params.get('society'), clientType:(requestedClientType==='individual'||requestedClientType==='company'||requestedClientType==='mixed'?requestedClientType:null) as 'individual'|'company'|'mixed'|null, settingsEntity:(requestedEntity==='clients'||requestedEntity==='billing_entities'?requestedEntity:null) as 'clients'|'billing_entities'|null }
  }
  const initial = readLocation()
  const [view, setView] = useState<ViewId>(initial.view)
  const [society,setSociety] = useState<string|null>(initial.society)
  const [clientType,setClientType] = useState<'individual'|'company'|'mixed'|null>(initial.clientType)
  const [settingsEntity,setSettingsEntity] = useState<'clients'|'billing_entities'|null>(initial.settingsEntity)
  useEffect(() => { const sync=()=>{const location=readLocation();setView(location.view);setSociety(location.society);setClientType(location.clientType);setSettingsEntity(location.settingsEntity)}; window.addEventListener('popstate',sync); return()=>window.removeEventListener('popstate',sync) }, [])
  function navigate(nextView:ViewId,nextSociety:string|null=null,nextClientType:'individual'|'company'|'mixed'|null=null,nextEntity:'clients'|'billing_entities'|null=null) {
    const url=new URL(window.location.href); url.searchParams.set('view',nextView)
    if(nextSociety) url.searchParams.set('society',nextSociety); else url.searchParams.delete('society')
    if(nextClientType) url.searchParams.set('clientType',nextClientType); else url.searchParams.delete('clientType')
    if(nextEntity) url.searchParams.set('entity',nextEntity); else url.searchParams.delete('entity')
    window.history.pushState({},'',url); setView(nextView); setSociety(nextSociety); setClientType(nextClientType); setSettingsEntity(nextEntity)
  }
  let content: React.ReactNode
  if (view === 'overview') content = <OverviewPage />
  else if (view === 'work') content = <WorkEntriesPage />
  else if (view === 'clients') content = <EntityDashboard kind="client" aggregateClients clientCategory={clientType} />
  else if (view === 'billing') content = <EntityDashboard kind="billing" initialSelectionLabel={society} />
  else if (view === 'professionals') content = <EntityDashboard kind="professional" />
  else if (view === 'imports') content = <ImportWizard />
  else if (view === 'import-review') content = <ImportReviewPage />
  else if (view === 'master-data') content = <MasterDataPage initialSection={settingsEntity??'clients'} />
  else if (view === 'admin') content = <AdminLandingPage onNavigate={navigate} />
  else if (view === 'admin-users') content = <AdminPage />
  else { const page = placeholders[view]!; content = <PlaceholderPage {...page} /> }
  return <AppShell activeView={view} selectedSociety={society} selectedClientType={clientType} settingsEntity={settingsEntity} onNavigate={navigate} onNavigateSociety={(name)=>navigate('billing',name)} onNavigateClientType={(type)=>navigate('clients',null,type)} onNavigateSettings={(target)=>target==='admin'?navigate('admin'):navigate('master-data',null,null,target)}>{content}</AppShell>
}

export default function App() {
  if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('qa-iphone') === '1') {
    return <><AuthenticatedApplication /><PwaUpdateNotice /></>
  }
  return <><AuthGate><AuthenticatedApplication /></AuthGate><PwaUpdateNotice /></>
}
