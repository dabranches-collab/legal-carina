import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { clientTabs, euro, languages, menus, noteCopy, operationLabels, remaining } from './model'
import type { Client, ClientTab, DemoState, Draft, OperationRequest, Role, Route } from './model'

export function Navigation({ route, open, onClose, onNavigate, role }: { route: Route; open: boolean; onClose: () => void; onNavigate: (route: Route) => void; role: Role }) {
  return <>
    {open && <button className="nav-backdrop" aria-label="Fechar navegação" onClick={onClose} />}
    <aside className={`navigation ${open ? 'is-open' : ''}`} aria-label="Navegação principal">
      <a className="brand" href="#resumo" onClick={e => { e.preventDefault(); onNavigate({ area: 'resumo' }) }}><span className="brand-mark">CS</span><span>Carina — Legal<small>GESTÃO DO ESCRITÓRIO</small></span></a>
      <button className="mobile-close" aria-label="Fechar menu" onClick={onClose}>×</button>
      <p className="nav-caption">ÁREA DE TRABALHO</p>
      <nav>{menus.map(menu => <button key={menu.id} className={route.area === menu.id ? 'selected' : ''} aria-current={route.area === menu.id ? 'page' : undefined} onClick={() => onNavigate({ area: menu.id })}><span aria-hidden="true">{menu.icon}</span>{menu.label}</button>)}</nav>
      <div className="nav-footer">{role !== 'viewer' && <button className={route.area === 'definicoes' ? 'selected' : ''} aria-current={route.area === 'definicoes' ? 'page' : undefined} onClick={() => onNavigate({ area: 'definicoes' })}>⚙ Definições</button>}<div className="profile"><span>OP</span><div>Operador de demonstração<small>Dados exclusivamente fictícios</small></div></div><small>Preparação 0.16.0-preview.2</small></div>
    </aside>
  </>
}

export function ClientNavigation({ tab, onChange }: { tab: ClientTab; onChange: (tab: ClientTab) => void }) {
  return <nav className="tabs client-tabs" aria-label="Áreas da ficha do cliente">{clientTabs.map(item => <button key={item.id} aria-current={tab === item.id ? 'page' : undefined} className={tab === item.id ? 'active' : ''} onClick={() => onChange(item.id)}>{item.label}</button>)}</nav>
}

export function Panel({ title, caption, action, children }: { title: string; caption?: string; action?: ReactNode; children: ReactNode }) {
  return <section className="panel"><div className="panel-heading"><div><h2>{title}</h2>{caption && <p>{caption}</p>}</div>{action}</div>{children}</section>
}

export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)
  useEffect(() => {
    if (!returnFocus.current) returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    ref.current?.showModal()
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = original; returnFocus.current?.focus() }
  }, [])
  return <dialog ref={ref} className="operation-dialog" aria-label={title} onCancel={e => { e.preventDefault(); onClose() }} onClick={e => { if (e.target === e.currentTarget) onClose() }}><div className="dialog-heading"><div><p className="eyebrow">DEMONSTRAÇÃO • SÓ NESTA SESSÃO</p><h2>{title}</h2></div><button className="icon-button" aria-label="Fechar formulário" onClick={onClose}>×</button></div>{children}</dialog>
}

function initialDraft(request: OperationRequest, state: DemoState): Draft {
  const entry = state.entries.find(item => item.id === request.entryId)
  const note = state.notes.find(item => item.id === request.noteId)
  const retainer = state.retainers.find(item => item.id === request.retainerId)
  const job = state.jobs.find(item => item.id === request.jobId)
  const memo = state.memos.find(item => item.id === request.memoId)
  const clientId = request.clientId ?? entry?.clientId ?? note?.clientId ?? retainer?.clientId ?? job?.clientId ?? state.clients[0].id
  const available = state.entries.filter(item => item.clientId === clientId && !item.noteId && item.treatment === 'Normal' && !item.paid)
  const defaultAmount = request.kind === 'collection'
    ? state.entries.filter(item => item.clientId === clientId && item.invoiced && !item.paid && !item.noteId).reduce((sum, row) => sum + row.amount, 0) + state.notes.filter(item => item.clientId === clientId && item.invoice && !item.voided).reduce((sum, item) => sum + remaining(item), 0)
    : available.reduce((sum, row) => sum + row.amount, 0)
  return {
    clientId, description: entry?.description ?? memo?.title ?? job?.title ?? note?.original ?? ((request.kind === 'note' || request.kind === 'collection') ? noteCopy.pt.text : ''),
    date: '2026-10-09', amount: String(request.kind === 'payment' ? note ? remaining(note) : entry?.amount ?? retainer?.amount ?? 90 : retainer?.amount ?? job?.amount ?? entry?.amount ?? (request.kind === 'note' || request.kind === 'collection' ? defaultAmount : '')),
    minutes: String(retainer?.hours ?? entry?.minutes ?? 60), language: note?.language ?? state.clients.find(item => item.id === clientId)?.language ?? 'pt', format: 'pdf',
    reference: memo?.body ?? note?.invoice ?? '', mode: entry?.treatment ?? retainer?.mode ?? 'Normal', period: retainer?.period ?? 'Anual',
    urgency: memo?.urgency ?? 'Normal', shared: memo?.shared ?? 'Não partilhar', failTranslation: false, provision: '0', fileName: '',
    targetId: request.noteId ?? request.entryId ?? request.retainerId ?? request.jobId ?? request.memoId ?? '',
  }
}

