import { Icon, type IconName } from '../ui/Icon'
import type { ViewId } from '../../types/navigation'
import type { ApplicationRole } from '../../types/database.types'

import { workflowAreas, workflowAreaLabel, type WorkflowArea } from '../../types/workflowNavigation'

export function WorkflowNavigation({ area, collapsed, canManageSettings, onNavigate }: { area: WorkflowArea; collapsed: boolean; canManageSettings: boolean; onNavigate: (view: ViewId) => void }) {
  function button(id: WorkflowArea, view: ViewId, label: string, icon: IconName) {
    const selected = area === id
    return <button type="button" aria-label={label} title={collapsed ? label : undefined} aria-current={selected ? 'page' : undefined} onClick={() => onNavigate(view)} className={`flex min-h-11 w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm ${selected ? 'border-accent bg-accent font-semibold text-navigation' : 'border-accent/35 bg-surface/5 text-accent/85 hover:bg-surface/10'}`}><Icon name={icon} className="size-5 shrink-0" />{!collapsed && <span>{label}</span>}</button>
  }
  return <><ul aria-label="Áreas de trabalho" className="space-y-2">{workflowAreas.map(item => <li key={item.id}>{button(item.id, item.view, item.label, item.icon)}</li>)}</ul>{canManageSettings && <ul aria-label="Configuração" className="mt-6 border-t border-accent/25 pt-4"><li>{button('definicoes', 'master-data', 'Definições', 'admin')}</li></ul>}</>
}
interface WorkflowSectionsProps {
  area: WorkflowArea; activeView: ViewId; role: ApplicationRole | null; societies: string[]; professionals: string[]; selectedSociety: string | null; selectedProfessional: string | null; selectedClientType: 'individual' | 'company' | 'mixed' | null;
  onNavigate: (view: ViewId) => void; onSociety: (name: string) => void; onProfessional: (name: string) => void;
  onClientType: (type: 'individual' | 'company' | 'mixed', mode: 'dashboard' | 'list') => void;
  onSettings: (target: 'admin' | 'clients' | 'billing_entities' | 'professionals') => void;
}
export function WorkflowSections({ area, activeView, role, societies, professionals, selectedSociety, selectedProfessional, selectedClientType, onNavigate, onSociety, onProfessional, onClientType, onSettings }: WorkflowSectionsProps) {
  const canAdmin = role === 'owner' || role === 'admin'
  const tabs: { view: ViewId; label: string }[] = area === 'resumo' ? [{ view: 'overview', label: 'Global' }, { view: 'billing', label: 'Sociedades' }, { view: 'professionals', label: 'Responsáveis' }]
    : area === 'financeiro' ? [{ view: 'debtors', label: 'Por receber' }, { view: 'payments', label: 'Pagamentos e facturação' }, { view: 'provisions', label: 'Provisões' }]
    : area === 'clientes' ? [{ view: 'clients', label: 'Lista de clientes' }, { view: 'retainers', label: 'Avenças' }]
    : []
  return <section aria-label="Acessos da área" className="mb-4 rounded-lg border border-border bg-surface p-3">
    {tabs.length > 0 && <nav aria-label={'Áreas de ' + workflowAreaLabel(area)} className="flex flex-wrap gap-2">{tabs.map(tab => <button type="button" key={tab.view} className="control min-h-11 px-3 text-sm" aria-current={activeView === tab.view ? 'page' : undefined} onClick={() => onNavigate(tab.view)}>{tab.label}</button>)}</nav>}
    {area === 'resumo' && <div className="mt-3 flex flex-wrap gap-3"><label className="flex min-w-0 flex-col gap-1 text-sm">Sociedade<select className="control min-h-11 max-w-full" value={activeView === 'billing' ? selectedSociety ?? '' : ''} onChange={e => e.target.value ? onSociety(e.target.value) : onNavigate('billing')}><option value="">Todas as sociedades</option>{societies.map(name => <option key={name}>{name}</option>)}</select></label><label className="flex min-w-0 flex-col gap-1 text-sm">Responsável<select className="control min-h-11 max-w-full" value={activeView === 'professionals' ? selectedProfessional ?? '' : ''} onChange={e => e.target.value ? onProfessional(e.target.value) : onNavigate('professionals')}><option value="">Todos os responsáveis</option>{professionals.map(name => <option key={name}>{name}</option>)}</select></label><label className="text-sm">Resumo de clientes<select className="control ml-2 min-h-11" value={activeView === 'clients' ? selectedClientType ?? '' : ''} onChange={e => { if (e.target.value) onClientType(e.target.value as 'individual' | 'company' | 'mixed', 'dashboard') }}><option value="">Escolher tipo</option><option value="individual">PARTICULARES</option><option value="company">EMPRESAS</option><option value="mixed">MISTOS</option></select></label></div>}
    {area === 'clientes' && <div className="mt-3 flex flex-wrap gap-2">{([['individual', 'PARTICULARES'], ['company', 'EMPRESAS'], ['mixed', 'MISTOS']] as const).map(([type, label]) => <button type="button" key={type} className="control min-h-11 px-3 text-sm" onClick={() => onClientType(type, 'list')}>{label}</button>)}</div>}
    {area === 'definicoes' && <nav aria-label="Áreas de Definições" className="flex flex-wrap gap-2">{([['clients', 'Clientes'], ['billing_entities', 'Sociedades'], ['professionals', 'Responsáveis']] as const).map(([target, label]) => <button type="button" key={target} className="control min-h-11 px-3 text-sm" onClick={() => onSettings(target)}>{label}</button>)}{canAdmin && <><button type="button" className="control min-h-11 px-3 text-sm" onClick={() => onNavigate('admin')}>Administração</button><button type="button" className="control min-h-11 px-3 text-sm" onClick={() => onNavigate('admin-users')}>Utilizadores</button><button type="button" className="control min-h-11 px-3 text-sm" onClick={() => onNavigate('imports')}>Importações</button><button type="button" className="control min-h-11 px-3 text-sm" onClick={() => onNavigate('import-review')}>Revisão de importações</button></>}{role === 'owner' && <button type="button" className="control min-h-11 px-3 text-sm" onClick={() => onNavigate('admin-access-logs')}>Registos de acesso</button>}</nav>}
  </section>
}
