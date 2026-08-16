import { useState, type FormEvent } from 'react'

interface LoginPageProps {
  busy: boolean
  error: string
  notice: string
  onPinLogin: (username: string, pin: string) => Promise<void>
  onRecover: (email: string) => Promise<void>
  onPasskeyLogin: () => Promise<void>
  onClearError: () => void
}

export function LoginPage({ busy, error, notice, onPinLogin, onRecover, onPasskeyLogin, onClearError }: LoginPageProps) {
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [email, setEmail] = useState('')
  const [recovery, setRecovery] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (recovery) await onRecover(email)
    else await onPinLogin(username, pin)
  }

  return <main className="app-safe-screen grid bg-background lg:grid-cols-[1.05fr_.95fr]">
    <section className="hidden bg-primary p-12 text-surface lg:flex lg:flex-col lg:justify-between">
      <div><div className="grid size-12 place-items-center rounded-xl border border-accent/50 font-display text-xl text-accent">CS</div><p className="mt-8 max-w-lg font-display text-4xl leading-tight">Gestão de clientes e faturação com rigor, clareza e confidencialidade.</p></div>
      <p className="max-w-md text-sm leading-6 text-surface/65">Acesso reservado a utilizadores criados pela administração. A atividade de segurança pode ser auditada.</p>
    </section>
    <section className="flex items-center justify-center p-6 sm:p-10"><div className="w-full max-w-md">
      <div className="mb-8 lg:hidden"><div className="grid size-11 place-items-center rounded-xl bg-primary font-display text-surface">CS</div></div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">Carina - Legal</p>
      <h1 className="mt-2 font-display text-3xl font-semibold">{recovery ? 'Recuperar acesso' : 'Iniciar sessão'}</h1>
      <p className="mt-3 text-sm leading-6 text-text-secondary">{recovery ? 'A recuperação é enviada apenas para o email administrativo associado à conta.' : 'Introduza o nome de utilizador e o PIN definidos pela administração.'}</p>
      <form onSubmit={submit} className="mt-8 space-y-5">
        {recovery ? <label className="block text-sm font-semibold" htmlFor="recovery-email">Email administrativo<input id="recovery-email" required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="control mt-1 w-full px-3 py-2.5" /></label> : <>
          <label className="block text-sm font-semibold" htmlFor="auth-username">Nome de utilizador<input id="auth-username" required autoCapitalize="none" autoCorrect="off" autoComplete="username" minLength={3} maxLength={32} value={username} onChange={(event) => setUsername(event.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))} className="control mt-1 w-full px-3 py-2.5" /></label>
          <label className="block text-sm font-semibold" htmlFor="auth-pin">PIN de 4 algarismos<input id="auth-pin" required type="password" inputMode="numeric" autoComplete="current-password" pattern="[0-9]{4}" maxLength={4} value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 4))} className="control mt-1 w-full px-3 py-2.5 text-center text-xl tracking-[0.35em]" /></label>
        </>}
        {error && <p role="alert" className="rounded-lg bg-danger-soft p-3 text-sm text-danger">{error}</p>}
        {notice && <p role="status" className="rounded-lg bg-success-soft p-3 text-sm text-success">{notice}</p>}
        <button disabled={busy || (!recovery && (username.length < 3 || pin.length !== 4))} className="min-h-11 w-full rounded-lg bg-primary px-4 py-3 font-semibold text-surface transition-colors hover:bg-primary-hover disabled:opacity-50">{busy ? 'A processar…' : recovery ? 'Enviar recuperação' : 'Entrar'}</button>
      </form>
      {!recovery && <button type="button" disabled={busy} onClick={() => void onPasskeyLogin()} className="mt-3 min-h-11 w-full rounded-lg border border-border bg-surface px-4 py-3 font-semibold text-primary hover:bg-surface-muted disabled:opacity-50">Entrar com Face ID, Windows Hello ou passkey</button>}
      <button type="button" onClick={() => { onClearError(); setRecovery((value) => !value) }} className="mt-5 text-sm font-semibold text-secondary hover:underline">{recovery ? 'Voltar ao login' : 'Preciso de recuperar o acesso'}</button>
      <p className="mt-8 border-t border-border pt-5 text-xs leading-5 text-text-secondary">Não existe registo público. Os acessos são criados em Administração.</p>
    </div></section>
  </main>
}
