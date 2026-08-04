import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { RecalculationPanel } from './RecalculationPanel'

it('só permite recalcular depois da confirmação explícita', async () => {
  const onConfirm = vi.fn()
  render(<RecalculationPanel preview={{
    entries: [{ id: 'synthetic', currentAmount: 100, proposedAmount: 120, difference: 20 }],
    selectedCount: 1, recalculableCount: 1, skippedOverrideCount: 0, skippedInvoicedCount: 0,
    missingPriceCount: 0, currentTotal: 100, proposedTotal: 120, difference: 20,
  }} onCancel={vi.fn()} onConfirm={onConfirm} />)

  const button = screen.getByRole('button', { name: 'Recalcular' })
  expect(button).toBeDisabled()
  await userEvent.click(screen.getByRole('checkbox'))
  expect(button).toBeEnabled()
  await userEvent.click(button)
  expect(onConfirm).toHaveBeenCalledOnce()
})
