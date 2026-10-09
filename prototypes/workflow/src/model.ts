export type Area = 'resumo' | 'clientes' | 'trabalho' | 'financeiro' | 'notas' | 'definicoes'
export type ClientTab = 'resumo' | 'dados' | 'trabalho' | 'contratos' | 'financeiro'
export type FinanceTab = 'por-facturar' | 'por-receber' | 'pagamentos' | 'provisoes' | 'honorarios'
export type Operation = 'work' | 'expense' | 'client' | 'note' | 'collection' | 'invoice' | 'payment' | 'provision' | 'retainer' | 'fixed' | 'document' | 'credential' | 'memo' | 'entity'
export type Language = 'pt' | 'en' | 'fr'
export type Role = 'operator' | 'admin' | 'owner' | 'viewer'
export type Client = { id: string; name: string; category: 'Particular' | 'Empresa' | 'Misto'; society: string; responsible: string; language: Language; hourlyRate: number }
export type Entry = { id: string; clientId: string; description: string; date: string; minutes: number; amount: number; kind: 'Horas' | 'Despesa'; treatment: 'Normal' | 'Avença' | 'Preço fixo'; invoiced: boolean; paid: boolean; noteId?: string }
export type Note = { id: string; clientId: string; language: Language; original: string; description: string; amount: number; provision: number; received: number; invoice: string; version: number; voided?: boolean; entryIds: string[] }
export type Retainer = { id: string; clientId: string; amount: number; hours: number; usedMinutes: number; mode: 'Simples' | 'Avença + horas'; period: string; invoice?: string; paid: boolean }
export type FixedJob = { id: string; clientId: string; title: string; amount: number; entryIds: string[]; status: 'Por iniciar' | 'Em curso' | 'Terminado'; paid: boolean }
export type Provision = { id: string; clientId: string; amount: number; applied: number }
export type Receipt = { id: string; clientId: string; noteId?: string; amount: number; reference: string; date: string }
export type Memo = { id: string; title: string; body: string; urgency: string; shared: string; completed: boolean }
export type DemoState = { clients: Client[]; entries: Entry[]; notes: Note[]; retainers: Retainer[]; jobs: FixedJob[]; provisions: Provision[]; receipts: Receipt[]; memos: Memo[]; attachments: { id: string; clientId: string; name: string; type: string }[] }
export type Route = { area: Area; clientId?: string; clientTab?: ClientTab; financeTab?: FinanceTab; setting?: string; society?: string; responsible?: string; legacy?: string }
export type Draft = { clientId: string; description: string; date: string; amount: string; minutes: string; language: Language; format: 'pdf' | 'word'; reference: string; mode: string; period: string; urgency: string; shared: string; failTranslation: boolean; provision: string; fileName: string; targetId: string }
export type OperationRequest = { kind: Operation; clientId?: string; entryId?: string; noteId?: string; retainerId?: string; jobId?: string; memoId?: string }

