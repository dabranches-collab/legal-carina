import { useEffect, useState, type ReactNode } from 'react'
import { Icon, type IconName } from '../ui/Icon'
import type { NavigationItem, ViewId } from '../../types/navigation'
import { useAuth } from '../../features/auth/AuthContext'
import { InstallAppButton } from '../pwa/InstallAppButton'
import { supabase } from '../../lib/supabase'

const resultRows = <T,>(data: unknown): T[] => Array.isArray(data) ? data as T[] : []

const navigation: NavigationItem[] = [
  { id: 'overview', label: 'Visão Geral', icon: 'overview' },
  { id: 'clients', label: 'Clientes', icon: 'clients' },
  { id: 'billing', label: 'Sociedades', icon: 'building' }, { id: 'professionals', label: 'Responsáveis', icon: 'people' },
  { id: 'work', label: 'Registos', icon: 'clock' },
  { id: 'notes', label: 'Notas', icon: 'audit' },
  { id: 'admin', label: 'Definições', icon: 'admin' },
]

interface AppShellProps { activeView: ViewId; selectedSociety:string|null; selectedProfessional:string|null; selectedClientType:'individual'|'company'|'mixed'|null; selectedClientMode:'dashboard'|'list'; settingsEntity:'clients'|'billing_entities'|'professionals'|null; onRefresh:()=>void; onNavigate: (view: ViewId) => void; onNavigateSociety:(name:string)=>void; onNavigateProfessional:(name:string)=>void; onNavigateClientType:(type:'individual'|'company'|'mixed',mode:'dashboard'|'list')=>void; onNavigateRetainers:()=>void; onNavigateSettings:(target:'admin'|'clients'|'billing_entities'|'professionals')=>void; children: ReactNode }

