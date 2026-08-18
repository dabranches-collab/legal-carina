import { useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { hasSupabaseConfiguration, supabase } from '../../lib/supabase'
import { AuthContext } from './AuthContext'
import { authErrorMessage } from './messages'
import { LoginPage } from './LoginPage'
import { ResetPasswordPage } from './ResetPasswordPage'
import { InitialPinChangePage } from './InitialPinChangePage'
import type { ApplicationRole } from '../../types/database.types'

const passkeyOriginError=()=>{
  const host=window.location.hostname
  if(/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host))return 'As passkeys não aceitam um endereço IP como domínio. No desenvolvimento local, abra http://localhost:5173; na PWA publicada será usado o domínio HTTPS.'
  if(!window.isSecureContext&&host!=='localhost')return 'As passkeys exigem um domínio HTTPS seguro.'
  return null
}

function ConfigurationRequired() {
  return <main className="grid min-h-screen place-items-center bg-background p-6"><section className="card max-w-lg p-7"><p className="text-xs font-semibold uppercase tracking-widest text-warning">Configuração local necessária</p><h1 className="mt-2 font-display text-2xl font-semibold">Supabase Auth não configurado</h1><p className="mt-3 text-sm leading-6 text-text-secondary">Copie <code>.env.example</code> para <code>.env.local</code> e preencha apenas a URL e a chave publicável do projecto. Nunca use a service role no frontend.</p></section></main>
}

async function recordSecurityEvent(eventType: string, email?: string) {
  try { await supabase?.functions.invoke('security-event', { body: { eventType, email } }) } catch { /* best-effort: auth must not leak logging internals */ }
}

async function getAccessStatus(currentUser?:User|null) {
  if (!supabase) return { active:false,mustChangePin:false,role:null as ApplicationRole|null }
  const [{data,error},membership]=await Promise.all([
    supabase.rpc('get_my_access_status'),
    supabase.from('firm_members').select('role').eq('user_id',currentUser?.id??'').eq('active',true).limit(1).maybeSingle(),
  ])
  const status=Array.isArray(data)?data[0]:data
  const role=(membership.data?.role??null) as ApplicationRole|null
  if(error&&import.meta.env.DEV)return {active:true,mustChangePin:currentUser?.app_metadata?.must_change_pin===true,role}
  if(error||membership.error||!status||status.active!==true||!role)return {active:false,mustChangePin:false,role:null}
  return {active:true,mustChangePin:status.must_change_pin===true,role}
}