export const menus: { id: Area; label: string; icon: string }[] = [
  { id: 'resumo', label: 'Resumo', icon: '◫' },
  { id: 'clientes', label: 'Clientes', icon: '♧' },
  { id: 'trabalho', label: 'Trabalho', icon: '◷' },
  { id: 'financeiro', label: 'Financeiro', icon: '€' },
  { id: 'notas', label: 'Notas', icon: '▤' },
]
export const clientTabs: { id: ClientTab; label: string }[] = [
  { id: 'resumo', label: 'Resumo' }, { id: 'dados', label: 'Dados' },
  { id: 'trabalho', label: 'Trabalho' }, { id: 'contratos', label: 'Contratos' },
  { id: 'financeiro', label: 'Financeiro e documentos' },
]
export const financeTabs: { id: FinanceTab; label: string }[] = [
  { id: 'por-facturar', label: 'Por facturar' }, { id: 'por-receber', label: 'Por receber' },
  { id: 'pagamentos', label: 'Pagamentos' }, { id: 'provisoes', label: 'Provisões' },
  { id: 'honorarios', label: 'Honorários' },
]
export const operationLabels: Record<Operation, string> = {
  work: 'Novo registo', expense: 'Nova despesa', client: 'Novo cliente', note: 'Preparar nota de honorários',
  collection: 'Preparar cobrança', invoice: 'Registar factura', payment: 'Registar pagamento',
  provision: 'Registar provisão', retainer: 'Condição de avença', fixed: 'Trabalho a preço fixo',
  document: 'Arquivar documento', credential: 'Credencial do cliente', memo: 'Nota de trabalho', entity: 'Editar dados base',
}
export const euro = (amount: number) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(amount)
export const remaining = (note: Note) => Math.max(0, Math.round((note.amount - note.provision - note.received) * 100) / 100)
export const languages: Record<Language, string> = { pt: 'Português', en: 'Inglês', fr: 'Francês' }
export const noteCopy: Record<Language, { title: string; text: string; demo: string }> = {
  pt: { title: 'Nota de honorários', text: 'Reunião de acompanhamento e análise de documentação.', demo: 'DOCUMENTO DE DEMONSTRAÇÃO — SEM VALIDADE' },
  en: { title: 'Fee note', text: 'Follow-up meeting and document review.', demo: 'DEMONSTRATION DOCUMENT — NOT VALID' },
  fr: { title: "Note d’honoraires", text: 'Réunion de suivi et analyse de documents.', demo: 'DOCUMENT DE DÉMONSTRATION — SANS VALIDITÉ' },
}
export function createDemo(): DemoState {
  return {
    clients: [
      { id: 'demo-alfa', name: 'Cliente Alfa — DEMO', category: 'Empresa', society: 'Sociedade Norte — DEMO', responsible: 'Responsável A — DEMO', language: 'pt', hourlyRate: 100 },
      { id: 'demo-beta', name: 'Cliente Beta — DEMO', category: 'Particular', society: 'LEGALTEAM — DEMO', responsible: 'Responsável B — DEMO', language: 'en', hourlyRate: 90 },
      { id: 'demo-gama', name: 'Cliente Gama — DEMO', category: 'Misto', society: 'LEGALTEAM — DEMO', responsible: 'Responsável A — DEMO', language: 'fr', hourlyRate: 110 },
    ],
    entries: [
      { id: 'demo-entry-1', clientId: 'demo-alfa', description: noteCopy.pt.text, date: '2026-10-09', minutes: 90, amount: 150, kind: 'Horas', treatment: 'Normal', invoiced: false, paid: false },
      { id: 'demo-entry-2', clientId: 'demo-alfa', description: 'Deslocação de demonstração', date: '2026-10-09', minutes: 0, amount: 25, kind: 'Despesa', treatment: 'Normal', invoiced: false, paid: false },
      { id: 'demo-entry-3', clientId: 'demo-beta', description: 'Consulta jurídica de demonstração', date: '2026-10-08', minutes: 60, amount: 90, kind: 'Horas', treatment: 'Normal', invoiced: true, paid: false },
      { id: 'demo-entry-4', clientId: 'demo-gama', description: 'Acompanhamento de avença', date: '2026-10-08', minutes: 120, amount: 0, kind: 'Horas', treatment: 'Avença', invoiced: false, paid: false },
    ],
    notes: [{ id: 'DEMO-NH-001', clientId: 'demo-beta', language: 'en', original: noteCopy.pt.text, description: noteCopy.en.text, amount: 200, provision: 0, received: 50, invoice: 'DEMO-FT-001', version: 1, entryIds: [] }],
    retainers: [{ id: 'demo-retainer', clientId: 'demo-gama', amount: 300, hours: 32, usedMinutes: 120, mode: 'Avença + horas', period: 'Anual', invoice: undefined, paid: false }],
    jobs: [{ id: 'demo-job', clientId: 'demo-alfa', title: 'Assunto a preço fixo — DEMO', amount: 400, entryIds: [], status: 'Por iniciar', paid: false }],
    provisions: [{ id: 'demo-provision', clientId: 'demo-alfa', amount: 100, applied: 0 }],
    receipts: [{ id: 'demo-receipt', clientId: 'demo-beta', noteId: 'DEMO-NH-001', amount: 50, reference: 'Recebimento fictício', date: '2026-10-08' }],
    memos: [{ id: 'demo-memo', title: 'Confirmar documentação — DEMO', body: 'Rever a lista de documentos do cliente.', urgency: 'Atenção', shared: 'Consulta', completed: false }],
    attachments: [],
  }
}

// Mapeamento de compatibilidade preparado para a migração; não altera os URLs actuais.
export function legacyRoute(search: string): Route {
  const p = new URLSearchParams(search)
  const view = p.get('view')
  const clientId = p.get('client') ?? undefined
  const common = { clientId, society: p.get('society') ?? undefined, responsible: p.get('professional') ?? undefined, legacy: view ?? undefined }
  switch (view) {
    case 'work': return { ...common, area: 'trabalho' }
    case 'clients': return { ...common, area: p.get('clientType') && p.get('clientMode') !== 'list' ? 'resumo' : 'clientes', clientTab: 'resumo' }
    case 'billing': case 'professionals': case 'overview': return { ...common, area: 'resumo' }
    case 'debtors': return { ...common, area: 'financeiro', financeTab: 'por-receber' }
    case 'payments': return { ...common, area: 'financeiro', financeTab: 'pagamentos' }
    case 'retainers': return { ...common, area: 'clientes', clientTab: 'contratos' }
    case 'provisions': return { ...common, area: 'financeiro', financeTab: 'provisoes' }
    case 'notes': return { ...common, area: 'notas' }
    case 'master-data': return { ...common, area: 'definicoes', setting: p.get('entity') ?? 'clients' }
    case 'admin-users': return { ...common, area: 'definicoes', setting: 'users' }
    case 'admin-access-logs': return { ...common, area: 'definicoes', setting: 'access' }
    case 'imports': return { ...common, area: 'definicoes', setting: 'imports' }
    case 'import-review': return { ...common, area: 'definicoes', setting: 'import-review' }
    case 'admin': return { ...common, area: 'definicoes' }
    default: return { area: 'resumo' }
  }
}
