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
    <section aria-labelledby="recalculate-title" className="card p-6">
      <h2 id="recalculate-title" className="font-display text-2xl font-semibold">Pré-visualização do recálculo</h2>
      <p className="mt-2 text-sm text-text-secondary">Nenhum valor é gravado antes da confirmação.</p>
      <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div><dt className="text-xs text-text-secondary">Registos</dt><dd className="text-xl font-semibold">{preview.recalculableCount}</dd></div>
        <div><dt className="text-xs text-text-secondary">Valor atual</dt><dd className="text-xl font-semibold">{euro.format(preview.currentTotal)}</dd></div>
        <div><dt className="text-xs text-text-secondary">Valor proposto</dt><dd className="text-xl font-semibold">{euro.format(preview.proposedTotal)}</dd></div>
        <div><dt className="text-xs text-text-secondary">Diferença</dt><dd className="text-xl font-semibold">{euro.format(preview.difference)}</dd></div>
      </dl>
      {(preview.skippedOverrideCount > 0 || preview.skippedInvoicedCount > 0 || preview.missingPriceCount > 0) && (
        <p className="mt-4 rounded-lg bg-warning-soft p-3 text-sm text-warning">
          Excluídos: {preview.skippedOverrideCount} com override, {preview.skippedInvoicedCount} faturados; {preview.missingPriceCount} sem preço.
        </p>
      )}
      <label className="mt-5 flex items-start gap-3 text-sm">
        <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1" />
        Confirmo que revi o período, o âmbito e a diferença financeira apresentados.
      </label>
      <div className="mt-6 flex justify-end gap-3">
        <button type="button" onClick={onCancel} className="control px-4 py-2 font-semibold">Cancelar</button>
        <button type="button" onClick={onConfirm} disabled={!confirmed || preview.recalculableCount === 0}
          className="rounded-lg bg-primary px-4 py-2 font-semibold text-surface disabled:cursor-not-allowed disabled:opacity-40">Recalcular</button>
      </div>
    </section>
  )
}
