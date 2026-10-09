import { useEffect, useRef, useState } from 'react'
import { ClientLabel, ClientNavigation, Modal, Navigation, OperationDialog, Panel } from './components'
import { features } from './catalog'
import { exportExcel, exportNote } from './exports'
import { createDemo, dashboardFocusLabels, euro, financeTabs, languages, legacyRoute, menus, noteCopy, remaining } from './model'
import type { Client, ClientTab, DashboardFocus, Draft, FinanceTab, Note, OperationRequest, Role, Route } from './model'

function routeFromLocation(): Route {
  const [area, search = ''] = window.location.hash.slice(1).split('?')
  if (!['resumo', 'clientes', 'trabalho', 'financeiro', 'notas', 'definicoes'].includes(area)) return legacyRoute(window.location.search)
  const p = new URLSearchParams(search)
  return { area: area as Route['area'], clientId: p.get('client') ?? undefined, clientTab: (p.get('tab') ?? 'resumo') as ClientTab, financeTab: (p.get('fila') ?? 'por-facturar') as FinanceTab, setting: p.get('setting') ?? undefined, focus: p.get('focus') && p.get('focus')! in dashboardFocusLabels ? p.get('focus') as DashboardFocus : undefined, scopeClient: p.get('scope') ?? undefined, scopeCategory: p.get('type') ?? undefined }
}
function routeHash(route: Route) {
  const p = new URLSearchParams()
  if (route.clientId) p.set('client', route.clientId)
  if (route.clientTab) p.set('tab', route.clientTab)
  if (route.financeTab) p.set('fila', route.financeTab)
  if (route.setting) p.set('setting', route.setting)
  if (route.focus) p.set('focus', route.focus)
  if (route.scopeClient) p.set('scope', route.scopeClient)
  if (route.scopeCategory) p.set('type', route.scopeCategory)
  return '#' + route.area + (p.size ? '?' + p.toString() : '')
}

