import { useState, type FormEvent } from 'react'

export function PasswordModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (password: string) => Promise<boolean> }) {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const mismatch = confirmation.length > 0 && password !== confirmation

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (mismatch || password.length < 12) return
    setBusy(true); setError('')
    const updated = await onSubmit(password)
    setBusy(false)
    if (updated) onClose()
    else setError('Não foi possível guardar a password. Confirme os requisitos e tente novamente.')
  }

  return <div className="app-safe-fixed fixed z-50 grid place-items-center bg-primary/45 p-4" role="presentation">
    <section role="dialog" aria-modal="true" aria-labelledby="password-title" className="card w-full max-w-md p-6">
      <h2 id="password-title" className="font-display text-2xl font-semibold">Definir password</h2>
      <p className="mt-2 text-sm leading-6 text-text-secondary">Escolha uma password que não tenha usado noutro serviço. Ela não será mostrada nem guardada pela interface.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <label className="block text-sm font-semibold" htmlFor="account-password">Nova password</label>
        <input id="account-password" type="password" minLength={12} required autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="control w-full px-3" />
        <label className="block text-sm font-semibold" htmlFor="account-password-confirmation">Confirmar password</label>
        <input id="account-password-confirmation" type="password" minLength={12} required autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="control w-full px-3" />
        <p className="text-xs leading-5 text-text-secondary">Mínimo de 12 caracteres, incluindo maiúscula, minúscula, número e símbolo.</p>
        {mismatch && <p role="alert" className="text-sm text-danger">As passwords não coincidem.</p>}
        {error && <p role="alert" className="rounded-lg bg-danger-soft p-3 text-sm text-danger">{error}</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-3 font-semibold">Cancelar</button>
          <button disabled={busy || mismatch || password.length < 12} className="rounded-lg bg-primary px-4 py-3 font-semibold text-surface disabled:opacity-50">{busy ? 'A guardar…' : 'Guardar password'}</button>
        </div>
      </form>
    </section>
  </div>
}
