import { WorkResultsProvider } from './features/work-entries/WorkResultsProvider'
import { RecordDialogHost } from './features/master-data/RecordDialogHost'
import { lazy, Suspense, useEffect, useState } from 'react'
import { AppShell } from './components/layout/AppShell'
import { PlaceholderPage } from './components/feedback/PlaceholderPage'
import type { ViewId } from './types/navigation'
import { AuthGate } from './features/auth/AuthGate'
import { PwaUpdateNotice } from './components/feedback/PwaUpdateNotice'
import { AuthContext, useAuth } from './features/auth/AuthContext'

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
const AccessLogsPage=lazy(()=>import('./features/admin/AccessLogsPage').then(module=>({default:module.AccessLogsPage})))
const MasterDataPage=lazy(()=>import('./features/master-data/MasterDataPage').then(module=>({default:module.MasterDataPage})))
const ProvisionsPage=lazy(()=>import('./features/clients/ProvisionsPage').then(module=>({default:module.ProvisionsPage})))
const RetainersPage=lazy(()=>import('./features/master-data/RetainersPage').then(module=>({default:module.RetainersPage})))
const NotesPage=lazy(()=>import('./features/notes/NotesPage').then(module=>({default:module.NotesPage})))
const CreateWorkEntryModal=lazy(()=>import('./features/work-entries/CreateWorkEntryModal').then(module=>({default:module.CreateWorkEntryModal})))

const validViews:ViewId[] = ['overview','work','notes','clients','retainers','provisions','billing','professionals','imports','import-review','master-data','admin','admin-users','admin-access-logs']
const restrictedViews:ViewId[]=['imports','import-review','admin','admin-users']
const ownerViews:ViewId[]=['admin-access-logs']
function readLocation() {
  const params = new URLSearchParams(window.location.search)
  const requested = params.get('view') as ViewId|null
  const requestedClientType=params.get('clientType')
  const requestedEntity=params.get('entity')
  return { view:requested && validViews.includes(requested) ? requested : 'overview' as ViewId, society:params.get('society'), professional:params.get('professional'), clientType:(requestedClientType==='individual'||requestedClientType==='company'||requestedClientType==='mixed'?requestedClientType:null) as 'individual'|'company'|'mixed'|null, clientMode:params.get('clientMode')==='list'?'list' as const:'dashboard' as const, settingsEntity:(requestedEntity==='clients'||requestedEntity==='billing_entities'||requestedEntity==='professionals'?requestedEntity:null) as 'clients'|'billing_entities'|'professionals'|null }
}

function overviewLocation() {
  const url=new URL(window.location.href)
  url.search=''
  url.searchParams.set('view','overview')
  window.history.replaceState({},'',url)
}

function buttonDescription(button:HTMLButtonElement){
  const text=(button.textContent??'').replace(/\s+/g,' ').trim(),label=button.getAttribute('aria-label')?.trim()
  if(label)return label
  if(/^Filtrar/.test(text)){const column=button.closest('th')?.querySelector('button span')?.textContent?.trim();return `Filtrar a tabela pelos valores${column?` da coluna ${column}`:''}.`}
  if(text==='Limpar filtros')return 'Remover a pesquisa e todos os filtros aplicados à tabela.'
  if(text.startsWith('Colunas'))return 'Escolher, ordenar e repor as colunas visíveis da tabela.'
  if(text==='XLSX')return 'Exportar para Excel todos os resultados que correspondem aos filtros actuais.'
  if(text==='Imprimir / PDF')return 'Imprimir ou guardar em PDF os resultados filtrados da tabela.'
  if(text==='Guardar PDF'||text==='A gerar PDF…')return 'Gerar e descarregar o PDF com os movimentos seleccionados.'
  if(text==='Tentar novamente')return 'Repetir a consulta que não foi possível concluir.'
  if(text.startsWith('Criar '))return `Abrir o formulário para ${text.toLocaleLowerCase('pt-PT')}.`
  if(text)return `Executar a acção «${text}».`
  return ''
}

