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
const BillingLandingPage=lazy(()=>import('./features/entities/BillingLandingPage').then(module=>({default:module.BillingLandingPage})))
const ProfessionalLandingPage=lazy(()=>import('./features/entities/ProfessionalLandingPage').then(module=>({default:module.ProfessionalLandingPage})))
const ImportWizard=lazy(()=>import('./features/imports/ImportWizard').then(module=>({default:module.ImportWizard})))
const ImportReviewPage=lazy(()=>import('./features/imports/ImportReviewPage').then(module=>({default:module.ImportReviewPage})))
const AdminPage=lazy(()=>import('./features/admin/AdminPage').then(module=>({default:module.AdminPage})))
const AdminLandingPage=lazy(()=>import('./features/admin/AdminLandingPage').then(module=>({default:module.AdminLandingPage})))
const MasterDataPage=lazy(()=>import('./features/master-data/MasterDataPage').then(module=>({default:module.MasterDataPage})))

const validViews:ViewId[] = ['overview','work','clients','billing','professionals','imports','import-review','master-data','admin','admin-users']
function readLocation() {
  const params = new URLSearchParams(window.location.search)
  const requested = params.get('view') as ViewId|null
  const requestedClientType=params.get('clientType')
  const requestedEntity=params.get('entity')
  return { view:requested && validViews.includes(requested) ? requested : 'overview' as ViewId, society:params.get('society'), professional:params.get('professional'), clientType:(requestedClientType==='individual'||requestedClientType==='company'||requestedClientType==='mixed'?requestedClientType:null) as 'individual'|'company'|'mixed'|null, clientMode:params.get('clientMode')==='list'?'list' as const:'dashboard' as const, settingsEntity:(requestedEntity==='clients'||requestedEntity==='billing_entities'?requestedEntity:null) as 'clients'|'billing_entities'|null }
}

function isStandaloneLaunch() {
  return Boolean(window.matchMedia?.('(display-mode: standalone)').matches) || Boolean((navigator as Navigator & {standalone?:boolean}).standalone)
}

function overviewLocation() {
  const url=new URL(window.location.href)
  url.search=''
  url.searchParams.set('view','overview')
  window.history.replaceState({},'',url)
}

export function AuthenticatedApplication() {
  const [initial] = useState(()=>{if(isStandaloneLaunch()&&new URLSearchParams(window.location.search).get('view')!=='overview')overviewLocation();return readLocation()})
  const [view, setView] = useState<ViewId>(initial.view)
  const [society,setSociety] = useState<string|null>(initial.society)
  const [professional,setProfessional] = useState<string|null>(initial.professional)
  const [clientType,setClientType] = useState<'individual'|'company'|'mixed'|null>(initial.clientType)
  const [clientMode,setClientMode] = useState<'dashboard'|'list'>(initial.clientMode)
  const [settingsEntity,setSettingsEntity] = useState<'clients'|'billing_entities'|null>(initial.settingsEntity)
  const [refreshKey,setRefreshKey] = useState(0)
  useEffect(() => { const sync=()=>{const location=readLocation();setView(location.view);setSociety(location.society);setProfessional(location.professional);setClientType(location.clientType);setClientMode(location.clientMode);setSettingsEntity(location.settingsEntity)}; window.addEventListener('popstate',sync); return()=>window.removeEventListener('popstate',sync) }, [])
  function navigate(nextView:ViewId,nextSociety:string|null=null,nextClientType:'individual'|'company'|'mixed'|null=null,nextEntity:'clients'|'billing_entities'|null=null,nextProfessional:string|null=null) {
    const url=new URL(window.location.href); url.searchParams.set('view',nextView)
    if(nextSociety) url.searchParams.set('society',nextSociety); else url.searchParams.delete('society')
    if(nextClientType) url.searchParams.set('clientType',nextClientType); else url.searchParams.delete('clientType')
    if(nextEntity) url.searchParams.set('entity',nextEntity); else url.searchParams.delete('entity')
    if(nextProfessional) url.searchParams.set('professional',nextProfessional); else url.searchParams.delete('professional')
    url.searchParams.delete('clientMode'); window.history.pushState({},'',url); setView(nextView); setSociety(nextSociety); setProfessional(nextProfessional); setClientType(nextClientType); setClientMode('dashboard'); setSettingsEntity(nextEntity)
  }
  function navigateClientSection(type:'individual'|'company'|'mixed',mode:'dashboard'|'list') { const url=new URL(window.location.href);url.search='';url.searchParams.set('view','clients');url.searchParams.set('clientType',type);if(mode==='list')url.searchParams.set('clientMode','list');window.history.pushState({},'',url);setView('clients');setSociety(null);setProfessional(null);setClientType(type);setClientMode(mode);setSettingsEntity(null) }
  let content: React.ReactNode
  if (view === 'overview') content = <OverviewPage />
  else if (view === 'work') content = <WorkEntriesPage />
  else if (view === 'clients') content = clientType?(clientMode==='list'?<MasterDataPage initialSection="clients" clientTypeFilter={clientType}/>:<EntityDashboard kind="client" aggregateClients clientCategory={clientType}/>):<ClientLandingPage onSelect={(type)=>navigateClientSection(type,'dashboard')}/>
  else if (view === 'billing') content = society?<EntityDashboard kind="billing" initialSelectionLabel={society} />:<BillingLandingPage onSelect={(name)=>navigate('billing',name)}/>
  else if (view === 'professionals') content = professional?<EntityDashboard kind="professional" initialSelectionLabel={professional} />:<ProfessionalLandingPage onSelect={(name)=>navigate('professionals',null,null,null,name)}/>
  else if (view === 'imports') content = <ImportWizard />
  else if (view === 'import-review') content = <ImportReviewPage />
  else if (view === 'master-data') content = <MasterDataPage initialSection={settingsEntity??'clients'} />
  else if (view === 'admin') content = <AdminLandingPage onNavigate={navigate} />
  else if (view === 'admin-users') content = <AdminPage />
  else content = <PlaceholderPage title="Módulo" description="Área em preparação." icon="warning" />
  return <AppShell activeView={view} selectedSociety={society} selectedProfessional={professional} selectedClientType={clientType} selectedClientMode={clientMode} settingsEntity={settingsEntity} onRefresh={()=>setRefreshKey(value=>value+1)} onNavigate={navigate} onNavigateSociety={(name)=>navigate('billing',name)} onNavigateProfessional={(name)=>navigate('professionals',null,null,null,name)} onNavigateClientType={navigateClientSection} onNavigateSettings={(target)=>target==='admin'?navigate('admin'):navigate('master-data',null,null,target)}><Suspense fallback={<div role="status" className="card flex min-h-40 items-center gap-3 p-6" aria-label="A carregar módulo"><span className="size-5 animate-spin rounded-full border-2 border-secondary border-t-transparent" aria-hidden="true"/><div><p className="font-semibold">A abrir ecrã</p><p className="mt-1 text-sm text-text-secondary">O conteúdo está a ser preparado.</p></div></div>}><div key={refreshKey}>{content}</div></Suspense></AppShell>
}

export default function App() {
  if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('qa-iphone') === '1') {
    return <><AuthenticatedApplication /><PwaUpdateNotice /></>
  }
  return <><AuthGate><AuthenticatedApplication /></AuthGate><PwaUpdateNotice /></>
}