export function AppShell({ activeView, selectedSociety, selectedProfessional, selectedClientType, selectedClientMode, settingsEntity, onRefresh, onNavigate, onNavigateSociety, onNavigateProfessional, onNavigateClientType, onNavigateRetainers, onNavigateSettings, children }: AppShellProps) {
  const { user, role, signOut } = useAuth()
  const canManageSettings=role==='owner'||role==='admin',canManageMasterData=canManageSettings||role==='operator'
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [refreshing,setRefreshing] = useState(false)
  const [theme,setTheme] = useState<'light'|'dark'>(()=>localStorage.getItem('carina-theme')==='dark'?'dark':'light')
  const [financialValuesVisible,setFinancialValuesVisible] = useState(()=>localStorage.getItem('carina-financial-values')!=='hidden')
  const [expandedMenu, setExpandedMenu] = useState<ViewId|null>(() => activeView==='retainers'?'clients':activeView==='billing'||activeView==='professionals'||activeView==='clients' ? activeView : activeView==='admin'||activeView==='admin-users'||activeView==='master-data'||activeView==='imports'||activeView==='import-review' ? 'admin' : null)
  const [administrationExpanded,setAdministrationExpanded]=useState(()=>activeView==='admin'||activeView==='admin-users'||activeView==='admin-access-logs'||activeView==='imports'||activeView==='import-review')
  const [billingSocieties,setBillingSocieties]=useState<string[]>([])
  const [professionalNames,setProfessionalNames]=useState<string[]>([])
  const [hasMixedClients,setHasMixedClients]=useState(false)
  const displayName = typeof user?.user_metadata?.display_name === 'string' && user.user_metadata.display_name.trim()
    ? user.user_metadata.display_name.trim()
    : typeof user?.user_metadata?.username === 'string' && user.user_metadata.username.trim()
      ? user.user_metadata.username.trim()
    : user?.email?.split('@')[0] ?? 'Utilizador'
  useEffect(() => setMobileOpen(false), [activeView])
  useEffect(()=>{
    const activeMenu=activeView==='retainers'?'clients':activeView==='billing'||activeView==='professionals'||activeView==='clients'
      ? activeView
      : activeView==='admin'||activeView==='admin-users'||activeView==='admin-access-logs'||activeView==='master-data'||activeView==='imports'||activeView==='import-review'
        ? 'admin'
        : null
    setExpandedMenu(activeMenu)
    setAdministrationExpanded(activeView==='admin'||activeView==='admin-users'||activeView==='admin-access-logs'||activeView==='imports'||activeView==='import-review')
  },[activeView])
  useEffect(()=>{document.documentElement.dataset.theme=theme;localStorage.setItem('carina-theme',theme)},[theme])
  useEffect(()=>{document.documentElement.dataset.financialValues=financialValuesVisible?'visible':'hidden';localStorage.setItem('carina-financial-values',financialValuesVisible?'visible':'hidden')},[financialValuesVisible])
  useEffect(()=>{const db=supabase;if(!db)return;let active=true;void(async()=>{const [societies,professionals,profiles]=await Promise.all([db.from('billing_entities').select('name').eq('active',true),db.from('professionals').select('display_name').eq('active',true),db.from('client_profiles').select('client_id,client_type').eq('active',true)]);if(active){setBillingSocieties(resultRows<{name?:string}>(societies.data).map(item=>item.name).filter((name):name is string=>Boolean(name)).sort((a,b)=>a.localeCompare(b,'pt-PT')));setProfessionalNames(resultRows<{display_name?:string}>(professionals.data).map(item=>item.display_name).filter((name):name is string=>Boolean(name)).sort((a,b)=>a.localeCompare(b,'pt-PT')));const types=new Map<string,Set<string>>();for(const profile of resultRows<{client_id:string;client_type:string}>(profiles.data)){const current=types.get(profile.client_id)??new Set<string>();current.add(profile.client_type);types.set(profile.client_id,current)}setHasMixedClients([...types.values()].some(value=>value.size>1))}})();return()=>{active=false}},[refreshing])
  const menuLabel=(name:string)=>name.toLocaleLowerCase('pt-PT').replace(/(^|[\s\-/])([\p{L}]+)/gu,(_,separator:string,word:string)=>separator+(separator&&['de','da','do','das','dos','e'].includes(word)?word:word.charAt(0).toLocaleUpperCase('pt-PT')+word.slice(1)))
  const currentLabel = activeView==='retainers'?'Clientes':activeView==='master-data'?'Definições':activeView==='admin-users'?'Utilizadores':activeView==='admin-access-logs'?'Registos de acesso':navigation.find(({ id }) => id === activeView)?.label ?? 'Carina - Legal'
  const isNavigationSelected = (id:ViewId) => activeView===id || (id==='clients'&&activeView==='retainers') || (id==='admin'&&(activeView==='admin-users'||activeView==='admin-access-logs'||activeView==='master-data'||activeView==='imports'||activeView==='import-review'))
  const subLabel = activeView==='retainers'?'Avenças':activeView==='billing'&&selectedSociety?menuLabel(selectedSociety):activeView==='professionals'&&selectedProfessional?menuLabel(selectedProfessional):activeView==='clients'&&selectedClientType?({individual:'Particulares',company:'Empresas',mixed:'Mistos'} as const)[selectedClientType]:activeView==='master-data'?(settingsEntity==='billing_entities'?'Sociedades':'Clientes'):activeView==='admin-users'?'Utilizadores':activeView==='admin-access-logs'?'Registos de acesso':activeView==='imports'?'Importações':activeView==='import-review'?'Revisão de importações':null
  const parentLabel = activeView==='master-data'||activeView==='admin'||activeView==='admin-users'||activeView==='admin-access-logs'||activeView==='imports'||activeView==='import-review'?'Definições':currentLabel
  const pageDescription: Partial<Record<ViewId,string>> = {
    overview:'Resumo global da actividade, facturação e acompanhamento.',
    clients:'Consulta e gestão dos clientes e respectivas vertentes.',
    notes:'Notas pessoais e partilhadas, listas, imagens e gravações de voz.',
    retainers:'Tratamento das condições, horas e facturação das avenças.',
    billing:'Análise e acompanhamento por sociedade.',
    professionals:'Análise e acompanhamento por responsável.',
    work:'Consulta, filtragem e edição dos registos de trabalho.',
    admin:'Configuração e administração da plataforma.',
    'admin-users':'Gestão dos utilizadores e respectivos perfis.',
    'admin-access-logs':'Consulta exclusiva do proprietário ao histórico de entradas.',
    'master-data':'Gestão dos dados base utilizados na plataforma.',
    imports:'Importação e reconciliação de movimentos.',
    'import-review':'Revisão das ocorrências detectadas nas importações.',
  }
  const activeNavigation = navigation.find(({id})=>id===activeView)
  const locationLevels: Array<{label:string;icon:IconName}> = activeView==='admin-access-logs'
    ? [{label:'Definições',icon:'admin'},{label:'Administração',icon:'admin'},{label:'Registos de acesso',icon:'audit'}]
    : activeView==='admin-users'
    ? [{label:'Definições',icon:'admin'},{label:'Administração',icon:'admin'},{label:'Utilizadores',icon:'people'}]
    : activeView==='imports'
      ? [{label:'Definições',icon:'admin'},{label:'Administração',icon:'admin'},{label:'Importações',icon:'import'}]
      : activeView==='import-review'
        ? [{label:'Definições',icon:'admin'},{label:'Administração',icon:'admin'},{label:'Revisão de importações',icon:'audit'}]
        : activeView==='master-data'
          ? [{label:'Definições',icon:'admin'},{label:settingsEntity==='billing_entities'?'Sociedades':'Clientes',icon:settingsEntity==='billing_entities'?'building':'clients'}]
          : [{label:parentLabel,icon:activeNavigation?.icon??(activeView==='billing'?'building':'overview')},...(subLabel&&subLabel!==parentLabel?[{label:subLabel,icon:activeView==='clients'?'clients':activeView==='professionals'?'people':'building'} as {label:string;icon:IconName}]:[])]
  const refreshData=()=>{setRefreshing(true);onRefresh();window.setTimeout(()=>setRefreshing(false),500)}

  return (
    <div className="min-h-screen bg-background text-text-primary">
      {mobileOpen && <button className="app-safe-fixed fixed z-30 bg-navigation/35 lg:hidden" aria-label="Fechar navegação" onClick={() => setMobileOpen(false)} />}
      <aside aria-label="Navegação principal" className={`app-shell-sidebar fixed inset-y-0 left-0 z-40 flex flex-col border-r border-border bg-navigation text-navigation-text transition-[width,transform] duration-200 ${collapsed ? 'lg:w-20' : 'lg:w-64'} w-[min(18rem,calc(100vw-var(--safe-right)))] ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex h-18 items-center gap-3 border-b border-surface/10 px-5">
          <div className="grid size-9 shrink-0 place-items-center rounded-lg border border-accent/50 bg-surface/5 font-display text-xl font-semibold text-accent">CS</div>
          {!collapsed && <div className="min-w-0 flex-1 text-accent"><p className="whitespace-nowrap font-display text-base font-semibold leading-none">Carina - Legal</p><p className="mt-1 whitespace-nowrap text-[0.6rem] uppercase tracking-[0.14em] text-accent/75">Gestão de clientes</p></div>}
          <button className="ml-auto hidden size-8 place-items-center rounded-lg text-navigation-text/70 hover:bg-surface/10 hover:text-navigation-text lg:grid" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? 'Expandir navegação' : 'Recolher navegação'} aria-expanded={!collapsed}>
            <Icon name="chevron" className={`size-4 transition-transform ${collapsed ? '' : 'rotate-180'}`} />
          </button>
        </div>
        <nav className="scrollbar-thin flex flex-1 flex-col overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {navigation.filter(item=>item.id!=='admin'||canManageMasterData).map((item) => {const selected=isNavigationSelected(item.id);const hasSubmenu=item.id==='billing'||item.id==='professionals'||item.id==='clients'||item.id==='admin';const expanded=expandedMenu===item.id;return <li key={item.id}><button type="button" title={collapsed ? menuLabel(item.label) : undefined} onClick={() => { if(hasSubmenu)setExpandedMenu(value=>value===item.id?null:item.id);else setExpandedMenu(null);onNavigate(item.id==='admin'&&!canManageSettings?'master-data':item.id) }} aria-current={selected ? 'page' : undefined} aria-expanded={hasSubmenu?expanded:undefined}
              className={`flex min-h-10 w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors ${selected ? 'border-accent bg-accent font-semibold text-navigation shadow-sm' : 'border-accent/35 bg-surface/5 text-accent/85 hover:border-accent/60 hover:bg-surface/10 hover:text-accent'}`}>
              <Icon name={item.icon} className={`size-5 shrink-0 ${selected ? 'text-navigation' : 'text-accent/80'}`} />{!collapsed && <><span className="flex-1">{menuLabel(item.label)}</span>{hasSubmenu&&<span className={`grid size-6 shrink-0 place-items-center rounded-full border ${selected?'border-navigation/30 bg-navigation/10':'border-accent/50 bg-accent/10'}`}><Icon name="chevron" className={`size-4 stroke-[2.5] transition-transform ${expanded?'rotate-90':'lg:rotate-90'}`}/></span>}</>}
            </button>
            {item.id==='billing'&&!collapsed&&<ul className={`mb-2 ml-4 mt-1 space-y-1 ${expanded?'':'hidden lg:block'}`} aria-label="Sociedades">{billingSocieties.map(name=>{const selectedSub=activeView==='billing'&&selectedSociety===name;return <li key={name}><button type="button" onClick={()=>onNavigateSociety(name)} aria-current={selectedSub?'page':undefined} className={`min-h-9 w-full rounded-md border px-2 py-1 text-left text-xs normal-case transition-colors ${selectedSub?'border-accent bg-accent font-semibold text-navigation':'border-accent/30 bg-surface/5 text-accent/80 hover:border-accent/60 hover:bg-surface/10 hover:text-accent'}`}>{menuLabel(name)}</button></li>})}</ul>}
            {item.id==='professionals'&&!collapsed&&<ul className={`mb-2 ml-4 mt-1 space-y-1 ${expanded?'':'hidden lg:block'}`} aria-label="Responsáveis">{professionalNames.map(name=>{const selectedSub=activeView==='professionals'&&selectedProfessional===name;return <li key={name}><button type="button" onClick={()=>onNavigateProfessional(name)} aria-current={selectedSub?'page':undefined} className={`min-h-9 w-full rounded-md border px-2 py-1 text-left text-xs normal-case transition-colors ${selectedSub?'border-accent bg-accent font-semibold text-navigation':'border-accent/30 bg-surface/5 text-accent/80 hover:border-accent/60 hover:bg-surface/10 hover:text-accent'}`}>{menuLabel(name)}</button></li>})}</ul>}
            {item.id==='clients'&&!collapsed&&<ul className={`mb-2 ml-4 mt-1 space-y-1 ${expanded?'':'hidden lg:block'}`} aria-label="Tipos de Cliente">{([['individual','Particulares'],['company','Empresas'],...(hasMixedClients?[['mixed','Mistos'] as const]:[])] as const).map(([type,label])=>{const selectedSub=activeView==='clients'&&selectedClientType===type;return <li key={type}><button type="button" onClick={()=>onNavigateClientType(type,'dashboard')} aria-expanded={selectedSub} aria-current={selectedSub?'page':undefined} className={`flex min-h-9 w-full items-center rounded-md border px-2 py-1 text-left text-xs transition-colors ${selectedSub?'border-accent bg-accent font-semibold text-navigation':'border-accent/30 bg-surface/5 text-accent/80 hover:border-accent/60 hover:bg-surface/10 hover:text-accent'}`}><span className="flex-1">{label}</span><Icon name="chevron" className={`size-3.5 transition-transform ${selectedSub?'rotate-90':'lg:rotate-90'}`}/></button><ul className={`ml-3 mt-1 space-y-1 ${selectedSub?'':'hidden lg:block'}`} aria-label={`${label}: Vistas`}><li><button type="button" onClick={()=>onNavigateClientType(type,'list')} aria-current={selectedSub&&selectedClientMode==='list'?'page':undefined} className={`min-h-8 w-full rounded-md border px-2 py-1 text-left text-[0.7rem] ${selectedSub&&selectedClientMode==='list'?'border-accent bg-accent/90 font-semibold text-navigation':'border-accent/25 bg-surface/5 text-accent/75 hover:border-accent/50'}`}>Lista</button></li></ul></li>})}<li><button type="button" onClick={onNavigateRetainers} aria-current={activeView==='retainers'?'page':undefined} className={`min-h-9 w-full rounded-md border px-2 py-1 text-left text-xs transition-colors ${activeView==='retainers'?'border-accent bg-accent font-semibold text-navigation':'border-accent/30 bg-surface/5 text-accent/80 hover:border-accent/60 hover:bg-surface/10 hover:text-accent'}`}>Avenças</button></li></ul>}
            {item.id==='admin'&&!collapsed&&<ul className={`mb-2 ml-4 mt-1 space-y-1 ${expanded?'':'hidden lg:block'}`} aria-label="Definições">
              {canManageSettings&&<li><button type="button" onClick={()=>{setAdministrationExpanded(value=>!value);onNavigate('admin')}} aria-expanded={administrationExpanded} aria-current={(activeView==='admin'||activeView==='admin-users'||activeView==='admin-access-logs'||activeView==='imports'||activeView==='import-review')?'page':undefined} className={`flex min-h-9 w-full items-center rounded-md border px-2 py-1 text-left text-xs transition-colors ${(activeView==='admin'||activeView==='admin-users'||activeView==='admin-access-logs'||activeView==='imports'||activeView==='import-review')?'border-accent bg-accent font-semibold text-navigation':'border-accent/30 bg-surface/5 text-accent/80 hover:border-accent/60 hover:bg-surface/10 hover:text-accent'}`}><span className="flex-1">Administração</span><Icon name="chevron" className={`size-4 transition-transform ${administrationExpanded?'rotate-90':''}`}/></button>
                <ul className={`ml-4 mt-1 space-y-1 ${administrationExpanded?'':'hidden lg:block'}`} aria-label="Administração"><li><button type="button" onClick={()=>onNavigate('admin-users')} aria-current={activeView==='admin-users'?'page':undefined} className={`min-h-9 w-full rounded-md border px-2 py-1 text-left text-xs ${activeView==='admin-users'?'border-accent bg-accent font-semibold text-primary':'border-accent/25 bg-surface/5 text-accent/75'}`}>Utilizadores</button></li>{role==='owner'&&<li><button type="button" onClick={()=>onNavigate('admin-access-logs')} aria-current={activeView==='admin-access-logs'?'page':undefined} className={`min-h-9 w-full rounded-md border px-2 py-1 text-left text-xs ${activeView==='admin-access-logs'?'border-accent bg-accent font-semibold text-primary':'border-accent/25 bg-surface/5 text-accent/75'}`}>Registos de acesso</button></li>}<li><button type="button" onClick={()=>onNavigate('imports')} aria-current={activeView==='imports'?'page':undefined} className={`min-h-9 w-full rounded-md border px-2 py-1 text-left text-xs ${activeView==='imports'?'border-accent bg-accent font-semibold text-primary':'border-accent/25 bg-surface/5 text-accent/75'}`}>Importações</button></li><li><button type="button" onClick={()=>onNavigate('import-review')} aria-current={activeView==='import-review'?'page':undefined} className={`min-h-9 w-full rounded-md border px-2 py-1 text-left text-xs ${activeView==='import-review'?'border-accent bg-accent font-semibold text-primary':'border-accent/25 bg-surface/5 text-accent/75'}`}>Revisão de Importações</button></li></ul>
              </li>}
              {([['clients','Clientes'],['billing_entities','Sociedades'],['professionals','Responsáveis']] as const).map(([target,label])=>{const selectedSub=activeView==='master-data'&&settingsEntity===target;return <li key={target}><button type="button" onClick={()=>onNavigateSettings(target)} aria-current={selectedSub?'page':undefined} className={`min-h-9 w-full rounded-md border px-2 py-1 text-left text-xs transition-colors ${selectedSub?'border-accent bg-accent font-semibold text-navigation':'border-accent/30 bg-surface/5 text-accent/80 hover:border-accent/60 hover:bg-surface/10 hover:text-accent'}`}>{label}</button></li>})}
            </ul>}
            </li>})}
          </ul>
        </nav>
        {!collapsed && <div className="sidebar-justice pointer-events-none flex h-24 shrink-0 translate-y-2 items-end justify-center px-5 py-2 sm:h-32 lg:h-64 lg:translate-y-0 lg:items-center lg:py-3" aria-hidden="true">
          <div
            className="h-full w-full max-w-28 bg-accent opacity-80 lg:max-w-52"
            style={{
              WebkitMaskImage: 'url(/brand/lady-justice-bust-a.png)',
              maskImage: 'url(/brand/lady-justice-bust-a.png)',
              WebkitMaskPosition: 'center',
              maskPosition: 'center',
              WebkitMaskRepeat: 'no-repeat',
              maskRepeat: 'no-repeat',
              WebkitMaskSize: 'contain',
              maskSize: 'contain',
            }}
          />
        </div>}
        <div className="space-y-1 border-t border-surface/10 p-3"><InstallAppButton collapsed={collapsed}/><button type="button" onClick={() => void signOut()} className={`flex min-h-10 w-full items-center rounded-lg border border-accent/35 bg-surface/5 px-3 text-sm font-medium text-accent/85 transition hover:border-danger/60 hover:bg-danger/15 hover:text-navigation-text ${collapsed?'justify-center':'gap-3'}`} aria-label="Terminar sessão"><Icon name="logout" className="size-5 shrink-0"/>{!collapsed&&<span>Terminar sessão</span>}</button></div>
        <div className="border-t border-surface/10 p-3"><div className={`flex items-center gap-3 rounded-lg bg-surface/5 p-2 ${collapsed ? 'justify-center' : ''}`}>
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-sm font-semibold">{displayName.split(/\s+/).map(part=>part[0]).join('').slice(0,2).toUpperCase()}</span>
          {!collapsed && <div className="min-w-0"><p className="truncate text-sm font-semibold">{displayName}</p><p className="truncate text-xs text-navigation-text/65">Sessão protegida</p></div>}
        </div>{!collapsed && <p className="mt-2 text-center text-[0.65rem] tracking-wider text-navigation-text/60">Versão {__APP_VERSION__}</p>}</div>
      </aside>

      <div className={`transition-[padding] duration-200 ${collapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
        <header className="app-shell-header sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b border-accent/30 bg-navigation text-navigation-text shadow-sm sm:flex-nowrap sm:gap-4">
          <button className="grid size-10 place-items-center rounded-lg border border-accent/40 bg-surface/5 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Abrir navegação"><Icon name="menu" className="size-5" /></button>
          <nav aria-label="Localização" className="order-last min-w-0 basis-full pb-2 sm:order-none sm:flex-1 sm:basis-auto sm:py-2"><ol className="space-y-0.5">{locationLevels.map((level,index)=><li key={`${level.label}-${index}`} aria-current={index===locationLevels.length-1?'page':undefined} className={`flex min-w-0 items-center gap-2 ${index===0?'font-display text-2xl font-semibold leading-tight sm:text-3xl':index===1?'text-sm font-semibold leading-tight text-accent/90':'text-xs font-medium leading-tight text-accent/75'}`}><Icon name={level.icon} className={`${index===0?'size-6':'size-3.5'} shrink-0`}/><span className="truncate">{level.label}</span></li>)}<li className="truncate pl-8 text-[0.68rem] leading-tight text-accent/65">{pageDescription[activeView] ?? 'Área de trabalho da plataforma.'}</li></ol></nav>
          <button type="button" aria-pressed={!financialValuesVisible} onClick={()=>setFinancialValuesVisible(value=>!value)} className="grid size-10 place-items-center rounded-lg border border-accent/40 bg-surface/5 hover:bg-surface/10" aria-label={financialValuesVisible?'Ocultar valores financeiros':'Mostrar valores financeiros'} title={financialValuesVisible?'Ocultar valores financeiros':'Mostrar valores financeiros'}><Icon name={financialValuesVisible?'eye':'eyeOff'} className="size-5"/></button>
          <button type="button" onClick={()=>setTheme(value=>value==='light'?'dark':'light')} className="grid size-10 place-items-center rounded-lg border border-accent/40 bg-surface/5 hover:bg-surface/10" aria-label={theme==='light'?'Activar modo escuro':'Activar modo claro'} title={theme==='light'?'Modo escuro':'Modo claro'}><Icon name={theme==='light'?'moon':'sun'} className="size-5"/></button>
          <button type="button" onClick={refreshData} disabled={refreshing} className="grid size-10 place-items-center rounded-lg border border-accent/40 bg-surface/5 hover:bg-surface/10 disabled:opacity-60" aria-label="Actualizar dados apresentados" title="Actualizar dados"><Icon name="refresh" className={`size-5 ${refreshing?'animate-spin':''}`}/></button>
          <div className="grid size-10 place-items-center rounded-full border border-accent/50 bg-secondary text-xs font-semibold text-navigation-text" title={displayName}>{displayName.split(/\s+/).map(part=>part[0]).join('').slice(0,2).toUpperCase()}</div>
        </header>
        <main id="main-content" className="app-shell-main py-4 sm:py-5">
          {children}
        </main>
      </div>
    </div>
  )
}