export function AuthenticatedApplication() {
  const {role}=useAuth()
  const canManageSettings=role==='owner'||role==='admin'
  const [initial] = useState(()=>{const location=readLocation();if((restrictedViews.includes(location.view)&&!canManageSettings)||(ownerViews.includes(location.view)&&role!=='owner')){overviewLocation();return readLocation()}return location})
  const [view, setView] = useState<ViewId>(initial.view)
  const [society,setSociety] = useState<string|null>(initial.society)
  const [professional,setProfessional] = useState<string|null>(initial.professional)
  const [clientType,setClientType] = useState<'individual'|'company'|'mixed'|null>(initial.clientType)
  const [clientMode,setClientMode] = useState<'dashboard'|'list'>(initial.clientMode)
  const [settingsEntity,setSettingsEntity] = useState<'clients'|'billing_entities'|'professionals'|null>(initial.settingsEntity)
  const [refreshKey,setRefreshKey] = useState(0)
  const [creatingWorkEntry,setCreatingWorkEntry] = useState(false)
  useEffect(()=>{const apply=(root:ParentNode=document)=>{for(const button of root.querySelectorAll<HTMLButtonElement>('button')){if(button.title)continue;const description=buttonDescription(button);if(description){button.title=description;button.setAttribute('aria-description',description)}}};apply();const observer=new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes)if(node instanceof HTMLElement){if(node.matches('button'))apply(node.parentNode??document);else apply(node)}});observer.observe(document.body,{childList:true,subtree:true});return()=>observer.disconnect()},[])
  useEffect(()=>{const timer=window.setTimeout(()=>{void import('./features/work-entries/WorkEntriesPage').then(module=>module.prefetchWorkEntries()).catch(()=>undefined)},1200);return()=>window.clearTimeout(timer)},[])
  useEffect(() => { const sync=()=>{let location=readLocation();if((restrictedViews.includes(location.view)&&!canManageSettings)||(ownerViews.includes(location.view)&&role!=='owner')){overviewLocation();location=readLocation()}setView(location.view);setSociety(location.society);setProfessional(location.professional);setClientType(location.clientType);setClientMode(location.clientMode);setSettingsEntity(location.settingsEntity)}; window.addEventListener('popstate',sync); return()=>window.removeEventListener('popstate',sync) }, [canManageSettings,role])
  function navigate(nextView:ViewId,nextSociety:string|null=null,nextClientType:'individual'|'company'|'mixed'|null=null,nextEntity:'clients'|'billing_entities'|'professionals'|null=null,nextProfessional:string|null=null) {
    if((restrictedViews.includes(nextView)&&!canManageSettings)||(ownerViews.includes(nextView)&&role!=='owner')){nextView='overview';nextSociety=null;nextClientType=null;nextEntity=null;nextProfessional=null}
    const url=new URL(window.location.href); url.searchParams.set('view',nextView)
    if(nextSociety) url.searchParams.set('society',nextSociety); else url.searchParams.delete('society')
    if(nextClientType) url.searchParams.set('clientType',nextClientType); else url.searchParams.delete('clientType')
    if(nextEntity) url.searchParams.set('entity',nextEntity); else url.searchParams.delete('entity')
    if(nextProfessional) url.searchParams.set('professional',nextProfessional); else url.searchParams.delete('professional')
    url.searchParams.delete('clientMode'); url.searchParams.delete('record'); window.history.pushState({},'',url); setView(nextView); setSociety(nextSociety); setProfessional(nextProfessional); setClientType(nextClientType); setClientMode('dashboard'); setSettingsEntity(nextEntity)
  }
  function navigateClientSection(type:'individual'|'company'|'mixed',mode:'dashboard'|'list') { const url=new URL(window.location.href);url.search='';url.searchParams.set('view','clients');url.searchParams.set('clientType',type);if(mode==='list')url.searchParams.set('clientMode','list');window.history.pushState({},'',url);setView('clients');setSociety(null);setProfessional(null);setClientType(type);setClientMode(mode);setSettingsEntity(null) }
  let content: React.ReactNode
  if (view === 'overview') content = <OverviewPage />
  else if (view === 'work') content = <WorkEntriesPage canDelete={role==='owner'||role==='admin'||role==='manager'||role==='operator'} requiresReason={false} />
  else if (view === 'notes') content = <NotesPage />
  else if (view === 'clients') content = clientType?(clientMode==='list'?<MasterDataPage initialSection="clients" clientTypeFilter={clientType}/>:<EntityDashboard kind="client" aggregateClients clientCategory={clientType}/>):<ClientLandingPage onSelect={(type)=>navigateClientSection(type,'dashboard')} onRetainers={()=>navigate('retainers')}/>
  else if (view === 'provisions') content = <ProvisionsPage />
  else if (view === 'retainers') content = <RetainersPage />
  else if (view === 'billing') content = society?<EntityDashboard key={`billing-${society}`} kind="billing" initialSelectionLabel={society} />:<BillingLandingPage onSelect={(name)=>navigate('billing',name)}/>
  else if (view === 'professionals') content = professional?<EntityDashboard key={`professional-${professional}`} kind="professional" initialSelectionLabel={professional} />:<ProfessionalLandingPage onSelect={(name)=>navigate('professionals',null,null,null,name)}/>
  else if (view === 'imports') content = <ImportWizard />
  else if (view === 'import-review') content = <ImportReviewPage />
  else if (view === 'master-data') content = <MasterDataPage initialSection={settingsEntity??'clients'} />
  else if (view === 'admin') content = <AdminLandingPage onNavigate={navigate} />
  else if (view === 'admin-users') content = <AdminPage />
  else if (view === 'admin-access-logs') content = <AccessLogsPage />
  else content = <PlaceholderPage title="Módulo" description="Área em preparação." icon="warning" />
  return <AppShell activeView={view} selectedSociety={society} selectedProfessional={professional} selectedClientType={clientType} selectedClientMode={clientMode} settingsEntity={settingsEntity} onRefresh={()=>setRefreshKey(value=>value+1)} onCreateWorkEntry={()=>setCreatingWorkEntry(true)} onNavigate={navigate} onNavigateSociety={(name)=>navigate('billing',name)} onNavigateProfessional={(name)=>navigate('professionals',null,null,null,name)} onNavigateClientType={navigateClientSection} onNavigateRetainers={()=>navigate('retainers')} onNavigateSettings={(target)=>target==='admin'?navigate('admin'):navigate('master-data',null,null,target)}><Suspense fallback={<div role="status" className="card flex min-h-40 items-center gap-3 p-6" aria-label="A carregar módulo"><span className="size-5 animate-spin rounded-full border-2 border-secondary border-t-transparent" aria-hidden="true"/><div><p className="font-semibold">A abrir ecrã</p><p className="mt-1 text-sm text-text-secondary">O conteúdo está a ser preparado.</p></div></div>}><WorkResultsProvider key={refreshKey} enabled={["billing","clients","professionals"].includes(view)} contextKey={JSON.stringify([view,society,professional,clientType,clientMode])}>{content}</WorkResultsProvider>{creatingWorkEntry&&<CreateWorkEntryModal onClose={()=>setCreatingWorkEntry(false)} onCreated={()=>{setCreatingWorkEntry(false);setRefreshKey(value=>value+1)}}/>}</Suspense><RecordDialogHost/></AppShell>
}

export default function App() {
  const qaParams=new URLSearchParams(window.location.search)
  const qaEnabled=import.meta.env.DEV||import.meta.env.VITE_APP_ENV==='test'
  if (qaEnabled && qaParams.get('qa-iphone') === '1') {
    const qaRole=qaParams.get('qa-role')==='admin'?'admin':'operator'
    return <AuthContext.Provider value={{user:null,role:qaRole,signOut:async()=>undefined,updatePassword:async()=>false,enrollPasskey:async()=>''}}><AuthenticatedApplication /><PwaUpdateNotice /></AuthContext.Provider>
  }
  return <><AuthGate><AuthenticatedApplication /></AuthGate><PwaUpdateNotice /></>
}
