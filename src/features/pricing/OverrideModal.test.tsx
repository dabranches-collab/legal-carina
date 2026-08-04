import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { OverrideModal } from './OverrideModal'

describe('OverrideModal', () => {
  it('exige novo valor e motivo antes de confirmar', async () => {
    const onConfirm = vi.fn()
    render(<OverrideModal open fieldLabel="valor" originalValue="100,00 €" calculatedValue="120,00 €" onCancel={vi.fn()} onConfirm={onConfirm} />)
    await userEvent.type(screen.getByLabelText('Novo valor'), '110')
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar alteração' }))
    expect(onConfirm).not.toHaveBeenCalled()
    await userEvent.type(screen.getByLabelText('Motivo da alteração'), 'Acordo aprovado pelo cliente')
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar alteração' }))
    expect(onConfirm).toHaveBeenCalledWith({ newValue: '110', reason: 'Acordo aprovado pelo cliente' })
  })
})
