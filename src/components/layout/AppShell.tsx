import { useEffect, useState, type ReactNode } from 'react'
import { Icon } from '../ui/Icon'
import type { NavigationItem, ViewId } from '../../types/navigation'
import { useAuth } from '../../features/auth/AuthContext'
import { PasswordModal } from '../../features/auth/PasswordModal'

const navigation: NavigationItem[] = [
  { id: 'overview', label: 'Visão geral', icon: 'overview' }, { id: 'work', label: 'Registos de trabalho', icon: 'clock' },
  { id: 'clients', label: 'Clientes', icon: 'clients' }, { id: 'matters', label: 'Processos', icon: 'matters' },
  { id: 'billing', label: 'Sociedades faturantes', icon: 'building' }, { id: 'professionals', label: 'Profissionais', icon: 'people' },
  { id: 'invoices', label: 'Faturação', icon: 'invoice' }, { id: 'payments', label: 'Recebimentos', icon: 'payment' },
  { id: 'pricing', label: 'Regras de preços', icon: 'rules' }, { id: 'imports', label: 'Importações', icon: 'import' },
  { id: 'import-review', label: 'Revisão de importações', icon: 'warning' },
  { id: 'reports', label: 'Relatórios', icon: 'reports' }, { id: 'audit', label: 'Auditoria', icon: 'audit' },
  { id: 'admin', label: 'Administração', icon: 'admin' },
]

interface AppShellProps { activeView: ViewId; onNavigate: (view: ViewId) => void; children: ReactNode }

