import { useState } from 'react'
import type { RecalculationPreview } from './types'

interface RecalculationPanelProps {
  preview: RecalculationPreview
  onCancel: () => void
  onConfirm: () => void
}

const euro = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' })

export function RecalculationPanel({ preview, onCancel, onConfirm }: RecalculationPanelProps) {
  const [confirmed, setConfirmed] = useState(false)
  return (
    <section aria-labelledby="recalculate-title" className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
      <h2 id="recalculate-title" className="font-serif text-2xl font-semibold">Pré-visualização do recálculo</h2>
      <p className="mt-2 text-sm text-ink-700">Nenhum valor é gravado antes da confirmação.</p>
      <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div><dt className="text-xs text-ink-700">Registos</dt><dd className="text-xl font-semibold">{preview.recalculableCount}</dd></div>
        <div><dt className="text-xs text-ink-700">Valor atual</dt><dd className="text-xl font-semibold">{euro.format(preview.currentTotal)}</dd></div>
        <div><dt className="text-xs text-ink-700">Valor proposto</dt><dd className="text-xl font-semibold">{euro.format(preview.proposedTotal)}</dd></div>
        <div><dt className="text-xs text-ink-700">Diferença</dt><dd className="text-xl font-semibold">{euro.format(preview.difference)}</dd></div>
      </dl>
      {(preview.skippedOverrideCount > 0 || preview.skippedInvoicedCount > 0 || preview.missingPriceCount > 0) && (
        <p className="mt-4 rounded-lg bg-cream-100 p-3 text-sm text-ink-700">
          Excluídos: {preview.skippedOverrideCount} com override, {preview.skippedInvoicedCount} faturados; {preview.missingPriceCount} sem preço.
        </p>
      )}
      <label className="mt-5 flex items-start gap-3 text-sm">
        <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1" />
        Confirmo que revi o período, o âmbito e a diferença financeira apresentados.
      </label>
      <div className="mt-6 flex justify-end gap-3">
        <button type="button" onClick={onCancel} className="rounded-lg border border-black/20 px-4 py-2 font-semibold">Cancelar</button>
        <button type="button" onClick={onConfirm} disabled={!confirmed || preview.recalculableCount === 0}
          className="rounded-lg bg-ink-950 px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">Recalcular</button>
      </div>
    </section>
  )
}
