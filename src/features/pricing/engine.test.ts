import { describe, expect, it } from 'vitest'
import { calculateHourlyAmount, calculateWorkEntry, excelDayFractionToMinutes, previewRecalculation, resolvePricingRule } from './engine'
import type { DiscountRule, PricingRule, WorkEntryPricingInput } from './types'

const entry: WorkEntryPricingInput = {
  id: 'entry-1', workDate: '2026-04-07', durationMinutes: 90, clientId: 'client-1', matterId: 'matter-1',
  professionalId: 'professional-1', billingEntityId: 'billing-1', serviceTypeId: 'service-1',
  effectiveAmount: 100, hasManualOverride: false, isInvoiced: false, status: 'approved',
}

const rule = (id: string, patch: Partial<PricingRule> = {}): PricingRule => ({
  id, chargeType: 'hourly', hourlyRate: 100, currency: 'EUR', validFrom: '2020-01-01',
  priority: 100, active: true, createdAt: '2026-01-01T00:00:00Z', ...patch,
})

const discount = (id: string, patch: Partial<DiscountRule> = {}): DiscountRule => ({
  id, scopeType: 'period', discountType: 'percentage', percentage: 10, validFrom: '2020-01-01',
  priority: 100, active: true, reason: 'Condição aprovada', authorizedBy: 'user-1',
  createdAt: '2026-01-01T00:00:00Z', ...patch,
})

describe('pricing engine', () => {
  it.each([[0.0104166667, 15], [0.0208333333, 30], [0.0416666667, 60], [0.125, 180]])(
    'converte a fração Excel %s em %i minutos', (fraction, minutes) => {
      expect(excelDayFractionToMinutes(fraction)).toBe(minutes)
    },
  )

  it('calcula e arredonda a duas casas decimais', () => {
    expect(calculateHourlyAmount(99.99, 17)).toBe(28.33)
  })

  it('aplica a precedência pela especificidade, não pela prioridade global', () => {
    const rules = [
      rule('default', { priority: 999 }),
      rule('professional', { professionalId: 'professional-1' }),
      rule('client', { clientId: 'client-1' }),
      rule('client-professional', { clientId: 'client-1', professionalId: 'professional-1' }),
      rule('matter-professional', { matterId: 'matter-1', professionalId: 'professional-1', priority: 0 }),
    ]
    expect(resolvePricingRule(entry, rules)?.id).toBe('matter-professional')
  })

  it('ignora regras inativas, futuras e expiradas', () => {
    expect(resolvePricingRule(entry, [
      rule('inactive', { clientId: 'client-1', active: false }),
      rule('future', { clientId: 'client-1', validFrom: '2027-01-01' }),
      rule('expired', { clientId: 'client-1', validUntil: '2025-12-31' }),
      rule('valid'),
    ])?.id).toBe('valid')
  })

  it('dá precedência ao preço específico do movimento', () => {
    const result = calculateWorkEntry({ ...entry, specificHourlyRate: 80 }, [rule('client', { clientId: 'client-1', hourlyRate: 200 })])
    expect(result).toMatchObject({ ruleId: null, hourlyRate: 80, proposedAmount: 120 })
  })

  it('suporta preço zero sem o tratar como preço em falta', () => {
    const result = calculateWorkEntry(entry, [rule('zero', { hourlyRate: 0 })])
    expect(result.proposedAmount).toBe(0)
    expect(result).not.toHaveProperty('warning')
  })

  it('assinala um registo sem preço', () => {
    expect(calculateWorkEntry(entry, [])).toMatchObject({ proposedAmount: null, warning: 'missing_price' })
  })

  it('calcula preço fixo e tipos gratuitos', () => {
    expect(calculateWorkEntry(entry, [rule('fixed', { chargeType: 'fixed', hourlyRate: null, fixedAmount: 275 })]).proposedAmount).toBe(275)
    expect(calculateWorkEntry(entry, [rule('free', { chargeType: 'free', hourlyRate: null })]).proposedAmount).toBe(0)
  })

  it('aplica apenas o desconto mais específico e limita descontos fixos ao valor base', () => {
    const result = calculateWorkEntry(entry, [rule('base')], [
      discount('period', { percentage: 50 }),
      discount('client', { scopeType: 'client', clientId: 'client-1', percentage: 20 }),
      discount('entry', { scopeType: 'work_entry', workEntryId: 'entry-1', discountType: 'fixed', percentage: null, fixedAmount: 999 }),
    ])
    expect(result).toMatchObject({ preDiscountAmount: 150, discountAmount: 150, proposedAmount: 0 })
  })

  it('preserva overrides e registos faturados na pré-visualização por defeito', () => {
    const preview = previewRecalculation([
      entry,
      { ...entry, id: 'override', hasManualOverride: true, manualAmount: 400, effectiveAmount: 400 },
      { ...entry, id: 'invoiced', isInvoiced: true, effectiveAmount: 300 },
    ], [rule('default')], [])
    expect(preview).toMatchObject({ selectedCount: 3, recalculableCount: 1, skippedOverrideCount: 1, skippedInvoicedCount: 1 })
    expect(preview.entries.map(({ id }) => id)).toEqual(['entry-1'])
  })

  it('filtra ações em massa por período, cliente, sociedade e profissional', () => {
    const preview = previewRecalculation([
      entry,
      { ...entry, id: 'other-client', clientId: 'client-2' },
      { ...entry, id: 'other-date', workDate: '2025-01-01' },
    ], [rule('default')], [], {
      from: '2026-01-01', until: '2026-12-31', clientId: 'client-1',
      billingEntityId: 'billing-1', professionalId: 'professional-1',
    })
    expect(preview.selectedCount).toBe(1)
  })

  it('mostra totais atuais, propostos e diferença sem alterar a entrada', () => {
    const original = { ...entry, effectiveAmount: 99 }
    const preview = previewRecalculation([original], [rule('default')], [])
    expect(preview).toMatchObject({ currentTotal: 99, proposedTotal: 150, difference: 51 })
    expect(original.effectiveAmount).toBe(99)
  })
})
