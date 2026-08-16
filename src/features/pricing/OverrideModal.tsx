import { useEffect, useRef, useState, type FormEvent } from 'react'

interface OverrideModalProps {
  open: boolean
  fieldLabel: string
  originalValue: string
  calculatedValue: string
  onCancel: () => void
  onConfirm: (input: { newValue: string; reason: string }) => void
}

export function OverrideModal({ open, fieldLabel, originalValue, calculatedValue, onCancel, onConfirm }: OverrideModalProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [newValue, setNewValue] = useState('')
  const [reason, setReason] = useState('')

  useEffect(() => {
    const element = dialog.current
    if (!element) return
    if (open && !element.open) {
      if (typeof element.showModal === 'function') element.showModal()
      else element.setAttribute('open', '')
    }
    if (!open && element.open) {
      if (typeof element.close === 'function') element.close()
      else element.removeAttribute('open')
    }
  }, [open])

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!newValue.trim() || !reason.trim()) return
    onConfirm({ newValue: newValue.trim(), reason: reason.trim() })
  }

  return (
    <dialog ref={dialog} onCancel={(event) => { event.preventDefault(); onCancel() }} aria-labelledby="override-title"
      className="m-auto w-[min(34rem,calc(100%-2rem))] rounded-2xl border border-border bg-surface p-0 text-text-primary shadow-raised backdrop:bg-primary/45">
      <form onSubmit={submit} className="p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">Alteração protegida</p>
        <h2 id="override-title" className="mt-2 font-display text-2xl font-semibold">Alterar {fieldLabel}</h2>
        <dl className="mt-6 grid gap-3 rounded-xl bg-surface-subtle p-4 sm:grid-cols-2">
          <div><dt className="text-xs text-text-secondary">Valor original</dt><dd className="financial-value font-semibold">{originalValue}</dd></div>
          <div><dt className="text-xs text-text-secondary">Valor calculado</dt><dd className="financial-value font-semibold">{calculatedValue}</dd></div>
        </dl>
        <label className="mt-5 block text-sm font-semibold" htmlFor="override-value">Novo valor</label>
        <input id="override-value" required value={newValue} onChange={(event) => setNewValue(event.target.value)}
          className="control mt-2 w-full px-3 py-2" />
        <label className="mt-4 block text-sm font-semibold" htmlFor="override-reason">Motivo da alteração</label>
        <textarea id="override-reason" required value={reason} onChange={(event) => setReason(event.target.value)} rows={3}
          className="control mt-2 w-full px-3 py-2" />
        <p className="mt-4 text-sm text-text-secondary">A confirmação cria um override manual e um registo de auditoria. Uma nova regra de preço não o substituirá.</p>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="control px-4 py-2 font-semibold">Cancelar</button>
          <button type="submit" className="rounded-lg bg-primary px-4 py-2 font-semibold text-surface">Confirmar alteração</button>
        </div>
      </form>
    </dialog>
  )
}
