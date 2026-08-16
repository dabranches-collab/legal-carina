import { useCallback, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { hasSupabaseConfiguration, supabase } from '../../lib/supabase'
import type { LegalDocumentRow } from '../../types/database.types'
import { AuthContext } from './AuthContext'
import { authErrorMessage } from './messages'
import { LoginPage } from './LoginPage'
import { ResetPasswordPage } from './ResetPasswordPage'
import { TermsModal } from './TermsModal'

const requiresLegalAcceptance = import.meta.env.VITE_REQUIRE_LEGAL_ACCEPTANCE === 'true'

function ConfigurationRequired() {
  return <main className="grid min-h-screen place-items-center bg-background p-6"><section className="card max-w-lg p-7"><p className="text-xs font-semibold uppercase tracking-widest text-warning">Configuração local necessária</p><h1 className="mt-2 font-display text-2xl font-semibold">Supabase Auth não configurado</h1><p className="mt-3 text-sm leading-6 text-text-secondary">Copie <code>.env.example</code> para <code>.env.local</code> e preencha apenas a URL e a chave publicável do projeto. Nunca use a service role no frontend.</p></section></main>
}

function LegalConfigurationRequired({ busy, error, notice, onEnrollPasskey, onLogout }: { busy: boolean; error: string; notice: string; onEnrollPasskey: () => Promise<void>; onLogout: () => Promise<void> }) {
  return <main className="grid min-h-screen place-items-center bg-background p-6"><section role="alert" className="card max-w-xl p-7"><p className="text-xs font-semibold uppercase tracking-widest text-danger">Acesso bloqueado</p><h1 className="mt-2 font-display text-2xl font-semibold">Documentos legais não publicados</h1><p className="mt-3 text-sm leading-6 text-text-secondary">A administração deve publicar versões juridicamente aprovadas dos Termos de Serviço, Política de Privacidade e Termos de RGPD. Não é possível contornar esta validação.</p><div className="mt-6 grid gap-3 sm:grid-cols-2"><button disabled={busy} onClick={() => void onEnrollPasskey()} className="rounded-lg bg-primary px-4 py-2 font-semibold text-surface disabled:opacity-50">{busy ? 'A configurar…' : 'Ativar passkey neste dispositivo'}</button><button onClick={() => void onLogout()} className="rounded-lg border border-border bg-surface px-4 py-2 font-semibold text-primary">Terminar sessão</button></div>{notice && <p role="status" className="mt-4 rounded-lg bg-success-soft p-3 text-sm text-success">{notice}</p>}{error && <p role="alert" className="mt-4 rounded-lg bg-danger-soft p-3 text-sm text-danger">{error}</p>}</section></main>
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
    if (!requiresLegalAcceptance) {
      setLegalConfigured(true)
      setDocuments([])
      setAccepted(true)
      return
    }
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

  async function loginWithPin(username: string, pin: string) {
    if (!supabase) return
    setBusy(true); setError(''); setNotice('')
    const { data, error: invokeError } = await supabase.functions.invoke('pin-auth', { body: { username, pin } })
    if (invokeError || data?.error || !data?.session?.access_token || !data?.session?.refresh_token) {
      setError(data?.error ?? 'Nome de utilizador ou PIN inválido.')
      setBusy(false)
      return
    }
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession(data.session)
    if (sessionError || !sessionData.user || !sessionData.session) {
      setError('Não foi possível iniciar a sessão. Tente novamente.')
      setBusy(false)
      return
    }
    setUser(sessionData.user); setSession(sessionData.session)
    try { await loadLegalState(sessionData.user) } catch (reason) { setError(authErrorMessage(reason)) }
    setBusy(false)
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

  async function loginWithPasskey() {
    if (!supabase) return
    setBusy(true); setError(''); setNotice('')
    const { data, error: passkeyError } = await supabase.auth.signInWithPasskey()
    if (passkeyError || !data.user) setError('Não foi possível usar a passkey. Se mudou de dispositivo ou perdeu o acesso, utilize a recuperação por email.')
    else { setUser(data.user); setSession(data.session); await recordSecurityEvent('login_succeeded'); try { await loadLegalState(data.user) } catch (reason) { setError(authErrorMessage(reason)) } }
    setBusy(false)
  }

  async function enrollPasskey() {
    if (!supabase) return 'Supabase Auth não está configurado.'
    setBusy(true); setError(''); setNotice('')
    const { error: passkeyError } = await supabase.auth.registerPasskey()
    if (passkeyError) {
      const technicalMessage = passkeyError instanceof Error ? passkeyError.message : String(passkeyError)
      const safeMessage = technicalMessage.replace(/[\r\n]+/g, ' ').slice(0, 240)
      setError('Não foi possível criar a passkey neste dispositivo.')
      setBusy(false)
      return safeMessage || 'O dispositivo recusou a criação da passkey.'
    }
    else { setNotice('Passkey ativada. Nos próximos acessos pode usar o PIN, Face ID ou biometria deste dispositivo.'); await recordSecurityEvent('passkey_registered') }
    setBusy(false)
    return null
  }

  async function updatePassword(password: string) {
    if (!supabase) return false
    setBusy(true); setError('')
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) { setError(authErrorMessage(updateError)); setBusy(false); return false }
    else {
      await recordSecurityEvent('password_changed')
      window.history.replaceState({}, '', '/')
      setRecoveryMode(false)
      if (user) await loadLegalState(user)
    }
    setBusy(false)
    return true
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
  if (recoveryMode && session) return <ResetPasswordPage busy={busy} error={error} onSubmit={async (password) => { await updatePassword(password) }} />
  if (!user || !session) return <LoginPage busy={busy} error={error} notice={notice} onPinLogin={loginWithPin} onRecover={recover} onPasskeyLogin={loginWithPasskey} onClearError={() => setError('')} />
  if (requiresLegalAcceptance && !legalConfigured) return <LegalConfigurationRequired busy={busy} error={error} notice={notice} onEnrollPasskey={async () => { await enrollPasskey() }} onLogout={signOut} />
  if (requiresLegalAcceptance && !accepted) return <TermsModal documents={documents} busy={busy} error={error} onAccept={acceptTerms} />
  return <AuthContext.Provider value={{ user, signOut, updatePassword, enrollPasskey }}>{children}</AuthContext.Provider>
}
