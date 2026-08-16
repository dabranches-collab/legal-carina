import { useEffect, useState, type ReactNode } from 'react'
import { Icon, type IconName } from '../ui/Icon'
import type { NavigationItem, ViewId } from '../../types/navigation'
import { useAuth } from '../../features/auth/AuthContext'
import { InstallAppButton } from '../pwa/InstallAppButton'
import { supabase } from '../../lib/supabase'

const navigation: NavigationItem[] = [
  { id: 'overview', label: 'Visão geral', icon: 'overview' }, { id: 'work', label: 'Registos de trabalho', icon: 'clock' },
  { id: 'clients', label: 'Clientes', icon: 'clients' },
  { id: 'billing', label: 'Sociedades', icon: 'building' }, { id: 'professionals', label: 'Responsáveis', icon: 'people' },
  { id: 'admin', label: 'Definições', icon: 'admin' },
]

const constructionItems: NavigationItem[] = [
  { id:'matters', label:'Processos', icon:'matters' }, { id:'invoices', label:'Facturação', icon:'invoice' },
  { id:'payments', label:'Recebimentos', icon:'payment' }, { id:'pricing', label:'Regras de preços', icon:'rules' },
  { id:'reports', label:'Relatórios', icon:'reports' }, { id:'audit', label:'Auditoria', icon:'audit' },
]

interface AppShellProps { activeView: ViewId; selectedSociety:string|null; selectedClientType:'individual'|'company'|'mixed'|null; settingsEntity:'clients'|'billing_entities'|null; onRefresh:()=>void; onNavigate: (view: ViewId) => void; onNavigateSociety:(name:string)=>void; onNavigateClientType:(type:'individual'|'company'|'mixed')=>void; onNavigateSettings:(target:'admin'|'clients'|'billing_entities')=>void; children: ReactNode }

