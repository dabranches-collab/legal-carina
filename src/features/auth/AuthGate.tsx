import { useCallback, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { hasSupabaseConfiguration, supabase } from '../../lib/supabase'
import type { LegalDocumentRow } from '../../types/database.types'
import { AuthContext } from './AuthContext'
import { authErrorMessage } from './messages'
import { LoginPage } from './LoginPage'
import { ResetPasswordPage } from './ResetPasswordPage'
import { TermsModal } from './TermsModal'

function ConfigurationRequired() {
  return <main className="grid min-h-screen place-items-center bg-background p-6"><section className="card max-w-lg p-7"><p className="text-xs font-semibold uppercase tracking-widest text-warning">Configuração local necessária</p><h1 className="mt-2 font-display text-2xl font-semibold">Supabase Auth não configurado</h1><p className="mt-3 text-sm leading-6 text-text-secondary">Copie <code>.env.example</code> para <code>.env.local</code> e preencha apenas a URL e a chave publicável do projeto. Nunca use a service role no frontend.</p></section></main>
}

function LegalConfigurationRequired({ onLogout }: { onLogout: () => Promise<void> }) {
  return <main className="grid min-h-screen place-items-center bg-background p-6"><section role="alert" className="card max-w-xl p-7"><p className="text-xs font-semibold uppercase tracking-widest text-danger">Acesso bloqueado</p><h1 className="mt-2 font-display text-2xl font-semibold">Documentos legais não publicados</h1><p className="mt-3 text-sm leading-6 text-text-secondary">A administração deve publicar versões juridicamente aprovadas dos Termos de Serviço, Política de Privacidade e Termos de RGPD. Não é possível contornar esta validação.</p><button onClick={() => void onLogout()} className="mt-6 rounded-lg bg-primary px-4 py-2 font-semibold text-surface">Terminar sessão</button></section></main>
}

async function recordSecurityEvent(eventType: string, email?: string) {
  try { await supabase?.functions.invoke('security-event', { body: { eventType, email } }) } catch { /* best-effort: auth must not leak logging internals */ }
}

export function AuthGate({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [documents, setDocuments] = useState<LegalDocumentRow[]>([])
  const [accepted, setAccepted] = useState(false)
  const [legalConfigured, setLegalConfigured] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [recoveryMode, setRecoveryMode] = useState(() => {
    const authFlowType = new URLSearchParams(window.location.hash.slice(1)).get('type')
    return window.location.pathname === '/reset-password' || authFlowType === 'recovery' || authFlowType === 'invite'
  })

  const loadLegalState = useCallback(async (currentUser: User) => {
    const client = supabase
    if (!client) return
    const { data: currentDocuments, error: documentsError } = await client.from('legal_documents')
      .select('id, document_type, version, title, body_markdown, effective_at, content_hash, status')
      .eq('status', 'published').lte('effective_at', new Date().toISOString())
    if (documentsError) throw documentsError
    if (currentDocuments.length !== 3) { setLegalConfigured(false); setAccepted(false); return }
    setLegalConfigured(true)
    const { data: acceptances, error: acceptanceError } = await client.from('user_legal_acceptances')
      .select('legal_document_id').eq('user_id', currentUser.id)
    if (acceptanceError) throw acceptanceError
    const acceptedIds = new Set(acceptances.map((acceptance) => acceptance.legal_document_id))
    const pending = currentDocuments.filter((document) => !acceptedIds.has(document.id))
    setDocuments(pending)
    setAccepted(pending.length === 0)
  }, [])

  useEffect(() => {
    const client = supabase
    if (!client) { setLoading(false); return }
    let active = true
    const initialize = async () => {
      const { data: { session: initialSession } } = await client.auth.getSession()
      if (!active || !initialSession) { setLoading(false); return }
      const { data, error: userError } = await client.auth.getUser()
      if (!active) return
      if (userError || !data.user) { await client.auth.signOut(); setLoading(false); return }
      setSession(initialSession); setUser(data.user)
      try { await loadLegalState(data.user) } catch (reason) { setError(authErrorMessage(reason)) }
      finally { if (active) setLoading(false) }
    }
    void initialize()
    const { data: listener } = client.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return
      if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true)
      setSession(nextSession); setUser(nextSession?.user ?? null)
      if (!nextSession) { setAccepted(false); setDocuments([]); setLoading(false) }
    })
    return () => { active = false; listener.subscription.unsubscribe() }
  }, [loadLegalState])

  async function login(email: string, password: string) {
    if (!supabase) return
    setBusy(true); setError(''); setNotice('')
    const { data, error: loginError } = await supabase.auth.signInWithPassword({ email, password })
    if (loginError || !data.user) { await recordSecurityEvent('login_failed', email); setError(authErrorMessage(loginError)); setBusy(false); return }
    setUser(data.user); setSession(data.session)
    try { await recordSecurityEvent('login_succeeded'); await loadLegalState(data.user) }
    catch (reason) { setError(authErrorMessage(reason)) }
    finally { setBusy(false) }
  }

  async function recover(email: string) {
    if (!supabase) return
    setBusy(true); setError(''); setNotice('')
    const redirectTo = `${window.location.origin}/reset-password`
    const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    await recordSecurityEvent('password_recovery_requested', email)
    if (recoveryError) setError(authErrorMessage(recoveryError))
    else setNotice('Se o endereço estiver autorizado, receberá um email com os próximos passos.')
    setBusy(false)
  }

  async function updatePassword(password: string) {
    if (!supabase) return
    setBusy(true); setError('')
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) setError(authErrorMessage(updateError))
    else {
      await recordSecurityEvent('password_changed')
      window.history.replaceState({}, '', '/')
      setRecoveryMode(false)
      if (user) await loadLegalState(user)
    }
    setBusy(false)
  }

  async function acceptTerms() {
    if (!supabase || documents.length !== 3) return
    setBusy(true); setError('')
    const evidence = { user_agent: navigator.userAgent, locale: navigator.language, accepted_via: 'web' }
    const { error: acceptanceError } = await supabase.rpc('accept_legal_documents', { target_document_ids: documents.map(({ id }) => id), acceptance_evidence: evidence })
    if (acceptanceError) setError('Não foi possível registar todas as aceitações. O acesso continua bloqueado.')
    else { setDocuments([]); setAccepted(true) }
    setBusy(false)
  }

  async function signOut() {
    await recordSecurityEvent('logout'); await supabase?.auth.signOut(); setUser(null); setSession(null); setAccepted(false)
  }

  if (!hasSupabaseConfiguration) return <ConfigurationRequired />
  if (loading) return <div role="status" className="grid min-h-screen place-items-center bg-background text-sm text-text-secondary">A validar sessão segura…</div>
  if (recoveryMode && session) return <ResetPasswordPage busy={busy} error={error} onSubmit={updatePassword} />
  if (!user || !session) return <LoginPage busy={busy} error={error} notice={notice} onLogin={login} onRecover={recover} />
  if (!legalConfigured) return <LegalConfigurationRequired onLogout={signOut} />
  if (!accepted) return <TermsModal documents={documents} busy={busy} error={error} onAccept={acceptTerms} />
  return <AuthContext.Provider value={{ user, signOut }}>{children}</AuthContext.Provider>
}