export function AuthGate({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<ApplicationRole | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [mustChangePin, setMustChangePin] = useState(false)
  const [recoveryMode, setRecoveryMode] = useState(() => {
    const authFlowType = new URLSearchParams(window.location.hash.slice(1)).get('type')
    return window.location.pathname === '/reset-password' || authFlowType === 'recovery' || authFlowType === 'invite'
  })

  useEffect(() => {
    const client = supabase
    if (!client) { setLoading(false); return }
    let active = true
    const initialize = async () => {
      const { data: { session: initialSession } } = await client.auth.getSession()
      if (!active || !initialSession) { setLoading(false); return }
      const { data, error: userError } = await client.auth.getUser()
      if (!active) return
      const verifiedUser=data.user??initialSession.user
      if ((userError || !data.user) && !import.meta.env.DEV) { await client.auth.signOut(); setLoading(false); return }
      const accessStatus=await getAccessStatus(verifiedUser)
      if (!active) return
      if (!accessStatus.active) { if(!import.meta.env.DEV)await client.auth.signOut();setLoading(false);return }
      setSession(initialSession); setUser(verifiedUser)
      setRole(accessStatus.role)
      setMustChangePin(accessStatus.mustChangePin)
      if (active) setLoading(false)
    }
    void initialize()
    const { data: listener } = client.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return
      if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true)
      setSession(nextSession); setUser(nextSession?.user ?? null)
      if (!nextSession) { setRole(null); setMustChangePin(false); setLoading(false) }
    })
    return () => { active = false; listener.subscription.unsubscribe() }
  }, [])

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
    const accessStatus=await getAccessStatus(sessionData.user)
    if(!accessStatus.active){await supabase.auth.signOut();setError('Este acesso está suspenso ou deixou de estar autorizado.');setBusy(false);return}
    setUser(sessionData.user); setSession(sessionData.session);setRole(accessStatus.role)
    setMustChangePin(data.mustChangePin === true || accessStatus.mustChangePin || sessionData.user.app_metadata?.must_change_pin === true)
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
    const originError=passkeyOriginError();if(originError){setError(originError);return}
    setBusy(true); setError(''); setNotice('')
    const { data, error: passkeyError } = await supabase.auth.signInWithPasskey()
    if (passkeyError || !data.user) setError('Não foi possível usar a passkey. Se mudou de dispositivo ou perdeu o acesso, utilize a recuperação por email.')
    else {
      const accessStatus=await getAccessStatus(data.user)
      if(!accessStatus.active){await supabase.auth.signOut();setError('Este acesso está suspenso ou deixou de estar autorizado.')}
      else { setUser(data.user); setSession(data.session); setRole(accessStatus.role); setMustChangePin(accessStatus.mustChangePin); await recordSecurityEvent('login_succeeded') }
    }
    setBusy(false)
  }

  async function enrollPasskey() {
    if (!supabase) return 'Supabase Auth não está configurado.'
    const originError=passkeyOriginError();if(originError){setError(originError);return originError}
    setBusy(true); setError(''); setNotice('')
    const { error: passkeyError } = await supabase.auth.registerPasskey()
    if (passkeyError) {
      const technicalMessage = passkeyError instanceof Error ? passkeyError.message : String(passkeyError)
      const safeMessage = technicalMessage.replace(/[\r\n]+/g, ' ').slice(0, 240)
      setError('Não foi possível criar a passkey neste dispositivo.')
      setBusy(false)
      return safeMessage || 'O dispositivo recusou a criação da passkey.'
    }
    else { setNotice('Passkey activada. Nos próximos acessos pode usar o PIN, Face ID ou biometria deste dispositivo.'); await recordSecurityEvent('passkey_registered') }
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
    }
    setBusy(false)
    return true
  }

  async function signOut() {
    await recordSecurityEvent('logout'); await supabase?.auth.signOut(); setUser(null); setSession(null); setRole(null); setMustChangePin(false)
  }

  async function changeInitialPin(currentPin:string,newPin:string) {
    if (!supabase) return
    setBusy(true); setError('')
    const { data, error:changeError } = await supabase.functions.invoke('change-pin', { body:{ currentPin,newPin } })
    if (changeError || data?.error) { setError(data?.error ?? 'Não foi possível alterar o PIN.'); setBusy(false); return }
    const { data:refreshed, error:refreshError } = await supabase.auth.refreshSession()
    if (refreshError || !refreshed.session) { await signOut(); return }
    setSession(refreshed.session); setUser(refreshed.user); setMustChangePin(false)
    setBusy(false)
  }

  if (!hasSupabaseConfiguration) return <ConfigurationRequired />
  if (loading) return <div role="status" className="grid min-h-screen place-items-center bg-background text-sm text-text-secondary">A validar sessão segura…</div>
  if (recoveryMode && session) return <ResetPasswordPage busy={busy} error={error} onSubmit={async (password) => { await updatePassword(password) }} />
  if (!user || !session) return <LoginPage busy={busy} error={error} notice={notice} onPinLogin={loginWithPin} onRecover={recover} onPasskeyLogin={loginWithPasskey} onClearError={() => setError('')} />
  if (mustChangePin) return <InitialPinChangePage busy={busy} error={error} onSubmit={changeInitialPin} onLogout={signOut}/>
  return <AuthContext.Provider value={{ user, role, signOut, updatePassword, enrollPasskey }}>{children}</AuthContext.Provider>
}
