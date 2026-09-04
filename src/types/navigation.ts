import type { IconName } from '../components/ui/Icon'

export type ViewId = 'overview' | 'work' | 'notes' | 'clients' | 'retainers' | 'provisions' | 'matters' | 'billing' | 'professionals' | 'invoices' | 'payments' | 'pricing' | 'imports' | 'import-review' | 'reports' | 'audit' | 'master-data' | 'admin' | 'admin-users' | 'admin-access-logs'
export interface NavigationItem { id: ViewId; label: string; icon: IconName }