export function AppShell({ activeView, onNavigate, children }: AppShellProps) {
  const { user, signOut, updatePassword, enrollPasskey } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [accountNotice, setAccountNotice] = useState('')
  const displayName = typeof user?.user_metadata?.username === 'string' && user.user_metadata.username.trim()
    ? user.user_metadata.username.trim()
    : user?.email?.split('@')[0] ?? 'Utilizador'
  useEffect(() => setMobileOpen(false), [activeView])
  const currentLabel = navigation.find(({ id }) => id === activeView)?.label ?? 'Legal Carina'

  return (
    <div className="min-h-screen bg-background text-text-primary">
      {mobileOpen && <button className="app-safe-fixed fixed z-30 bg-primary/35 lg:hidden" aria-label="Fechar navegação" onClick={() => setMobileOpen(false)} />}
      <aside aria-label="Navegação principal" className={`app-shell-sidebar fixed inset-y-0 left-0 z-40 flex flex-col border-r border-border bg-primary text-surface transition-[width,transform] duration-200 ${collapsed ? 'lg:w-20' : 'lg:w-64'} w-[min(18rem,calc(100vw-var(--safe-right)))] ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex h-18 items-center gap-3 border-b border-surface/10 px-5">
          <div className="grid size-9 shrink-0 place-items-center rounded-lg border border-accent/50 bg-surface/5 font-display text-lg text-accent">LC</div>
          {!collapsed && <div className="min-w-0"><p className="font-display text-lg font-semibold leading-none">Legal Carina</p><p className="mt-1 text-[0.65rem] uppercase tracking-[0.18em] text-surface/55">Gestão jurídica</p></div>}
          <button className="ml-auto hidden size-8 place-items-center rounded-lg text-surface/70 hover:bg-surface/10 hover:text-surface lg:grid" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? 'Expandir navegação' : 'Recolher navegação'} aria-expanded={!collapsed}>
            <Icon name="chevron" className={`size-4 transition-transform ${collapsed ? '' : 'rotate-180'}`} />
          </button>
        </div>
        <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {navigation.map((item) => <li key={item.id}><button type="button" title={collapsed ? item.label : undefined} onClick={() => onNavigate(item.id)} aria-current={activeView === item.id ? 'page' : undefined}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${activeView === item.id ? 'bg-surface/12 font-semibold text-surface shadow-inner' : 'text-surface/70 hover:bg-surface/7 hover:text-surface'}`}>
              <Icon name={item.icon} className={`size-5 shrink-0 ${activeView === item.id ? 'text-accent' : ''}`} />{!collapsed && <span>{item.label}</span>}
            </button></li>)}
          </ul>
        </nav>
        <div className="border-t border-surface/10 p-3"><div className={`flex items-center gap-3 rounded-lg bg-surface/5 p-2 ${collapsed ? 'justify-center' : ''}`}>
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-sm font-semibold">DA</span>
          {!collapsed && <div className="min-w-0"><p className="truncate text-sm font-semibold">{displayName}</p><p className="truncate text-xs text-surface/55">Sessão protegida</p></div>}
        </div></div>
      </aside>

      <div className={`transition-[padding] duration-200 ${collapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
        <header className="app-shell-header sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-surface/95 backdrop-blur">
          <button className="grid size-10 place-items-center rounded-lg border border-border lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Abrir navegação"><Icon name="menu" className="size-5" /></button>
          <div className="hidden min-w-0 flex-1 items-center md:flex"><div className="relative w-full max-w-md"><Icon name="search" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-secondary"/><input className="control w-full py-2 pl-10 pr-4 text-sm" aria-label="Pesquisa global" placeholder="Pesquisar clientes, processos ou movimentos…" /></div></div>
          <div className="ml-auto flex items-center gap-2">
            <button className="control hidden items-center gap-2 px-3 text-sm xl:flex"><Icon name="calendar" className="size-4 text-secondary"/><span>01 jan — 31 dez 2026</span></button>
            <label className="sr-only" htmlFor="selected-billing">Sociedade selecionada</label><select id="selected-billing" className="control hidden max-w-48 px-3 text-sm sm:block" defaultValue="all"><option value="all">Todas as sociedades</option><option>Carina Santos</option><option>Legal Team</option><option>Massive Search</option></select>
            <button className="relative grid size-10 place-items-center rounded-lg border border-border hover:bg-surface-subtle" aria-label="Notificações, 3 novas"><Icon name="bell" className="size-5"/><span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-danger ring-2 ring-surface" /></button>
            <div className="relative hidden sm:block"><button onClick={() => setAccountOpen((value) => !value)} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-surface-subtle" aria-label="Menu do utilizador" aria-expanded={accountOpen}><span className="grid size-8 place-items-center rounded-full bg-primary text-xs font-semibold text-surface">DA</span><Icon name="chevron" className="size-3 rotate-90 text-text-secondary"/></button>{accountOpen && <div className="absolute right-0 top-12 z-30 w-52 rounded-lg border border-border bg-surface p-2 shadow-lg"><button onClick={() => { setAccountOpen(false); setPasswordOpen(true) }} className="w-full rounded-md px-3 py-2 text-left text-sm font-semibold hover:bg-surface-subtle">Definir password</button><button onClick={async () => { setAccountOpen(false); setAccountNotice('A aguardar confirmação do dispositivo…'); const passkeyFailure = await enrollPasskey(); setAccountNotice(passkeyFailure ? `A passkey não foi concluída: ${passkeyFailure}` : 'Passkey ativada com sucesso.') }} className="w-full rounded-md px-3 py-2 text-left text-sm font-semibold hover:bg-surface-subtle">Ativar passkey</button></div>}</div>
            <button onClick={() => void signOut()} className="grid size-10 place-items-center rounded-lg text-text-secondary hover:bg-danger-soft hover:text-danger" aria-label="Terminar sessão"><Icon name="logout" className="size-5"/></button>
          </div>
        </header>
        <main id="main-content" className="app-shell-main py-6 sm:py-8">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary">Legal Carina</p><h1 className="mt-1 font-display text-2xl font-semibold sm:text-3xl">{currentLabel}</h1></div><span className="rounded-full border border-warning/25 bg-warning-soft px-3 py-1.5 text-xs font-medium text-warning">{(['overview','clients','billing','professionals','import-review'] as ViewId[]).includes(activeView) ? 'Dados reais — acesso restrito' : 'Dados demonstrativos anonimizados'}</span></div>
          {children}
        </main>
      </div>
      {passwordOpen && <PasswordModal onClose={() => setPasswordOpen(false)} onSubmit={updatePassword} />}
      {accountNotice && <div role="status" className="app-safe-toast fixed bottom-4 right-4 z-50 max-w-sm rounded-lg border border-border bg-surface p-4 text-sm shadow-lg"><div className="flex items-start gap-3"><p className="flex-1">{accountNotice}</p><button onClick={() => setAccountNotice('')} aria-label="Fechar mensagem" className="font-semibold text-text-secondary">×</button></div></div>}
    </div>
  )
}
