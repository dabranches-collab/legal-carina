import type { IconName } from '../components/ui/Icon'

export type ViewId = 'overview' | 'work' | 'clients' | 'matters' | 'billing' | 'professionals' | 'invoices' | 'payments' | 'pricing' | 'imports' | 'reports' | 'audit' | 'admin'
export interface NavigationItem { id: ViewId; label: string; icon: IconName }