export function OperationDialog({ request, state, onClose, onSubmit }: { request: OperationRequest; state: DemoState; onClose: () => void; onSubmit: (draft: Draft) => Promise<string | undefined> }) {
  const [draft, setDraft] = useState(() => initialDraft(request, state))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState(false)
  const kind = request.kind
  const documentOperation = kind === 'note' || kind === 'collection'
  const note = state.notes.find(n => n.id === request.noteId)
  const title = request.entryId && (kind === 'work' || kind === 'expense') ? 'Editar registo' : operationLabels[kind]
  const field = (key: keyof Draft, value: string | boolean) => { setDraft(current => ({ ...current, [key]: value })); setError(''); setPreview(false) }
  const moneyField = <label>{kind === 'payment' ? 'Valor recebido (€)' : kind === 'provision' ? 'Total recebido, com IVA (€)' : documentOperation ? 'Total do documento de demonstração (€)' : 'Montante (€)'}<input type="number" inputMode="decimal" min="0.01" step="0.01" required value={draft.amount} readOnly={kind === 'payment' && !note} onChange={e => field('amount', e.target.value)} /></label>
  async function submit() {
    setBusy(true); setError('')
    try { const failure = await onSubmit(draft); if (failure) setError(failure) } catch { setError('Não foi possível concluir a operação de demonstração. Os dados reais não foram alterados.') } finally { setBusy(false) }
  }
  function showPreview() {
    if (draft.language !== 'pt' && draft.failTranslation) { setError('Tradução indisponível na simulação. A emissão fica bloqueada; escolha Português ou retire a falha de demonstração.'); return }
    setError(''); setPreview(true)
  }
  return <Modal title={title} onClose={onClose}><form onSubmit={e => { e.preventDefault(); void submit() }} className="operation-form">
    <p className="form-caption">O mesmo formulário é usado na lista global e na ficha do cliente. Nada é enviado para os serviços da aplicação.</p>
    <div className="form-grid">
      {!['memo', 'entity'].includes(kind) && <label>Cliente<select value={draft.clientId} onChange={e => { const client = state.clients.find(c => c.id === e.target.value); const entries = state.entries.filter(row => row.clientId === e.target.value && !row.noteId && row.treatment === 'Normal' && !row.paid); setDraft(current => ({ ...current, clientId: e.target.value, language: client?.language ?? 'pt', ...(documentOperation ? { amount: String(entries.reduce((sum, row) => sum + row.amount, 0)) } : {}) })); setPreview(false) }}>{state.clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label>}
      {kind === 'client' && <label>Nome do cliente<input required value={draft.description} onChange={e => field('description', e.target.value)} placeholder="Novo cliente — DEMO" /></label>}
      {kind === 'client' && <label>Tipo<select value={draft.mode} onChange={e => field('mode', e.target.value)}><option>Empresa</option><option>Particular</option><option>Misto</option></select></label>}
      {['work', 'expense', 'fixed', 'memo', 'entity', 'credential', 'document'].includes(kind) && <label className="span-two">{kind === 'memo' ? 'Título da nota' : kind === 'credential' ? 'Plataforma / ligação de exemplo' : kind === 'document' ? 'Título do documento' : kind === 'entity' ? 'Nome da entidade de demonstração' : 'Actividade / assunto'}<input required value={draft.description} onChange={e => field('description', e.target.value)} /></label>}
      {!['client', 'memo', 'entity', 'credential', 'document'].includes(kind) && <label>{kind === 'payment' ? 'Data do recebimento' : kind === 'invoice' ? 'Data da factura' : 'Data'}<input type="date" required value={draft.date} onChange={e => field('date', e.target.value)} /></label>}
      {['work', 'expense', 'fixed', 'retainer', 'provision', 'payment', 'note'].includes(kind) && moneyField}
      {kind === 'work' && <><label>Minutos<input type="number" min="1" step="1" required value={draft.minutes} onChange={e => field('minutes', e.target.value)} /></label><label>Tratamento<select value={draft.mode} onChange={e => field('mode', e.target.value)}><option>Normal</option><option>Avença</option><option>Preço fixo</option></select></label></>}
      {kind === 'expense' && <label>Comprovativo de exemplo<input type="file" accept="image/*,.pdf" onChange={e => field('fileName', e.target.files?.[0]?.name ?? '')} /><small>Só é registado o nome nesta demonstração.</small></label>}
      {['invoice', 'payment', 'provision'].includes(kind) && <label className="span-two">{kind === 'invoice' ? 'Número da factura' : 'Referência do recebimento'}<input required value={draft.reference} onChange={e => field('reference', e.target.value)} placeholder="DEMO-2026-001" /></label>}
      {kind === 'invoice' && <p className="inline-note span-two">A factura é registada separadamente do recebimento. Este protótipo não emite documentos fiscais.</p>}
      {kind === 'payment' && <><p className="inline-note span-two">{note ? `Nota ${note.id}: saldo ${euro(remaining(note))}. Pode receber parcial ou integralmente.` : 'Registos e prestações mantêm a liquidação integral. O recebimento não altera a facturação nem utiliza provisões.'}</p><label className="check span-two"><input type="checkbox" required />Confirmo que o valor de demonstração foi recebido.</label></>}
      {documentOperation && <><label>Idioma do documento<select value={draft.language} onChange={e => field('language', e.target.value)}>{Object.entries(languages).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Formato<select value={draft.format} onChange={e => field('format', e.target.value)}><option value="pdf">PDF</option><option value="word">Word (.docx)</option></select></label><label className="span-two">Descrição original<textarea value={draft.description} onChange={e => field('description', e.target.value)} /></label><label>Sociedade emissora<input readOnly value={state.clients.find(c => c.id === draft.clientId)?.society ?? ''} /></label><label>Destinatário<input readOnly value={state.clients.find(c => c.id === draft.clientId)?.name ?? ''} /></label>{kind === 'note' && <label>Provisão a aplicar (€)<input type="number" min="0" step="0.01" value={draft.provision} onChange={e => field('provision', e.target.value)} /></label>}<p className="inline-note span-two">Tradução de exemplo pré-preparada. A integração Azure Translator via Worker, os originais e as versões serão conservados na aplicação; este ensaio não faz pedidos ao tradutor.</p><details className="span-two"><summary>Ensaiar falha de tradução</summary><label className="check"><input type="checkbox" checked={draft.failTranslation} onChange={e => field('failTranslation', e.target.checked)} />Simular indisponibilidade da tradução EN/FR</label></details></>}
      {kind === 'retainer' && <><label>Modalidade<select value={draft.mode === 'Avença + horas' ? draft.mode : 'Simples'} onChange={e => field('mode', e.target.value)}><option>Simples</option><option>Avença + horas</option></select></label><label>Horas incluídas<input type="number" min="1" value={draft.minutes} required onChange={e => field('minutes', e.target.value)} /></label><label>Período do pacote<select value={draft.period} onChange={e => field('period', e.target.value)}><option>Mensal</option><option>Trimestral</option><option>Anual</option></select></label><p className="inline-note span-two">A demonstração mostra o contrato e o consumo. Cálculo dos excedentes, renovações e facturação conservam os motores actuais na futura integração.</p></>}
      {kind === 'memo' && <><label>Grau de urgência<select value={draft.urgency} onChange={e => field('urgency', e.target.value)}><option>Normal</option><option>Atenção</option><option>Urgente</option><option>Crítico</option></select></label><label>Partilha<select value={draft.shared} onChange={e => field('shared', e.target.value)}><option>Não partilhar</option><option>Consulta</option><option>Edição</option></select></label><label className="span-two">Conteúdo e tarefas<textarea value={draft.reference} onChange={e => field('reference', e.target.value)} /></label></>}
      {kind === 'document' && <label className="span-two">Ficheiro de exemplo<input type="file" accept=".pdf,.docx,.xlsx,image/*" required onChange={e => field('fileName', e.target.files?.[0]?.name ?? '')} /><small>A demonstração guarda apenas nome/título; não carrega o conteúdo.</small></label>}
      {kind === 'credential' && <p className="inline-note span-two">Use apenas uma plataforma fictícia. Credenciais reais, cifra e versões serão mantidas no componente actual; este protótipo não recebe passwords.</p>}
    </div>
    {preview && <section className="document-preview" aria-label="Pré-visualização do documento"><span className="badge">DEMONSTRAÇÃO • SEM VALIDADE</span><h3>{noteCopy[draft.language].title}</h3><p>{state.clients.find(c => c.id === draft.clientId)?.name}</p><p>{draft.language === 'pt' ? draft.description : noteCopy[draft.language].text}</p><strong>Total: {euro(Number(draft.amount) || 0)}</strong><small>Exemplo de apresentação; valores, tradução e emissão fictícios.</small></section>}
    {error && <p role="alert" className="error">{error}</p>}
    <footer className="dialog-actions"><button type="button" onClick={onClose}>Cancelar</button>{documentOperation && <button type="button" onClick={showPreview}>Pré-visualizar sem guardar</button>}<button className="primary" disabled={busy} type="submit">{busy ? 'A preparar…' : documentOperation ? `Emitir exemplo ${draft.format === 'pdf' ? 'PDF' : 'Word'}` : kind === 'payment' ? 'Registar pagamento' : 'Guardar demonstração'}</button></footer>
  </form></Modal>
}

export function ClientLabel({ client, onOpen }: { client?: Client; onOpen: () => void }) {
  return <button className="text-button" onClick={onOpen}>{client?.name ?? 'Cliente de demonstração'}</button>
}