export default function App() {
  const [state, setState] = useState(createDemo)
  const [route, setRoute] = useState<Route>(routeFromLocation)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [role, setRole] = useState<Role>('operator')
  const [dark, setDark] = useState(false)
  const [showValues, setShowValues] = useState(true)
  const [notice, setNotice] = useState('')
  const [operation, setOperation] = useState<OperationRequest | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [coverage, setCoverage] = useState(false)
  const [coverageQuery, setCoverageQuery] = useState('')
  const [clientSearch, setClientSearch] = useState('')
  const [workSearch, setWorkSearch] = useState('')
  const [category, setCategory] = useState('Todos')
  const [society, setSociety] = useState(() => route.society ?? 'Todas')
  const [responsible, setResponsible] = useState(() => route.responsible ?? 'Todos')
  const [workStatus, setWorkStatus] = useState('Todos')
  const [clientLayout, setClientLayout] = useState('Caixas')
  const [columnsOpen, setColumnsOpen] = useState(false)
  const [showDate, setShowDate] = useState(true)
  const [urgency, setUrgency] = useState('Todas')
  const [importReport, setImportReport] = useState(false)
  const [provisionHistory, setProvisionHistory] = useState(false)
  const [allocation, setAllocation] = useState(false)
  const [paymentQueue, setPaymentQueue] = useState<'all' | 'work' | 'note' | 'retainer'>('all')
  const [officeShare, setOfficeShare] = useState(10)
  const returnRoute = useRef<Route>({ area: 'clientes' })
  const heading = useRef<HTMLHeadingElement>(null)
  const writable = role !== 'viewer'
  const administrative = role === 'admin' || role === 'owner'
  const client = state.clients.find(item => item.id === route.clientId)
  const currentNotes = state.notes.filter(n => !n.voided && !state.notes.some(other => other.id === n.id && other.version > n.version))
  const visibleClients = state.clients.filter(item => (category === 'Todos' || item.category === category || item.category === 'Misto') && (society === 'Todas' || item.society === society) && (responsible === 'Todos' || item.responsible === responsible))
  const scopeClients = visibleClients.filter(c => (!route.scopeClient || c.id === route.scopeClient) && (!route.scopeCategory || c.category === route.scopeCategory || (route.scopeCategory !== 'Misto' && c.category === 'Misto')))
  const inScope = (clientId: string) => scopeClients.some(c => c.id === clientId)
  const scopedEntries = state.entries.filter(e => inScope(e.clientId))
  const scopedNotes = currentNotes.filter(n => inScope(n.clientId))
  const scopedReceipts = state.receipts.filter(r => inScope(r.clientId))
  const scopedRetainers = state.retainers.filter(r => inScope(r.clientId))
  const scopedJobs = state.jobs.filter(j => inScope(j.clientId))
  const scopedProvisions = state.provisions.filter(p => inScope(p.clientId))
  const searchClients = scopeClients.filter(item => item.name.toLocaleLowerCase('pt-PT').includes(clientSearch.toLocaleLowerCase('pt-PT')))
  const label = client ? client.name : route.area === 'definicoes' ? 'Definições' : menus.find(item => item.id === route.area)?.label ?? 'Resumo'

  useEffect(() => { const sync = () => { setRoute(routeFromLocation()); setMobileOpen(false) }; window.addEventListener('popstate', sync); window.addEventListener('hashchange', sync); return () => { window.removeEventListener('popstate', sync); window.removeEventListener('hashchange', sync) } }, [])
  useEffect(() => { document.documentElement.dataset.theme = dark ? 'dark' : 'light' }, [dark])
  useEffect(() => { heading.current?.focus() }, [route])

  function navigate(next: Route) {
    if (next.area === 'definicoes' && role === 'viewer') return
    window.history.pushState({}, '', routeHash(next)); setRoute(next); setMobileOpen(false); setAddOpen(false); setNotice('')
  }
  function openClient(id: string, tab: ClientTab = 'resumo') { returnRoute.current = route; navigate({ area: 'clientes', clientId: id, clientTab: tab }) }
  function drillDown(focus: DashboardFocus, scopeClient?: string) {
    setWorkSearch(''); setClientSearch(''); setWorkStatus('Todos'); setPaymentQueue('all')
    const next: Route = { area: 'trabalho', focus, scopeClient }
    if (focus === 'clients') next.area = 'clientes'
    if (['notes', 'receipts', 'provisions'].includes(focus)) { next.area = 'financeiro'; next.financeTab = focus === 'notes' ? 'honorarios' : focus === 'receipts' ? 'pagamentos' : 'provisoes' }
    if (focus === 'retainers' || focus === 'fixed') { next.area = 'clientes'; next.clientTab = 'contratos' }
    navigate(next)
  }
  function activeFilters() {
    return <div className="filter-context" aria-label="Filtros activos"><span><strong>Filtros activos:</strong> {category} · {society} · {responsible}{route.scopeClient && ' · ' + (state.clients.find(c => c.id === route.scopeClient)?.name ?? 'Cliente indisponível')}{route.scopeCategory && ' · Segmento: ' + route.scopeCategory}{route.focus && ' · ' + dashboardFocusLabels[route.focus]}</span>{route.focus && <><button onClick={() => navigate({ area: 'resumo' })}>← Voltar ao resumo</button><button onClick={() => navigate({ ...route, focus: undefined, scopeClient: undefined, scopeCategory: undefined })}>Remover pré-filtro</button></>}</div>
  }
  function metric(focus: DashboardFocus, value: string | number, count: number) {
    return <button className="metric-card" onClick={() => drillDown(focus)} aria-label={'Abrir ' + dashboardFocusLabels[focus]}><small>{dashboardFocusLabels[focus]}</small><strong>{value}</strong><small>{count} {count === 1 ? 'item' : 'itens'} · Abrir lista →</small></button>
  }
  function summaryPage() {
    const hours = scopedEntries.filter(e => e.kind === 'Horas')
    const pendingNotes = scopedNotes.filter(n => remaining(n) > 0)
    const unbilled = scopedEntries.filter(e => !e.invoiced && !e.paid && !e.noteId && e.treatment === 'Normal')
    const unpaid = scopedEntries.filter(e => e.invoiced && !e.paid && !e.noteId && e.treatment === 'Normal')
    const maxMinutes = Math.max(1, ...scopeClients.map(c => hours.filter(e => e.clientId === c.id).reduce((sum, e) => sum + e.minutes, 0)))
    const statusBars: { focus: DashboardFocus; count: number }[] = [{ focus: 'unbilled', count: unbilled.length }, { focus: 'unpaid', count: unpaid.length }, { focus: 'notes', count: pendingNotes.length }, { focus: 'retainers', count: scopedRetainers.length }, { focus: 'fixed', count: scopedJobs.length }]
    const maxCount = Math.max(1, ...statusBars.map(b => b.count))
    return <>{filterToolbar()}{activeFilters()}<div className="metrics" aria-label="Contagens e atalhos do Resumo">
      {metric('clients', scopeClients.length, scopeClients.length)}
      {metric('hours', (hours.reduce((sum, e) => sum + e.minutes, 0) / 60).toFixed(1) + ' h', hours.length)}
      {metric('notes', money(pendingNotes.reduce((sum, n) => sum + remaining(n), 0)), pendingNotes.length)}
      {metric('receipts', money(scopedReceipts.reduce((sum, r) => sum + r.amount, 0)), scopedReceipts.length)}
      {metric('unbilled', unbilled.length, unbilled.length)}{metric('unpaid', unpaid.length, unpaid.length)}
      {metric('provisions', money(scopedProvisions.reduce((sum, p) => sum + p.amount - p.applied, 0)), scopedProvisions.length)}
      {metric('retainers', scopedRetainers.length, scopedRetainers.length)}{metric('fixed', scopedJobs.length, scopedJobs.length)}
    </div><div className="two-column"><Panel title="Actividade por cliente" caption="Clique numa barra para abrir os registos de horas desse cliente, dentro da selecção activa.">{scopeClients.map(c => {
      const minutes = hours.filter(e => e.clientId === c.id).reduce((sum, e) => sum + e.minutes, 0)
      return <button className="chart-filter" key={c.id} aria-label={'Filtrar horas de ' + c.name} onClick={() => drillDown('hours', c.id)}><span>{c.name}</span><strong>{(minutes / 60).toFixed(1)} h</strong><span className="chart-track" aria-hidden="true"><span style={{ width: minutes / maxMinutes * 100 + '%' }} /></span></button>
    })}</Panel><Panel title="Acompanhamento" caption="Cada barra abre a lista dos itens contabilizados; registos, notas e contratos mantêm-se separados.">{statusBars.map(b => <button className="chart-filter" key={b.focus} aria-label={'Filtrar ' + dashboardFocusLabels[b.focus]} onClick={() => drillDown(b.focus)}><span>{dashboardFocusLabels[b.focus]}</span><strong>{b.count}</strong><span className="chart-track" aria-hidden="true"><span style={{ width: b.count / maxCount * 100 + '%' }} /></span></button>)}</Panel></div>
      <Panel title="Clientes por tipo" caption="O segmento aplica o mesmo filtro de tipo à lista de clientes. Mistos continuam incluídos em particulares e empresas."><div className="category-chart">{['Particular', 'Empresa', 'Misto'].map(type => <button key={type} aria-label={'Filtrar clientes ' + type} onClick={() => { setClientSearch(''); navigate({ area: 'clientes', focus: 'clients', scopeCategory: type }) }}><span>{type}</span><strong>{scopeClients.filter(c => c.category === type || (type !== 'Misto' && c.category === 'Misto')).length}</strong></button>)}</div></Panel>
      <Panel title="Próximas acções" caption="Atalhos para o trabalho e financeiro, dentro dos filtros seleccionados."><div className="quick-actions"><button onClick={() => navigate({ area: 'financeiro', financeTab: 'por-facturar' })}>Por facturar</button><button onClick={() => navigate({ area: 'financeiro', financeTab: 'pagamentos' })}>Registar recebimentos</button><button onClick={() => navigate({ area: 'trabalho' })}>Continuar trabalho</button></div></Panel>
      {society.includes('LEGALTEAM') && <Panel title="Repartição LEGALTEAM" caption="Destino preparado para conservar as percentagens e os registos da repartição."><label>Parcela do escritório no ensaio (%)<input type="number" min="0" max="100" value={officeShare} onChange={e => setOfficeShare(Number(e.target.value))} disabled={!writable} /></label><button onClick={() => setAllocation(!allocation)}>Ver repartição e pendências</button>{allocation && <p className="inline-note">Exemplo de interface: escritório {officeShare}%; restantes parcelas {100 - officeShare}%. Cálculo real e angariadores reutilizam o módulo actual, sem alteração das regras.</p>}</Panel>}</>
  }
  function start(request: OperationRequest) { if (writable) { setAddOpen(false); setOperation({ ...request, clientId: request.clientId ?? client?.id }) } }
  const money = (value: number) => showValues ? euro(value) : '••••'
  function success(message: string) { setOperation(null); setNotice(message + ' Apenas na demonstração; a lista e os filtros foram preservados.') }

  async function submit(draft: Draft): Promise<string | undefined> {
    if (!operation || !writable) return 'Este perfil de ensaio permite apenas consulta.'
    const id = 'demo-' + crypto.randomUUID()
    const amount = Math.round(Number(draft.amount) * 100) / 100
    if (['work', 'expense', 'fixed', 'retainer', 'provision', 'payment', 'note'].includes(operation.kind) && (!Number.isFinite(amount) || amount <= 0)) return 'Indique um montante positivo.'
    const targetClient = state.clients.find(c => c.id === draft.clientId)
    if (!targetClient) return 'Seleccione um cliente de demonstração.'
    if (operation.kind === 'work' || operation.kind === 'expense') {
      const entry = { id: operation.entryId ?? id, clientId: draft.clientId, description: draft.description, date: draft.date, amount, minutes: operation.kind === 'expense' ? 0 : Number(draft.minutes), kind: operation.kind === 'expense' ? 'Despesa' as const : 'Horas' as const, treatment: (['Avença', 'Preço fixo'].includes(draft.mode) ? draft.mode : 'Normal') as 'Normal' | 'Avença' | 'Preço fixo', invoiced: false, paid: false }
      const previous = state.entries.find(e => e.id === operation.entryId)
      if (previous?.noteId || previous?.paid) return 'O movimento já está associado a uma nota ou recebido. A revisão financeira segue o seu percurso próprio.'
      setState(s => ({ ...s, entries: previous ? s.entries.map(e => e.id === previous.id ? { ...previous, ...entry } : e) : [...s.entries, entry] })); success('Movimento guardado.'); return
    }
    if (operation.kind === 'client') {
      setState(s => ({ ...s, clients: [...s.clients, { ...targetClient, id, name: draft.description.includes('DEMO') ? draft.description : draft.description + ' — DEMO', category: (['Particular', 'Misto'].includes(draft.mode) ? draft.mode : 'Empresa') as Client['category'] }] })); success('Cliente criado.'); return
    }
    if (operation.kind === 'note' || operation.kind === 'collection') {
      if (draft.language !== 'pt' && draft.failTranslation) return 'Tradução indisponível na simulação. A emissão foi bloqueada e nenhuma nota foi guardada.'
      const description = draft.language === 'pt' ? draft.description : noteCopy[draft.language].text
      const provision = Number(draft.provision) || 0
      const available = state.provisions.filter(p => p.clientId === draft.clientId).reduce((sum, p) => sum + p.amount - p.applied, 0)
      if (provision < 0 || provision > available || provision > amount) return 'A provisão não pode exceder o saldo disponível nem o total da nota.'
      const entryIds = state.entries.filter(e => e.clientId === draft.clientId && !e.noteId && !e.paid && e.treatment === 'Normal').map(e => e.id)
      const revision = state.notes.find(n => n.id === operation.noteId)
      if (operation.kind === 'note' && revision && (revision.received > 0 || revision.provision > 0)) return 'Nota com acertos financeiros: revisão apenas mapeada nesta demonstração; os motores actuais serão conservados.'
      const note: Note = { id: revision?.id ?? 'DEMO-NH-' + String(state.notes.length + 1).padStart(3, '0'), clientId: draft.clientId, language: draft.language, original: draft.description, description, amount, provision, received: 0, invoice: '', version: revision ? revision.version + 1 : 1, entryIds: revision?.entryIds ?? entryIds }
      await exportNote(note, targetClient, draft.format)
      if (operation.kind === 'collection') { success('Cobrança de exemplo descarregada, sem criar uma nova dívida.'); return }
      setState(s => {
        let toApply = provision
        return { ...s, notes: [...s.notes, note], entries: s.entries.map(e => entryIds.includes(e.id) ? { ...e, noteId: note.id } : e), provisions: s.provisions.map(p => { if (p.clientId !== draft.clientId || toApply <= 0) return p; const used = Math.min(toApply, p.amount - p.applied); toApply -= used; return { ...p, applied: p.applied + used } }) }
      }); success('Nota de exemplo emitida e tradução guardada nesta versão.'); return
    }
    if (operation.kind === 'invoice') {
      setState(s => ({ ...s, entries: s.entries.map(e => e.id === operation.entryId ? { ...e, invoiced: true } : e), notes: s.notes.map(n => n.id === operation.noteId ? { ...n, invoice: draft.reference } : n), retainers: s.retainers.map(r => r.id === operation.retainerId ? { ...r, invoice: draft.reference } : r) })); success('Facturação registada, sem recebimento automático.'); return
    }
    if (operation.kind === 'payment') {
      const note = state.notes.find(n => n.id === operation.noteId && !n.voided)
      const entry = state.entries.find(e => e.id === operation.entryId)
      const retainer = state.retainers.find(r => r.id === operation.retainerId)
      if (!note && !entry && !retainer) return 'Seleccione uma pendência elegível na fila de pagamentos.'
      if ((note && !note.invoice) || (entry && !entry.invoiced) || (retainer && !retainer.invoice)) return 'Registe primeiro a facturação.'
      if (entry?.noteId) return 'O recebimento deste movimento é tratado na nota de honorários.'
      if (note && amount > remaining(note)) return 'O recebimento não pode exceder o saldo da nota.'
      if (!note && amount !== (entry?.amount ?? retainer?.amount)) return 'Registos e avenças aceitam apenas a liquidação integral nesta demonstração.'
      setState(s => ({ ...s, notes: s.notes.map(n => n.id === note?.id ? { ...n, received: n.received + amount } : n), entries: s.entries.map(e => e.id === entry?.id ? { ...e, paid: true } : e), retainers: s.retainers.map(r => r.id === retainer?.id ? { ...r, paid: true } : r), receipts: [...s.receipts, { id, clientId: draft.clientId, noteId: note?.id, amount, reference: draft.reference, date: draft.date }] })); success('Recebimento registado, separado das provisões.'); return
    }
    if (operation.kind === 'provision') { setState(s => ({ ...s, provisions: [...s.provisions, { id, clientId: draft.clientId, amount, applied: 0 }] })); success('Provisão fictícia registada.'); return }
    if (operation.kind === 'retainer') {
      const retainer = { id: operation.retainerId ?? id, clientId: draft.clientId, amount, hours: Number(draft.minutes), usedMinutes: state.retainers.find(r => r.id === operation.retainerId)?.usedMinutes ?? 0, mode: draft.mode === 'Avença + horas' ? 'Avença + horas' as const : 'Simples' as const, period: draft.period, paid: false }
      setState(s => ({ ...s, retainers: operation.retainerId ? s.retainers.map(r => r.id === operation.retainerId ? retainer : r) : [...s.retainers, retainer] })); success('Condição de avença guardada.'); return
    }
    if (operation.kind === 'fixed') {
      const job = { id: operation.jobId ?? id, clientId: draft.clientId, title: draft.description, amount, entryIds: state.jobs.find(j => j.id === operation.jobId)?.entryIds ?? [], status: 'Por iniciar' as const, paid: false }
      setState(s => ({ ...s, jobs: operation.jobId ? s.jobs.map(j => j.id === operation.jobId ? { ...j, title: job.title, amount } : j) : [...s.jobs, job] })); success('Trabalho a preço fixo guardado.'); return
    }
    if (operation.kind === 'memo') { setState(s => ({ ...s, memos: [...s.memos.filter(m => m.id !== operation.memoId), { id: operation.memoId ?? id, title: draft.description, body: draft.reference, urgency: draft.urgency, shared: draft.shared, completed: false }] })); success('Nota de trabalho guardada.'); return }
    if (operation.kind === 'document' || operation.kind === 'credential') { setState(s => ({ ...s, attachments: [...s.attachments, { id, clientId: draft.clientId, name: draft.fileName || draft.description, type: operation.kind === 'document' ? 'Documento de exemplo' : 'Ligação fictícia' }] })); success('Referência de exemplo guardada, sem upload nem credenciais reais.'); return }
    success('Alteração de dados base demonstrada; persistência operacional apenas mapeada.'); return
  }

  function filterToolbar() {
    return <div className="filters"><label>Tipo de cliente<select value={category} onChange={e => setCategory(e.target.value)}><option>Todos</option><option>Particular</option><option>Empresa</option><option>Misto</option></select></label><label>Sociedade<select value={society} onChange={e => setSociety(e.target.value)}><option>Todas</option>{[...new Set(state.clients.map(c => c.society))].map(value => <option key={value}>{value}</option>)}</select></label><label>Responsável<select value={responsible} onChange={e => setResponsible(e.target.value)}><option>Todos</option>{[...new Set(state.clients.map(c => c.responsible))].map(value => <option key={value}>{value}</option>)}</select></label><button onClick={() => { setCategory('Todos'); setSociety('Todas'); setResponsible('Todos'); if (route.focus || route.scopeClient) navigate({ ...route, focus: undefined, scopeClient: undefined, scopeCategory: undefined }) }}>Limpar filtros</button></div>
  }

  function workPanel(clientId?: string) {
    const rows = state.entries.filter(e => (clientId ? e.clientId === clientId : inScope(e.clientId)) && (clientId || !route.focus || (route.focus === 'hours' && e.kind === 'Horas') || (route.focus === 'unbilled' && !e.invoiced && !e.paid && !e.noteId && e.treatment === 'Normal') || (route.focus === 'unpaid' && e.invoiced && !e.paid && !e.noteId && e.treatment === 'Normal')) && (workStatus === 'Todos' || (workStatus === 'Não facturados' && !e.invoiced) || (workStatus === 'Facturados não pagos' && e.invoiced && !e.paid) || e.treatment === workStatus) && e.description.toLowerCase().includes(workSearch.toLowerCase()))
    return <Panel title="Registos de trabalho" caption="Horas e despesas, com acções explícitas e o mesmo formulário." action={writable && <button className="primary" onClick={() => start({ kind: 'work', clientId })}>Novo registo</button>}>
      <div className="toolbar"><label className="search">Pesquisar registos<input type="search" value={workSearch} onChange={e => setWorkSearch(e.target.value)} placeholder="Actividade ou assunto…" /></label><label>Estado / tratamento<select value={workStatus} onChange={e => setWorkStatus(e.target.value)}><option>Todos</option><option>Não facturados</option><option>Facturados não pagos</option><option>Avença</option><option>Preço fixo</option></select></label>{writable && <button onClick={() => start({ kind: 'expense', clientId })}>Nova despesa</button>}<button onClick={() => setColumnsOpen(!columnsOpen)}>Colunas</button><button onClick={() => exportExcel(rows.map(e => ({ client: state.clients.find(c => c.id === e.clientId)?.name ?? '', activity: e.description, amount: e.amount })))}>XLSX</button><button onClick={() => window.print()}>Imprimir / PDF</button></div>
      {columnsOpen && <label className="check"><input type="checkbox" checked={showDate} onChange={e => setShowDate(e.target.checked)} />Mostrar coluna Data</label>}
      <div className="table-wrap"><table><caption className="sr-only">Registos de trabalho de demonstração</caption><thead><tr><th>Cliente / actividade</th>{showDate && <th>Data</th>}<th>Tratamento</th><th>Valor</th><th>Acção</th></tr></thead><tbody>{rows.map(e => <tr key={e.id}><td><ClientLabel client={state.clients.find(c => c.id === e.clientId)} onOpen={() => openClient(e.clientId, 'trabalho')} /><p>{e.description}</p></td>{showDate && <td>{e.date}</td>}<td><span className="badge">{e.kind === 'Despesa' ? 'Despesa' : e.treatment}</span><small>{e.paid ? 'Pago' : e.invoiced ? 'Facturado' : 'Por facturar'}</small></td><td>{money(e.amount)}</td><td><button disabled={!writable} onClick={() => start({ kind: e.kind === 'Despesa' ? 'expense' : 'work', clientId: e.clientId, entryId: e.id })}>Editar</button></td></tr>)}</tbody></table>{!rows.length && <p className="empty">Nenhum movimento corresponde à selecção.</p>}</div>
    </Panel>
  }

  function notesPanel(clientId?: string) {
    const versions = state.notes.filter(n => clientId ? n.clientId === clientId : inScope(n.clientId) && (route.focus !== 'notes' || scopedNotes.some(current => current.id === n.id && current.version === n.version && remaining(current) > 0)))
    const latest = (n: Note) => !versions.some(v => v.id === n.id && v.version > n.version)
    return <Panel title="Notas de honorários" caption="Idioma, versões e documentos preservados no mesmo percurso." action={writable && <button className="primary" onClick={() => start({ kind: 'note', clientId })}>Preparar nota</button>}>
      {versions.map((n, i) => <article className="list-item" key={n.id + '-' + n.version + '-' + i}><div><strong>{n.id} · v{n.version}</strong><small>{languages[n.language]} · {n.voided ? 'Anulada' : latest(n) ? 'Versão vigente' : 'Histórico'} · {n.invoice || 'Por facturar'}</small><p>{n.description}</p><span>Saldo: {money(remaining(n))}</span></div><div className="actions"><button onClick={() => void exportNote(n, state.clients.find(c => c.id === n.clientId)!, 'pdf')}>Guardar PDF</button><button onClick={() => void exportNote(n, state.clients.find(c => c.id === n.clientId)!, 'word')}>Guardar Word</button>{writable && latest(n) && !n.voided && <><button onClick={() => start({ kind: 'note', clientId: n.clientId, noteId: n.id })}>Rever nota</button><button onClick={() => { if (n.received || n.provision) { setNotice('Anulação com acertos financeiros apenas mapeada; a futura integração conserva o livro e as regras existentes.'); return } setState(s => ({ ...s, notes: s.notes.map(note => note.id === n.id && note.version === n.version ? { ...note, voided: true } : note), entries: s.entries.map(e => e.noteId === n.id ? { ...e, noteId: undefined } : e) })); setNotice('Nota de demonstração anulada e mantida no histórico.') }}>Anular nota</button></>}</div></article>)}
      {!versions.length && <p className="empty">Ainda sem notas. Prepare uma nota a partir dos movimentos deste cliente.</p>}
    </Panel>
  }

  function provisionPanel(clientId?: string) {
    const rows = state.provisions.filter(p => clientId ? p.clientId === clientId : inScope(p.clientId))
    return <Panel title="Provisões" caption="Adiantamentos, aplicações e estornos; separados dos recebimentos de notas." action={writable && <button onClick={() => start({ kind: 'provision', clientId })}>Registar provisão</button>}>
      {rows.map(p => <article className="list-item" key={p.id}><div><ClientLabel client={state.clients.find(c => c.id === p.clientId)} onOpen={() => openClient(p.clientId, 'financeiro')} /><p>Recebido {money(p.amount)} · aplicado {money(p.applied)}</p><strong>Saldo disponível {money(p.amount - p.applied)}</strong></div><div className="actions"><button onClick={() => setProvisionHistory(!provisionHistory)}>Histórico</button>{writable && p.applied > 0 && <button onClick={() => { setState(s => ({ ...s, provisions: s.provisions.map(row => row.id === p.id ? { ...row, applied: 0 } : row), notes: s.notes.map(n => n.clientId === p.clientId ? { ...n, provision: 0 } : n) })); setNotice('Estorno fictício: saldo restituído. O livro auditado real não foi utilizado.') }}>Estornar exemplo</button>}</div></article>)}
      {provisionHistory && <p className="inline-note">Histórico de demonstração: entradas, abatimentos em notas e estornos. O recibo, as exportações PDF/Word e a auditoria real estão incluídos no inventário.</p>}
    </Panel>
  }

  function contractsPanel(clientId?: string) {
    return <><Panel title="Avenças" caption="Condições, pacote de horas e facturação são apresentados no mesmo contrato." action={writable && <button onClick={() => start({ kind: 'retainer', clientId })}>Nova condição de avença</button>}>
      {state.retainers.filter(r => clientId ? r.clientId === clientId : inScope(r.clientId) && route.focus !== 'fixed').map(r => <article className="list-item" key={r.id}><div><ClientLabel client={state.clients.find(c => c.id === r.clientId)} onOpen={() => openClient(r.clientId, 'contratos')} /><strong>{r.mode} · {money(r.amount)}</strong><p>{r.hours} horas / {r.period.toLowerCase()} · utilizadas {(r.usedMinutes / 60).toFixed(1)} h</p><progress value={r.usedMinutes} max={r.hours * 60} /><small>{r.paid ? 'Pago' : r.invoice ? 'Facturado por receber' : 'Prestação por facturar'}</small></div><div className="actions">{writable && <button onClick={() => start({ kind: 'retainer', clientId: r.clientId, retainerId: r.id })}>Editar condição</button>}<button onClick={() => { setNotice('Mapa de exemplo: Outubro 2026, ' + (r.usedMinutes / 60) + ' h. Renovações e excedentes conservam as funções actuais.') }}>Mapa de horas</button><button onClick={() => navigate({ area: 'financeiro', financeTab: 'por-facturar' })}>Ver prestação</button></div></article>)}
    </Panel><Panel title="Preço fixo" caption="Um preço por assunto; registos associados contam horas." action={writable && <button onClick={() => start({ kind: 'fixed', clientId })}>Novo trabalho a preço fixo</button>}>
      {state.jobs.filter(j => clientId ? j.clientId === clientId : inScope(j.clientId) && route.focus !== 'retainers').map(j => <article className="contract" key={j.id}><div className="list-item"><div><strong>{j.title}</strong><small>{j.status} · {money(j.amount)} · {j.entryIds.length} registos associados</small></div><div className="actions">{writable && <><button onClick={() => start({ kind: 'fixed', clientId: j.clientId, jobId: j.id })}>Editar trabalho</button><button onClick={() => { setState(s => ({ ...s, jobs: s.jobs.map(job => job.id === j.id ? { ...job, status: 'Terminado' } : job) })); setNotice('Trabalho fictício marcado como terminado.') }}>Marcar como terminado</button></>}</div></div><details><summary>Gerir registos associados</summary>{state.entries.filter(e => e.clientId === j.clientId && !e.invoiced && !e.noteId && e.kind === 'Horas').map(e => <label className="check" key={e.id}><input type="checkbox" disabled={!writable} checked={j.entryIds.includes(e.id)} onChange={event => { const checked = event.target.checked; setState(s => ({ ...s, jobs: s.jobs.map(job => job.id === j.id ? { ...job, entryIds: checked ? [...job.entryIds, e.id] : job.entryIds.filter(id => id !== e.id), status: checked ? 'Em curso' : job.status } : job), entries: s.entries.map(entry => entry.id === e.id ? { ...entry, treatment: checked ? 'Preço fixo' : 'Normal' } : entry) })) }} />{e.description}</label>)}</details></article>)}
    </Panel></>
  }

  function clientPage() {
    if (!client) return <>{filterToolbar()}<Panel title="Clientes" caption="Uma lista única. Os clientes mistos constam também em particulares e empresas." action={<div className="actions"><button onClick={() => navigate({ area: 'clientes', clientTab: 'contratos' })}>Ver contratos</button>{writable && <button className="primary" onClick={() => start({ kind: 'client' })}>Novo cliente</button>}</div>}><div className="toolbar"><label className="search">Pesquisar clientes<input type="search" value={clientSearch} onChange={e => setClientSearch(e.target.value)} placeholder="Nome do cliente…" /></label><div className="segmented">{['Caixas', 'Tabela'].map(layout => <button key={layout} aria-pressed={clientLayout === layout} onClick={() => setClientLayout(layout)}>{layout}</button>)}</div></div><div className={clientLayout === 'Caixas' ? 'client-grid' : 'client-list'}>{searchClients.map(item => <article className="client-card" key={item.id}><span className="client-avatar">{item.category === 'Empresa' ? 'E' : item.category === 'Misto' ? 'M' : 'P'}</span><div><h3>{item.name}</h3><small>{item.category} · {item.society}</small><p>{item.responsible}</p></div><div className="actions"><button className="primary" onClick={() => openClient(item.id)}>Abrir ficha</button><button onClick={() => openClient(item.id, 'trabalho')}>Ver trabalho</button><button onClick={() => openClient(item.id, 'financeiro')}>Financeiro</button></div></article>)}</div>{!searchClients.length && <p className="empty">Nenhum cliente corresponde à pesquisa.</p>}</Panel>{route.clientTab === 'contratos' && contractsPanel()}</>
    const tab = route.clientTab ?? 'resumo'
    return <><div className="client-context"><button onClick={() => navigate(returnRoute.current)}>← Voltar à lista</button><span className="badge">{client.category}</span><span>{client.society}</span></div><ClientNavigation tab={tab} onChange={next => navigate({ area: 'clientes', clientId: client.id, clientTab: next })} />
      {tab === 'resumo' && <><div className="metrics"><div><small>Trabalho registado</small><strong>{(state.entries.filter(e => e.clientId === client.id).reduce((sum, e) => sum + e.minutes, 0) / 60).toFixed(1)} h</strong></div><div><small>Notas por receber</small><strong>{money(currentNotes.filter(n => n.clientId === client.id).reduce((sum, n) => sum + remaining(n), 0))}</strong></div><div><small>Provisão disponível</small><strong>{money(state.provisions.filter(p => p.clientId === client.id).reduce((sum, p) => sum + p.amount - p.applied, 0))}</strong></div></div><Panel title="Próximas acções" caption="Comece pelo cliente; a operação já abre no contexto certo."><div className="quick-actions">{writable && <><button onClick={() => start({ kind: 'work', clientId: client.id })}>Novo registo</button><button onClick={() => start({ kind: 'expense', clientId: client.id })}>Nova despesa</button><button className="primary" onClick={() => start({ kind: 'note', clientId: client.id })}>Preparar nota</button></>}<button onClick={() => navigate({ ...route, clientTab: 'contratos' })}>Gerir contratos</button><button onClick={() => navigate({ ...route, clientTab: 'financeiro' })}>Ver financeiro</button></div><ol className="journey"><li>Trabalho / despesa</li><li>Nota de honorários</li><li>Registo de factura</li><li>Recebimento</li></ol></Panel></>}
      {tab === 'dados' && <><Panel title="Dados do cliente" caption="Identificação, contactos e preferências de documentos."><dl className="details-grid"><div><dt>Nome</dt><dd>{client.name}</dd></div><div><dt>Sociedade</dt><dd>{client.society}</dd></div><div><dt>Responsável</dt><dd>{client.responsible}</dd></div><div><dt>Valor/hora</dt><dd>{money(client.hourlyRate)}</dd></div></dl><label>Idioma predefinido dos documentos<select value={client.language} disabled={!writable} onChange={e => setState(s => ({ ...s, clients: s.clients.map(c => c.id === client.id ? { ...c, language: e.target.value as Client['language'] } : c) }))}>{Object.entries(languages).map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label><details><summary>Contactos, identificação e preferências</summary><p>Contactos, moradas, saudação, destinatário, IVA, identificação e validade conservam os campos e controlos actuais. Nesta preparação está definido o seu destino; ainda não foi substituído o formulário operacional.</p></details></Panel><Panel title="Credenciais e ligações" caption="No cliente, com o mesmo histórico e controlo de acesso." action={writable && <button onClick={() => start({ kind: 'credential', clientId: client.id })}>Nova credencial de exemplo</button>}><p>Sem passwords neste protótipo. A integração futura reutiliza o armazenamento protegido e as versões existentes.</p>{state.attachments.filter(a => a.clientId === client.id && a.type === 'Ligação fictícia').map(a => <p key={a.id}>{a.name}</p>)}</Panel></>}
      {tab === 'trabalho' && workPanel(client.id)}
      {tab === 'contratos' && contractsPanel(client.id)}
      {tab === 'financeiro' && <><div className="quick-actions">{writable && <><button onClick={() => start({ kind: 'note', clientId: client.id })}>Preparar nota</button><button onClick={() => start({ kind: 'collection', clientId: client.id })}>Preparar cobrança</button></>}<button onClick={() => navigate({ area: 'financeiro', financeTab: 'pagamentos' })}>Ver pagamentos</button></div>{notesPanel(client.id)}{provisionPanel(client.id)}<Panel title="Arquivo de documentos" caption="PDF, imagens, Word e Excel; validade e consulta autorizada serão conservadas." action={writable && <button onClick={() => start({ kind: 'document', clientId: client.id })}>Adicionar documento</button>}>{state.attachments.filter(a => a.clientId === client.id && a.type !== 'Ligação fictícia').map(a => <p key={a.id}>{a.name} <span className="badge">Só referência fictícia</span></p>)}<p className="empty">Os ficheiros reais e o Storage não são utilizados nesta demonstração.</p></Panel><Panel title="Facturas do cliente" caption="Leitura e afectação de ficheiros: funcionalidade actual em preparação."><p>O registo da factura de uma pendência continua disponível no Financeiro. A leitura de PDF/imagem e a grelha de interpretação são mapeadas separadamente, sem as apresentar como concluídas.</p></Panel></>}
    </>
  }

  function financePage() {
    const tab = route.financeTab ?? 'por-facturar'
    const latestNotes = scopedNotes
    const unbilled = scopedEntries.filter(e => !e.invoiced && !e.paid && e.treatment === 'Normal' && !e.noteId)
    const unpaid = scopedEntries.filter(e => e.invoiced && !e.paid && !e.noteId && e.treatment === 'Normal')
    return <><nav className="tabs" aria-label="Áreas do Financeiro">{financeTabs.map(item => <button className={tab === item.id ? 'active' : ''} aria-current={tab === item.id ? 'page' : undefined} key={item.id} onClick={() => navigate({ ...route, area: 'financeiro', financeTab: item.id, focus: undefined })}>{item.label}</button>)}</nav>
      {tab === 'honorarios' && notesPanel()}{tab === 'provisoes' && provisionPanel()}
      {tab === 'por-facturar' && <Panel title="Por facturar" caption="Registar a factura é uma operação distinta de receber o pagamento.">{unbilled.map(e => <article className="list-item" key={e.id}><div><ClientLabel client={state.clients.find(c => c.id === e.clientId)} onOpen={() => openClient(e.clientId, 'financeiro')} /><p>{e.description} · {money(e.amount)}</p></div>{writable && <button onClick={() => start({ kind: 'invoice', clientId: e.clientId, entryId: e.id })}>Registar factura</button>}</article>)}{latestNotes.filter(n => !n.invoice).map(n => <article className="list-item" key={n.id}><div><strong>{n.id}</strong><p>Nota de honorários · {money(n.amount)}</p></div>{writable && <button onClick={() => start({ kind: 'invoice', clientId: n.clientId, noteId: n.id })}>Registar factura</button>}</article>)}{scopedRetainers.filter(r => !r.invoice).map(r => <article className="list-item" key={r.id}><div><strong>Avença · {state.clients.find(c => c.id === r.clientId)?.name}</strong><p>{money(r.amount)} · prestação pendente</p></div>{writable && <button onClick={() => start({ kind: 'invoice', clientId: r.clientId, retainerId: r.id })}>Registar factura</button>}</article>)}</Panel>}
      {tab === 'por-receber' && <Panel title="Clientes por receber" caption="Abrir a ficha ou seguir directamente para o recebimento.">{scopeClients.map(c => <article className="list-item" key={c.id}><div><ClientLabel client={c} onOpen={() => openClient(c.id, 'financeiro')} /><p>{money(latestNotes.filter(n => n.clientId === c.id).reduce((sum, n) => sum + remaining(n), 0) + unpaid.filter(e => e.clientId === c.id).reduce((sum, e) => sum + e.amount, 0))} em documentos/registos da demonstração</p></div><div className="actions">{writable && <button onClick={() => start({ kind: 'collection', clientId: c.id })}>Preparar cobrança</button>}<button onClick={() => navigate({ area: 'financeiro', financeTab: 'pagamentos' })}>Ver pagamentos</button></div></article>)}</Panel>}
      {tab === 'pagamentos' && <>{route.focus !== 'receipts' && <><div className="metrics payment-queues"><div><small>Registos não facturados</small><strong>{unbilled.length}</strong><button onClick={() => navigate({ area: 'financeiro', financeTab: 'por-facturar' })}>Abrir fila</button></div><div><small>Registos facturados não pagos</small><strong>{unpaid.length}</strong><button aria-pressed={paymentQueue === 'work'} onClick={() => setPaymentQueue('work')}>Abrir fila de registos</button></div><div><small>Notas de honorários não pagas</small><strong>{latestNotes.filter(n => remaining(n) > 0).length}</strong><button aria-pressed={paymentQueue === 'note'} onClick={() => setPaymentQueue('note')}>Abrir fila de notas</button></div><div><small>Avenças não pagas</small><strong>{scopedRetainers.filter(r => !r.paid).length}</strong><button aria-pressed={paymentQueue === 'retainer'} onClick={() => setPaymentQueue('retainer')}>Abrir fila de avenças</button></div></div><button onClick={() => setPaymentQueue('all')}>Mostrar todas as filas</button><Panel title="Registar recebimentos" caption="Parcial/total nas notas; integral em registos e prestações. Sem duplicação de movimentos cobertos por notas.">
        {(paymentQueue === 'all' || paymentQueue === 'note') && latestNotes.filter(n => n.invoice && remaining(n) > 0).map(n => <article className="list-item" key={n.id}><div><strong>{n.id} · {state.clients.find(c => c.id === n.clientId)?.name}</strong><p>Saldo {money(remaining(n))} · parcial ou total</p></div>{writable && <button className="primary" onClick={() => start({ kind: 'payment', clientId: n.clientId, noteId: n.id })}>Registar pagamento</button>}</article>)}
        {(paymentQueue === 'all' || paymentQueue === 'work') && unpaid.map(e => <article className="list-item" key={e.id}><div><strong>{e.description}</strong><p>{money(e.amount)} · liquidação integral</p></div>{writable && <button onClick={() => start({ kind: 'payment', clientId: e.clientId, entryId: e.id })}>Registar pagamento</button>}</article>)}
        {(paymentQueue === 'all' || paymentQueue === 'retainer') && scopedRetainers.filter(r => r.invoice && !r.paid).map(r => <article className="list-item" key={r.id}><div><strong>Avença · {state.clients.find(c => c.id === r.clientId)?.name}</strong><p>{money(r.amount)} · liquidação integral</p></div>{writable && <button onClick={() => start({ kind: 'payment', clientId: r.clientId, retainerId: r.id })}>Registar pagamento</button>}</article>)}
      </Panel></>}<Panel title="Recebimentos registados" caption="Os recebimentos não entram no saldo de provisões.">{scopedReceipts.map(r => <article className="list-item" key={r.id}><div><strong>{money(r.amount)}</strong><small>{r.date} · {r.reference}</small><p>{state.clients.find(c => c.id === r.clientId)?.name}</p></div></article>)}</Panel></>}
    </>
  }

  function settingsPage() {
    const isRestricted = ['users', 'imports', 'import-review'].includes(route.setting ?? '')
    if ((isRestricted && !administrative) || (route.setting === 'access' && role !== 'owner')) return <Panel title="Acesso reservado"><p>Este percurso conserva a restrição do perfil actual. Use o perfil de ensaio apenas para explorar os destinos previstos, sem alterar permissões reais.</p></Panel>
    return <><Panel title="Dados base" caption="Configuração secundária; não ocupa o menu de trabalho diário."><div className="quick-actions">{['Clientes', 'Sociedades', 'Responsáveis'].map(name => <button key={name} onClick={() => name === 'Clientes' ? navigate({ area: 'clientes' }) : start({ kind: 'entity' })}>{name}</button>)}</div><p>Sociedades e responsáveis continuam a existir. As suas análises ficam nos filtros do Resumo.</p></Panel><Panel title="Administração" caption="Os perfis e permissões actuais mantêm-se."><div className="quick-actions"><button disabled={!administrative} onClick={() => navigate({ area: 'definicoes', setting: 'users' })}>Utilizadores</button><button disabled={role !== 'owner'} onClick={() => navigate({ area: 'definicoes', setting: 'access' })}>Registos de acesso</button><button disabled={!administrative} onClick={() => navigate({ area: 'definicoes', setting: 'imports' })}>Importações</button></div>{!administrative && <p className="inline-note">Administração e importações: Proprietário/Administrador. Registos de acesso: só Proprietário.</p>}{route.setting === 'users' && <p>Criação de utilizadores, reset do PIN e permissões por sociedade estão mapeados. A demonstração não cria contas nem recolhe dados de acesso.</p>}{route.setting === 'access' && <p>Histórico de acessos mapeado para este destino. Não foram consultados registos reais.</p>}</Panel>{route.setting === 'imports' && <Panel title="Importações" caption="Analisar → mapear colunas → validar → rever, antes de qualquer gravação."><button onClick={() => setImportReport(true)}>Analisar exemplo CSV fictício</button>{importReport && <div className="inline-note"><strong>Relatório de exemplo</strong><p>3 linhas fictícias: 2 elegíveis; 1 aviso de sociedade em falta. Hash, duplicados e gravação reutilizarão o importador existente.</p><button onClick={() => navigate({ area: 'definicoes', setting: 'import-review' })}>Rever ocorrências</button></div>}</Panel>}{route.setting === 'import-review' && <Panel title="Revisão de importações"><p>Ocorrência fictícia: linha 3 — Sociedade por atribuir. A revisão não elimina nem recalcula movimentos automaticamente.</p></Panel>}</>
  }

  return <div className="app"><Navigation route={route} open={mobileOpen} onClose={() => setMobileOpen(false)} onNavigate={navigate} role={role} /><div className="workspace"><div className="demo-banner"><span>PROTÓTIPO ISOLADO</span>Dados fictícios · alterações apenas nesta sessão · produção preservada</div><header className="topbar"><button className="icon-button menu-toggle" aria-label="Abrir navegação" onClick={() => setMobileOpen(true)}>☰</button><div className="breadcrumbs">Área de trabalho / {client ? 'Clientes / Ficha' : label}</div><div className="top-actions">{writable && <button className="primary" aria-expanded={addOpen} onClick={() => setAddOpen(!addOpen)}>+ Adicionar</button>}<button className="icon-button" aria-label={showValues ? 'Ocultar valores financeiros' : 'Mostrar valores financeiros'} onClick={() => setShowValues(!showValues)}>{showValues ? '◉' : '○'}</button><button className="icon-button" aria-label={dark ? 'Activar modo claro' : 'Activar modo escuro'} onClick={() => setDark(!dark)}>{dark ? '☀' : '☾'}</button><button className="icon-button" aria-label="Actualizar dados de demonstração" onClick={() => setNotice('Dados da sessão actualizados; os filtros e as alterações fictícias foram mantidos.')}>↻</button></div>{addOpen && <div className="add-menu" aria-label="Adicionar">{[['work', 'Registo'], ['expense', 'Despesa'], ['client', 'Cliente']].map(([kind, text]) => <button key={kind} onClick={() => start({ kind: kind as OperationRequest['kind'] })}>{text}</button>)}</div>}</header>
      <main><div className="page-heading"><div><p className="eyebrow">{client ? 'FICHA DO CLIENTE' : 'O SEU ESPAÇO DE TRABALHO'}</p><h1 ref={heading} tabIndex={-1}>{label}</h1><p>{client ? 'Dados, trabalho e financeiro no mesmo contexto.' : 'Menos percursos para a mesma operação. As funções continuam ao alcance.'}</p></div><button onClick={() => setCoverage(true)}>Ver funcionalidades preservadas</button></div>{notice && <p className="notice" role="status">{notice}</p>}
        {route.area === 'resumo' && summaryPage()}
        {route.area === 'clientes' && <>{!client && activeFilters()}{clientPage()}</>}{route.area === 'trabalho' && <>{filterToolbar()}{activeFilters()}{workPanel()}</>}{route.area === 'financeiro' && <>{filterToolbar()}{activeFilters()}{financePage()}</>}
        {route.area === 'notas' && <Panel title="Notas pessoais e partilhadas" caption="Tarefas e lembretes, sem alterar o workflow financeiro." action={writable && <button className="primary" onClick={() => start({ kind: 'memo' })}>Nova nota</button>}><label>Filtrar por urgência<select value={urgency} onChange={e => setUrgency(e.target.value)}><option>Todas</option><option>Normal</option><option>Atenção</option><option>Urgente</option><option>Crítico</option></select></label><div className="memo-grid">{state.memos.filter(m => urgency === 'Todas' || m.urgency === urgency).map(m => <article className="memo" key={m.id}><span className="badge">{m.urgency}</span><h3>{m.title}</h3><p>{m.body}</p><small>Partilha: {m.shared}</small><label className="check"><input type="checkbox" checked={m.completed} disabled={!writable} onChange={e => setState(s => ({ ...s, memos: s.memos.map(row => row.id === m.id ? { ...row, completed: e.target.checked } : row) }))} />Concluir tarefa</label>{writable && <button onClick={() => start({ kind: 'memo', memoId: m.id })}>Editar nota</button>}</article>)}</div><p className="inline-note">Imagens, anexos, voz e permissões por pessoa estão no inventário e conservam o módulo existente; não foi pedido acesso ao microfone neste ensaio.</p></Panel>}
        {route.area === 'definicoes' && settingsPage()}
      </main><footer className="review-footer"><span>Ensaio local • Azure, Auth, base de dados e Storage sem pedidos</span><label>Perfil de ensaio<select value={role} onChange={e => { setRole(e.target.value as Role); setOperation(null); setAddOpen(false); if (e.target.value === 'viewer' && route.area === 'definicoes') navigate({ area: 'resumo' }) }}><option value="operator">Operador</option><option value="admin">Administrador</option><option value="owner">Proprietário</option><option value="viewer">Consulta</option></select></label><button onClick={() => { setState(createDemo()); setNotice('Demonstração reposta. Apenas os dados fictícios desta sessão foram reiniciados.') }}>Repor demonstração</button></footer>
    </div>{operation && <OperationDialog key={JSON.stringify(operation)} request={operation} state={state} onClose={() => setOperation(null)} onSubmit={submit} />}
    {coverage && <Modal title="Funcionalidades e integrações preservadas" onClose={() => setCoverage(false)}><div className="coverage"><p>{features.length} funções inventariadas. “Demonstrado” significa ensaio com dados fictícios; “Mapeado” indica o destino preparado. Nenhum estado confirma integração operacional.</p><label>Procurar função ou integração<input type="search" value={coverageQuery} onChange={e => setCoverageQuery(e.target.value)} placeholder="Tradução, provisão, credenciais…" /></label>{features.filter(f => `${f.name} ${f.integration} ${f.current} ${f.proposed}`.toLowerCase().includes(coverageQuery.toLowerCase())).map(f => <article key={f.id}><span className="badge">{f.status}</span><strong>{f.id} · {f.name}</strong><p>Actual: {f.current}<br/>Proposto: {f.proposed}</p><small>{f.integration} · {f.access}</small><button onClick={() => { setCoverage(false); navigate({ area: f.area }) }}>Explorar destino</button></article>)}</div></Modal>}
  </div>
}
