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
      className="m-auto w-[min(34rem,calc(100%-2rem))] rounded-2xl border border-black/10 bg-white p-0 text-ink-950 shadow-2xl backdrop:bg-black/45">
      <form onSubmit={submit} className="p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-600">Alteração protegida</p>
        <h2 id="override-title" className="mt-2 font-serif text-2xl font-semibold">Alterar {fieldLabel}</h2>
        <dl className="mt-6 grid gap-3 rounded-xl bg-cream-100 p-4 sm:grid-cols-2">
          <div><dt className="text-xs text-ink-700">Valor original</dt><dd className="font-semibold">{originalValue}</dd></div>
          <div><dt className="text-xs text-ink-700">Valor calculado</dt><dd className="font-semibold">{calculatedValue}</dd></div>
        </dl>
        <label className="mt-5 block text-sm font-semibold" htmlFor="override-value">Novo valor</label>
        <input id="override-value" required value={newValue} onChange={(event) => setNewValue(event.target.value)}
          className="mt-2 w-full rounded-lg border border-black/20 px-3 py-2 focus:outline-2 focus:outline-gold-500" />
        <label className="mt-4 block text-sm font-semibold" htmlFor="override-reason">Motivo da alteração</label>
        <textarea id="override-reason" required value={reason} onChange={(event) => setReason(event.target.value)} rows={3}
          className="mt-2 w-full rounded-lg border border-black/20 px-3 py-2 focus:outline-2 focus:outline-gold-500" />
        <p className="mt-4 text-sm text-ink-700">A confirmação cria um override manual e um registo de auditoria. Uma nova regra de preço não o substituirá.</p>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="rounded-lg border border-black/20 px-4 py-2 font-semibold">Cancelar</button>
          <button type="submit" className="rounded-lg bg-ink-950 px-4 py-2 font-semibold text-white">Confirmar alteração</button>
        </div>
      </form>
    </dialog>
  )
}
