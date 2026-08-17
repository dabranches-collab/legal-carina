import { lazy, Suspense, useEffect, useState } from 'react'
import { AppShell } from './components/layout/AppShell'
import { PlaceholderPage } from './components/feedback/PlaceholderPage'
import type { ViewId } from './types/navigation'
import { AuthGate } from './features/auth/AuthGate'
import { PwaUpdateNotice } from './components/feedback/PwaUpdateNotice'

const OverviewPage=lazy(()=>import('./pages/OverviewPage').then(module=>({default:module.OverviewPage})))
const WorkEntriesPage=lazy(()=>import('./features/work-entries/WorkEntriesPage').then(module=>({default:module.WorkEntriesPage})))
const EntityDashboard=lazy(()=>import('./features/entities/EntityDashboard').then(module=>({default:module.EntityDashboard})))
const ClientLandingPage=lazy(()=>import('./features/entities/ClientLandingPage').then(module=>({default:module.ClientLandingPage})))
const ImportWizard=lazy(()=>import('./features/imports/ImportWizard').then(module=>({default:module.ImportWizard})))
const ImportReviewPage=lazy(()=>import('./features/imports/ImportReviewPage').then(module=>({default:module.ImportReviewPage})))
const AdminPage=lazy(()=>import('./features/admin/AdminPage').then(module=>({default:module.AdminPage})))
const AdminLandingPage=lazy(()=>import('./features/admin/AdminLandingPage').then(module=>({default:module.AdminLandingPage})))
const MasterDataPage=lazy(()=>import('./features/master-data/MasterDataPage').then(module=>({default:module.MasterDataPage})))
const operations=()=>import('./features/operations/OperationalPages')
const MattersPage=lazy(()=>operations().then(module=>({default:module.MattersPage}))),InvoicesPage=lazy(()=>operations().then(module=>({default:module.InvoicesPage}))),PaymentsPage=lazy(()=>operations().then(module=>({default:module.PaymentsPage}))),PricingPage=lazy(()=>operations().then(module=>({default:module.PricingPage}))),ReportsPage=lazy(()=>operations().then(module=>({default:module.ReportsPage}))),AuditPage=lazy(()=>operations().then(module=>({default:module.AuditPage})))

const validViews:ViewId[] = ['overview','work','clients','matters','billing','professionals','invoices','payments','pricing','imports','import-review','reports','audit','master-data','admin','admin-users']
function readLocation() {
  const params = new URLSearchParams(window.location.search)
  const requested = params.get('view') as ViewId|null
  const requestedClientType=params.get('clientType')
  const requestedEntity=params.get('entity')
  return { view:requested && validViews.includes(requested) ? requested : 'overview' as ViewId, society:params.get('society'), clientType:(requestedClientType==='individual'||requestedClientType==='company'||requestedClientType==='mixed'?requestedClientType:null) as 'individual'|'company'|'mixed'|null, settingsEntity:(requestedEntity==='clients'||requestedEntity==='billing_entities'?requestedEntity:null) as 'clients'|'billing_entities'|null }
}

export function AuthenticatedApplication() {
  const initial = readLocation()
  const [view, setView] = useState<ViewId>(initial.view)
  const [society,setSociety] = useState<string|null>(initial.society)
  const [clientType,setClientType] = useState<'individual'|'company'|'mixed'|null>(initial.clientType)
  const [settingsEntity,setSettingsEntity] = useState<'clients'|'billing_entities'|null>(initial.settingsEntity)
  const [refreshKey,setRefreshKey] = useState(0)
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
  else if (view === 'clients') content = clientType?<EntityDashboard kind="client" aggregateClients clientCategory={clientType}/>:<ClientLandingPage onSelect={(type)=>navigate('clients',null,type)}/>
  else if (view === 'billing') content = <EntityDashboard kind="billing" initialSelectionLabel={society} />
  else if (view === 'professionals') content = <EntityDashboard kind="professional" />
  else if (view === 'imports') content = <ImportWizard />
  else if (view === 'import-review') content = <ImportReviewPage />
  else if (view === 'master-data') content = <MasterDataPage initialSection={settingsEntity??'clients'} />
  else if (view === 'admin') content = <AdminLandingPage onNavigate={navigate} />
  else if (view === 'admin-users') content = <AdminPage />
  else if (view === 'matters') content = <MattersPage />
  else if (view === 'invoices') content = <InvoicesPage />
  else if (view === 'payments') content = <PaymentsPage />
  else if (view === 'pricing') content = <PricingPage />
  else if (view === 'reports') content = <ReportsPage />
  else if (view === 'audit') content = <AuditPage />
  else content = <PlaceholderPage title="Módulo" description="Área em preparação." icon="warning" />
  return <AppShell activeView={view} selectedSociety={society} selectedClientType={clientType} settingsEntity={settingsEntity} onRefresh={()=>setRefreshKey(value=>value+1)} onNavigate={navigate} onNavigateSociety={(name)=>navigate('billing',name)} onNavigateClientType={(type)=>navigate('clients',null,type)} onNavigateSettings={(target)=>target==='admin'?navigate('admin'):navigate('master-data',null,null,target)}><Suspense fallback={<div role="status" className="card flex min-h-40 items-center gap-3 p-6" aria-label="A carregar módulo"><span className="size-5 animate-spin rounded-full border-2 border-secondary border-t-transparent" aria-hidden="true"/><div><p className="font-semibold">A abrir ecrã</p><p className="mt-1 text-sm text-text-secondary">O conteúdo está a ser preparado.</p></div></div>}><div key={refreshKey}>{content}</div></Suspense></AppShell>
}

export default function App() {
  if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('qa-iphone') === '1') {
    return <><AuthenticatedApplication /><PwaUpdateNotice /></>
  }
  return <><AuthGate><AuthenticatedApplication /></AuthGate><PwaUpdateNotice /></>
}
