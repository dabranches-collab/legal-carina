import { useState, type FormEvent } from 'react'
import { Icon } from '../../components/ui/Icon'

interface LoginPageProps {
  busy: boolean
  error: string
  notice: string
  onLogin: (email: string, password: string) => Promise<void>
  onRecover: (email: string) => Promise<void>
}

export function LoginPage({ busy, error, notice, onLogin, onRecover }: LoginPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [recovery, setRecovery] = useState(false)
  async function submit(event: FormEvent) { event.preventDefault(); if (recovery) await onRecover(email); else await onLogin(email, password) }

  return <main className="grid min-h-screen bg-background lg:grid-cols-[1.05fr_.95fr]">
    <section className="hidden bg-primary p-12 text-surface lg:flex lg:flex-col lg:justify-between"><div><div className="grid size-12 place-items-center rounded-xl border border-accent/50 text-accent font-display text-xl">LC</div><p className="mt-8 max-w-lg font-display text-4xl leading-tight">Gestão jurídica com rigor, clareza e confidencialidade.</p></div><p className="max-w-md text-sm leading-6 text-surface/65">Acesso reservado a utilizadores convidados ou criados pela administração. A atividade de segurança pode ser auditada.</p></section>
    <section className="flex items-center justify-center p-6 sm:p-10"><div className="w-full max-w-md"><div className="mb-8 lg:hidden"><div className="grid size-11 place-items-center rounded-xl bg-primary font-display text-surface">LC</div></div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">Legal Carina</p><h1 className="mt-2 font-display text-3xl font-semibold">{recovery ? 'Recuperar password' : 'Iniciar sessão'}</h1><p className="mt-3 text-sm leading-6 text-text-secondary">{recovery ? 'Enviaremos um link de recuperação se o endereço estiver autorizado.' : 'Introduza as credenciais fornecidas pela administração.'}</p>
      <form onSubmit={submit} className="mt-8 space-y-5"><label className="block text-sm font-semibold" htmlFor="auth-email">Email</label><div className="relative"><Icon name="search" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-secondary"/><input id="auth-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="control w-full py-2.5 pl-10 pr-3"/></div>{!recovery && <><label className="block text-sm font-semibold" htmlFor="auth-password">Password</label><input id="auth-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="control w-full px-3 py-2.5"/></>}
        {error && <p role="alert" className="rounded-lg bg-danger-soft p-3 text-sm text-danger">{error}</p>}{notice && <p role="status" className="rounded-lg bg-success-soft p-3 text-sm text-success">{notice}</p>}
        <button disabled={busy} className="w-full rounded-lg bg-primary px-4 py-3 font-semibold text-surface transition-colors hover:bg-primary-hover disabled:opacity-50">{busy ? 'A processar…' : recovery ? 'Enviar link de recuperação' : 'Entrar'}</button>
      </form><button type="button" onClick={() => setRecovery((value) => !value)} className="mt-5 text-sm font-semibold text-secondary hover:underline">{recovery ? 'Voltar ao login' : 'Esqueci-me da password'}</button><p className="mt-8 border-t border-border pt-5 text-xs leading-5 text-text-secondary">Não existe registo público. Contacte a administração para obter acesso.</p>
    </div></section>
  </main>
}
