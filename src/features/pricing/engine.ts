import type {
  CalculationResult,
  DiscountRule,
  PricingRule,
  RecalculationFilters,
  RecalculationPreview,
  WorkEntryPricingInput,
} from './types'

const cents = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100

export function excelDayFractionToMinutes(value: number): number {
  if (!Number.isFinite(value) || value < 0) throw new RangeError('A duração deve ser um número não negativo.')
  return Math.round(value * 24 * 60)
}

export function calculateHourlyAmount(hourlyRate: number, durationMinutes: number): number {
  if (hourlyRate < 0 || durationMinutes < 0) throw new RangeError('Preço e duração não podem ser negativos.')
  return cents((hourlyRate * durationMinutes) / 60)
}

function validOn(date: string, from: string, until?: string | null) {
  return from <= date && (!until || until >= date)
}

function specificity(rule: PricingRule): number {
  if (rule.matterId && rule.professionalId) return 700
  if (rule.clientId && rule.professionalId) return 600
  if (rule.clientId) return 500
  if (rule.billingEntityId) return 400
  if (rule.professionalId) return 300
  if (rule.serviceTypeId) return 200
  return 100
}

function matches(rule: PricingRule, entry: WorkEntryPricingInput) {
  return (!rule.clientId || rule.clientId === entry.clientId)
    && (!rule.matterId || rule.matterId === entry.matterId)
    && (!rule.professionalId || rule.professionalId === entry.professionalId)
    && (!rule.billingEntityId || rule.billingEntityId === entry.billingEntityId)
    && (!rule.serviceTypeId || rule.serviceTypeId === entry.serviceTypeId)
}

export function resolvePricingRule(entry: WorkEntryPricingInput, rules: PricingRule[]): PricingRule | null {
  return rules
    .filter((rule) => rule.active && validOn(entry.workDate, rule.validFrom, rule.validUntil) && matches(rule, entry))
    .sort((a, b) => specificity(b) - specificity(a)
      || b.priority - a.priority
      || b.createdAt.localeCompare(a.createdAt)
      || a.id.localeCompare(b.id))[0] ?? null
}

function resolveDiscount(entry: WorkEntryPricingInput, discounts: DiscountRule[]): DiscountRule | null {
  const rank = (scope: DiscountRule['scopeType']) => ({ work_entry: 300, client: 200, period: 100 })[scope]
  return discounts
    .filter((discount) => discount.active
      && validOn(entry.workDate, discount.validFrom, discount.validUntil)
      && ((discount.scopeType === 'work_entry' && discount.workEntryId === entry.id)
        || (discount.scopeType === 'client' && discount.clientId === entry.clientId)
        || discount.scopeType === 'period'))
    .sort((a, b) => rank(b.scopeType) - rank(a.scopeType)
      || b.priority - a.priority
      || b.createdAt.localeCompare(a.createdAt)
      || a.id.localeCompare(b.id))[0] ?? null
}

export function calculateWorkEntry(
  entry: WorkEntryPricingInput,
  rules: PricingRule[],
  discounts: DiscountRule[] = [],
): CalculationResult {
  const rule = resolvePricingRule(entry, rules)
  const chargeType = entry.specificHourlyRate != null ? 'hourly' : rule?.chargeType ?? null
  const hourlyRate = entry.specificHourlyRate ?? rule?.hourlyRate ?? null
  let base: number | null = null

  if (chargeType === 'hourly' && hourlyRate != null) base = calculateHourlyAmount(hourlyRate, entry.durationMinutes)
  else if (chargeType && ['fixed', 'retainer', 'hour_package', 'per_act', 'manual_negotiated'].includes(chargeType)) {
    base = rule?.fixedAmount == null ? null : cents(rule.fixedAmount)
  } else if (chargeType === 'free' || chargeType === 'non_billable') base = 0

  if (base == null) return {
    ruleId: rule?.id ?? null, chargeType, hourlyRate, preDiscountAmount: null,
    discountAmount: null, proposedAmount: null, currency: rule?.currency ?? 'EUR', warning: 'missing_price',
  }

  const discount = resolveDiscount(entry, discounts)
  const discountAmount = discount?.discountType === 'percentage'
    ? cents(base * (discount.percentage ?? 0) / 100)
    : discount?.discountType === 'fixed' ? Math.min(base, discount.fixedAmount ?? 0) : 0

  return {
    ruleId: entry.specificHourlyRate != null ? null : rule?.id ?? null,
    chargeType,
    hourlyRate,
    preDiscountAmount: base,
    discountAmount,
    proposedAmount: cents(Math.max(0, base - discountAmount)),
    currency: rule?.currency ?? 'EUR',
  }
}

export function previewRecalculation(
  entries: WorkEntryPricingInput[], rules: PricingRule[], discounts: DiscountRule[], filters: RecalculationFilters = {},
): RecalculationPreview {
  const selected = entries.filter((entry) => (!filters.from || entry.workDate >= filters.from)
    && (!filters.until || entry.workDate <= filters.until)
    && (!filters.clientId || entry.clientId === filters.clientId)
    && (!filters.billingEntityId || entry.billingEntityId === filters.billingEntityId)
    && (!filters.professionalId || entry.professionalId === filters.professionalId))
  const skipOverrides = filters.skipOverrides ?? true
  const uninvoicedOnly = filters.uninvoicedOnly ?? true
  const eligible = selected.filter((entry) => !(skipOverrides && entry.hasManualOverride)
    && !(uninvoicedOnly && entry.isInvoiced) && entry.status !== 'cancelled')
  const proposals = eligible.map((entry) => ({ entry, calculation: calculateWorkEntry(entry, rules, discounts) }))
  const priced = proposals.filter(({ calculation }) => calculation.proposedAmount != null)
  const resultEntries = priced.map(({ entry, calculation }) => {
    const currentAmount = entry.effectiveAmount ?? 0
    const proposedAmount = calculation.proposedAmount ?? 0
    return { id: entry.id, currentAmount, proposedAmount, difference: cents(proposedAmount - currentAmount) }
  })
  const currentTotal = cents(resultEntries.reduce((total, entry) => total + entry.currentAmount, 0))
  const proposedTotal = cents(resultEntries.reduce((total, entry) => total + entry.proposedAmount, 0))
  return {
    entries: resultEntries,
    selectedCount: selected.length,
    recalculableCount: resultEntries.length,
    skippedOverrideCount: selected.filter((entry) => skipOverrides && entry.hasManualOverride).length,
    skippedInvoicedCount: selected.filter((entry) => uninvoicedOnly && entry.isInvoiced).length,
    missingPriceCount: proposals.filter(({ calculation }) => calculation.warning === 'missing_price').length,
    currentTotal,
    proposedTotal,
    difference: cents(proposedTotal - currentTotal),
  }
}