export function AppShell({ activeView, selectedSociety, selectedClientType, settingsEntity, onRefresh, onNavigate, onNavigateSociety, onNavigateClientType, onNavigateSettings, children }: AppShellProps) {
  const { user, signOut } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [refreshing,setRefreshing] = useState(false)
  const [theme,setTheme] = useState<'light'|'dark'>(()=>localStorage.getItem('carina-theme')==='dark'?'dark':'light')
  const [financialValuesVisible,setFinancialValuesVisible] = useState(()=>localStorage.getItem('carina-financial-values')!=='hidden')
  const [expandedMenu, setExpandedMenu] = useState<ViewId|'construction'|null>(() => constructionItems.some(item=>item.id===activeView)?'construction':activeView==='overview'||activeView==='clients' ? activeView : activeView==='admin'||activeView==='admin-users'||activeView==='master-data'||activeView==='imports'||activeView==='import-review' ? 'admin' : null)
  const [administrationExpanded,setAdministrationExpanded]=useState(()=>activeView==='admin'||activeView==='admin-users'||activeView==='imports'||activeView==='import-review')
  const [billingSocieties,setBillingSocieties]=useState<string[]>([])
  const displayName = typeof user?.user_metadata?.display_name === 'string' && user.user_metadata.display_name.trim()
    ? user.user_metadata.display_name.trim()
    : typeof user?.user_metadata?.username === 'string' && user.user_metadata.username.trim()
      ? user.user_metadata.username.trim()
    : user?.email?.split('@')[0] ?? 'Utilizador'
  useEffect(() => setMobileOpen(false), [activeView])
  useEffect(()=>{document.documentElement.dataset.theme=theme;localStorage.setItem('carina-theme',theme)},[theme])
  useEffect(()=>{document.documentElement.dataset.financialValues=financialValuesVisible?'visible':'hidden';localStorage.setItem('carina-financial-values',financialValuesVisible?'visible':'hidden')},[financialValuesVisible])
  useEffect(()=>{const db=supabase;if(!db)return;let active=true;void(async()=>{const {data}=await db.from('billing_entities').select('name').eq('active',true);if(active)setBillingSocieties((data??[]).map(item=>item.name).filter((name):name is string=>Boolean(name)).sort((a,b)=>a.localeCompare(b,'pt-PT')))})();return()=>{active=false}},[refreshing])
  const currentLabel = activeView==='master-data'?'Definições':activeView==='admin-users'?'Utilizadores':[...navigation,...constructionItems].find(({ id }) => id === activeView)?.label ?? 'Carina - Legal'
  const isNavigationSelected = (id:ViewId) => (id==='overview'&&Boolean(selectedSociety)) || (id==='clients'&&activeView==='clients') || (id==='admin'&&(activeView==='admin'||activeView==='admin-users'||activeView==='master-data'||activeView==='imports'||activeView==='import-review')) || (activeView===id&&!(id==='billing'&&Boolean(selectedSociety)))
  const subLabel = activeView==='billing'&&selectedSociety?selectedSociety:activeView==='clients'&&selectedClientType?({individual:'Particulares',company:'Empresas',mixed:'Mistos'} as const)[selectedClientType]:activeView==='master-data'?(settingsEntity==='billing_entities'?'Sociedades':'Clientes'):activeView==='admin-users'?'Utilizadores':activeView==='imports'?'Importações':activeView==='import-review'?'Revisão de importações':null
  const parentLabel = activeView==='master-data'||activeView==='admin'||activeView==='admin-users'||activeView==='imports'||activeView==='import-review'?'Definições':currentLabel
  const activeNavigation = [...navigation,...constructionItems].find(({id})=>id===activeView)
  const locationLevels: Array<{label:string;icon:IconName}> = activeView==='admin-users'
    ? [{label:'Definições',icon:'admin'},{label:'Administração',icon:'admin'},{label:'Utilizadores',icon:'people'}]
    : activeView==='imports'
      ? [{label:'Definições',icon:'admin'},{label:'Administração',icon:'admin'},{label:'Importações',icon:'import'}]
      : activeView==='import-review'
        ? [{label:'Definições',icon:'admin'},{label:'Administração',icon:'admin'},{label:'Revisão de importações',icon:'audit'}]
        : activeView==='master-data'
          ? [{label:'Definições',icon:'admin'},{label:settingsEntity==='billing_entities'?'Sociedades':'Clientes',icon:settingsEntity==='billing_entities'?'building':'clients'}]
          : constructionItems.some(item=>item.id===activeView)
            ? [{label:'Em construção',icon:'warning'},{label:currentLabel,icon:activeNavigation?.icon??'warning'}]
            : [{label:parentLabel,icon:activeNavigation?.icon??(activeView==='billing'?'building':'overview')},...(subLabel&&subLabel!==parentLabel?[{label:subLabel,icon:activeView==='clients'?'clients':'building'} as {label:string;icon:IconName}]:[])]
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
        <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {navigation.map((item) => {const selected=isNavigationSelected(item.id);const hasSubmenu=item.id==='overview'||item.id==='clients'||item.id==='admin';const expanded=expandedMenu===item.id;return <li key={item.id}><button type="button" title={collapsed ? item.label : undefined} onClick={() => { if(hasSubmenu)setExpandedMenu(value=>value===item.id?null:item.id);else setExpandedMenu(null);onNavigate(item.id) }} aria-current={selected ? 'page' : undefined} aria-expanded={hasSubmenu?expanded:undefined}
              className={`flex min-h-10 w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors ${selected ? 'border-accent bg-accent font-semibold text-navigation shadow-sm' : 'border-accent/35 bg-surface/5 text-accent/85 hover:border-accent/60 hover:bg-surface/10 hover:text-accent'}`}>
              <Icon name={item.icon} className={`size-5 shrink-0 ${selected ? 'text-navigation' : 'text-accent/80'}`} />{!collapsed && <><span className="flex-1">{item.label}</span>{hasSubmenu&&<span className={`grid size-6 shrink-0 place-items-center rounded-full border ${selected?'border-navigation/30 bg-navigation/10':'border-accent/50 bg-accent/10'}`}><Icon name="chevron" className={`size-4 stroke-[2.5] transition-transform ${expanded?'rotate-90':''}`}/></span>}</>}
            </button>
            {item.id==='overview'&&!collapsed&&expanded&&<ul className="mb-2 ml-4 mt-1 space-y-1" aria-label="Sociedades">{billingSocieties.map(name=>{const selectedSub=activeView==='billing'&&selectedSociety===name;return <li key={name}><button type="button" onClick={()=>onNavigateSociety(name)} aria-current={selectedSub?'page':undefined} className={`min-h-9 w-full rounded-md border px-2 py-1 text-left text-xs transition-colors ${selectedSub?'border-accent bg-accent font-semibold text-navigation':'border-accent/30 bg-surface/5 text-accent/80 hover:border-accent/60 hover:bg-surface/10 hover:text-accent'}`}>{name}</button></li>})}</ul>}
            {item.id==='clients'&&!collapsed&&expanded&&<ul className="mb-2 ml-4 mt-1 space-y-1" aria-label="Tipos de cliente">{([['individual','Particulares'],['company','Empresas'],['mixed','Mistos']] as const).map(([type,label])=>{const selectedSub=selectedClientType===type;return <li key={type}><button type="button" onClick={()=>onNavigateClientType(type)} aria-current={selectedSub?'page':undefined} className={`min-h-9 w-full rounded-md border px-2 py-1 text-left text-xs transition-colors ${selectedSub?'border-accent bg-accent font-semibold text-navigation':'border-accent/30 bg-surface/5 text-accent/80 hover:border-accent/60 hover:bg-surface/10 hover:text-accent'}`}>{label}</button></li>})}</ul>}
            {item.id==='admin'&&!collapsed&&expanded&&<ul className="mb-2 ml-4 mt-1 space-y-1" aria-label="Definições">
              <li><button type="button" onClick={()=>{setAdministrationExpanded(value=>!value);onNavigate('admin')}} aria-expanded={administrationExpanded} aria-current={(activeView==='admin'||activeView==='admin-users'||activeView==='imports'||activeView==='import-review')?'page':undefined} className={`flex min-h-9 w-full items-center rounded-md border px-2 py-1 text-left text-xs transition-colors ${(activeView==='admin'||activeView==='admin-users'||activeView==='imports'||activeView==='import-review')?'border-accent bg-accent font-semibold text-navigation':'border-accent/30 bg-surface/5 text-accent/80 hover:border-accent/60 hover:bg-surface/10 hover:text-accent'}`}><span className="flex-1">Administração</span><Icon name="chevron" className={`size-4 transition-transform ${administrationExpanded?'rotate-90':''}`}/></button>
                {administrationExpanded&&<ul className="ml-4 mt-1 space-y-1" aria-label="Administração"><li><button type="button" onClick={()=>onNavigate('admin-users')} aria-current={activeView==='admin-users'?'page':undefined} className={`min-h-9 w-full rounded-md border px-2 py-1 text-left text-xs ${activeView==='admin-users'?'border-accent bg-accent font-semibold text-primary':'border-accent/25 bg-surface/5 text-accent/75'}`}>Utilizadores</button></li><li><button type="button" onClick={()=>onNavigate('imports')} aria-current={activeView==='imports'?'page':undefined} className={`min-h-9 w-full rounded-md border px-2 py-1 text-left text-xs ${activeView==='imports'?'border-accent bg-accent font-semibold text-primary':'border-accent/25 bg-surface/5 text-accent/75'}`}>Importações</button></li><li><button type="button" onClick={()=>onNavigate('import-review')} aria-current={activeView==='import-review'?'page':undefined} className={`min-h-9 w-full rounded-md border px-2 py-1 text-left text-xs ${activeView==='import-review'?'border-accent bg-accent font-semibold text-primary':'border-accent/25 bg-surface/5 text-accent/75'}`}>Revisão de importações</button></li></ul>}
              </li>
              {([['clients','Clientes'],['billing_entities','Sociedades']] as const).map(([target,label])=>{const selectedSub=activeView==='master-data'&&settingsEntity===target;return <li key={target}><button type="button" onClick={()=>onNavigateSettings(target)} aria-current={selectedSub?'page':undefined} className={`min-h-9 w-full rounded-md border px-2 py-1 text-left text-xs transition-colors ${selectedSub?'border-accent bg-accent font-semibold text-navigation':'border-accent/30 bg-surface/5 text-accent/80 hover:border-accent/60 hover:bg-surface/10 hover:text-accent'}`}>{label}</button></li>})}
            </ul>}
            </li>})}
            <li><button type="button" onClick={()=>setExpandedMenu(value=>value==='construction'?null:'construction')} aria-expanded={expandedMenu==='construction'} aria-current={constructionItems.some(item=>item.id===activeView)?'page':undefined} className={`flex min-h-10 w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors ${constructionItems.some(item=>item.id===activeView)?'border-accent bg-accent font-semibold text-navigation shadow-sm':'border-accent/35 bg-surface/5 text-accent/85 hover:border-accent/60 hover:bg-surface/10 hover:text-accent'}`}><Icon name="warning" className={`size-5 shrink-0 ${constructionItems.some(item=>item.id===activeView)?'text-navigation':'text-accent/80'}`}/>{!collapsed&&<><span className="flex-1">Em construção</span><span className={`grid size-6 shrink-0 place-items-center rounded-full border ${constructionItems.some(item=>item.id===activeView)?'border-navigation/30 bg-navigation/10':'border-accent/50 bg-accent/10'}`}><Icon name="chevron" className={`size-4 stroke-[2.5] transition-transform ${expandedMenu==='construction'?'rotate-90':''}`}/></span></>}</button>{!collapsed&&expandedMenu==='construction'&&<ul className="mb-2 ml-4 mt-1 space-y-1" aria-label="Em construção">{constructionItems.map(item=>{const selected=activeView===item.id;return <li key={item.id}><button type="button" onClick={()=>onNavigate(item.id)} aria-current={selected?'page':undefined} className={`flex min-h-9 w-full items-center gap-2 rounded-md border px-2 py-1 text-left text-xs transition-colors ${selected?'border-accent bg-accent font-semibold text-navigation':'border-accent/30 bg-surface/5 text-accent/80 hover:border-accent/60 hover:bg-surface/10 hover:text-accent'}`}><Icon name={item.icon} className="size-4 shrink-0"/><span>{item.label}</span></button></li>})}</ul>}</li>
          </ul>
        </nav>
        <div className="space-y-1 border-t border-surface/10 p-3"><InstallAppButton collapsed={collapsed}/><button type="button" onClick={() => void signOut()} className={`flex min-h-10 w-full items-center rounded-lg border border-accent/35 bg-surface/5 px-3 text-sm font-medium text-accent/85 transition hover:border-danger/60 hover:bg-danger/15 hover:text-navigation-text ${collapsed?'justify-center':'gap-3'}`} aria-label="Terminar sessão"><Icon name="logout" className="size-5 shrink-0"/>{!collapsed&&<span>Terminar sessão</span>}</button></div>
        <div className="border-t border-surface/10 p-3"><div className={`flex items-center gap-3 rounded-lg bg-surface/5 p-2 ${collapsed ? 'justify-center' : ''}`}>
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-sm font-semibold">{displayName.split(/\s+/).map(part=>part[0]).join('').slice(0,2).toUpperCase()}</span>
          {!collapsed && <div className="min-w-0"><p className="truncate text-sm font-semibold">{displayName}</p><p className="truncate text-xs text-navigation-text/65">Sessão protegida</p></div>}
        </div>{!collapsed && <p className="mt-2 text-center text-[0.65rem] tracking-wider text-navigation-text/60">Versão {__APP_VERSION__}</p>}</div>
      </aside>

      <div className={`transition-[padding] duration-200 ${collapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
        <header className="app-shell-header sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b border-accent/30 bg-navigation text-navigation-text shadow-sm sm:flex-nowrap sm:gap-4">
          <button className="grid size-10 place-items-center rounded-lg border border-accent/40 bg-surface/5 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Abrir navegação"><Icon name="menu" className="size-5" /></button>
          <nav aria-label="Localização" className="order-last min-w-0 basis-full pb-3 sm:order-none sm:flex-1 sm:basis-auto sm:py-3"><ol className="space-y-1.5">{locationLevels.map((level,index)=><li key={`${level.label}-${index}`} aria-current={index===locationLevels.length-1?'page':undefined} className={`flex min-w-0 items-center gap-2 ${index===0?'font-display text-xl font-semibold leading-tight sm:text-2xl':index===1?'text-sm font-semibold text-accent/85':'text-xs font-medium text-accent/70'}`}><Icon name={level.icon} className={`${index===0?'size-6':'size-4'} shrink-0`}/><span className="truncate">{level.label}</span></li>)}</ol></nav>
          <button type="button" aria-pressed={!financialValuesVisible} onClick={()=>setFinancialValuesVisible(value=>!value)} className="grid size-10 place-items-center rounded-lg border border-accent/40 bg-surface/5 hover:bg-surface/10" aria-label={financialValuesVisible?'Ocultar valores financeiros':'Mostrar valores financeiros'} title={financialValuesVisible?'Ocultar valores financeiros':'Mostrar valores financeiros'}><Icon name={financialValuesVisible?'eye':'eyeOff'} className="size-5"/></button>
          <button type="button" onClick={()=>setTheme(value=>value==='light'?'dark':'light')} className="grid size-10 place-items-center rounded-lg border border-accent/40 bg-surface/5 hover:bg-surface/10" aria-label={theme==='light'?'Activar modo escuro':'Activar modo claro'} title={theme==='light'?'Modo escuro':'Modo claro'}><Icon name={theme==='light'?'moon':'sun'} className="size-5"/></button>
          <button type="button" onClick={refreshData} disabled={refreshing} className="grid size-10 place-items-center rounded-lg border border-accent/40 bg-surface/5 hover:bg-surface/10 disabled:opacity-60" aria-label="Actualizar dados apresentados" title="Actualizar dados"><Icon name="refresh" className={`size-5 ${refreshing?'animate-spin':''}`}/></button>
          <div className="grid size-10 place-items-center rounded-full border border-accent/50 bg-secondary text-xs font-semibold text-navigation-text" title={displayName}>{displayName.split(/\s+/).map(part=>part[0]).join('').slice(0,2).toUpperCase()}</div>
        </header>
        <main id="main-content" className="app-shell-main py-6 sm:py-8">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary">Carina - Legal</p><h1 className="mt-1 font-display text-2xl font-semibold sm:text-3xl">{currentLabel}</h1></div><span className="rounded-full border border-warning/25 bg-warning-soft px-3 py-1.5 text-xs font-medium text-warning">{(['overview','work','clients','billing','professionals','imports','import-review','master-data','admin','admin-users'] as ViewId[]).includes(activeView) ? 'Dados reais — acesso restrito' : 'Módulo em construção — sem dados operacionais'}</span></div>
          {children}
        </main>
      </div>
    </div>
  )
}
