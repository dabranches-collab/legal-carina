export const CHARGE_TYPES = [
  'hourly', 'fixed', 'retainer', 'hour_package', 'per_act',
  'free', 'non_billable', 'manual_negotiated',
] as const

export type ChargeType = (typeof CHARGE_TYPES)[number]

export interface PricingRule {
  id: string
  chargeType: ChargeType
  hourlyRate?: number | null
  fixedAmount?: number | null
  currency: string
  validFrom: string
  validUntil?: string | null
  priority: number
  active: boolean
  clientId?: string | null
  matterId?: string | null
  professionalId?: string | null
  billingEntityId?: string | null
  serviceTypeId?: string | null
  createdAt: string
}

export interface DiscountRule {
  id: string
  scopeType: 'client' | 'work_entry' | 'period'
  discountType: 'percentage' | 'fixed'
  percentage?: number | null
  fixedAmount?: number | null
  clientId?: string | null
  workEntryId?: string | null
  validFrom: string
  validUntil?: string | null
  priority: number
  active: boolean
  reason: string
  authorizedBy: string
  createdAt: string
}

export interface WorkEntryPricingInput {
  id: string
  workDate: string
  durationMinutes: number
  clientId: string
  matterId?: string | null
  professionalId: string
  billingEntityId?: string | null
  serviceTypeId?: string | null
  specificHourlyRate?: number | null
  importedAmount?: number | null
  calculatedAmount?: number | null
  effectiveAmount?: number | null
  manualAmount?: number | null
  hasManualOverride: boolean
  isInvoiced: boolean
  status?: string
}

export interface CalculationResult {
  ruleId: string | null
  chargeType: ChargeType | null
  hourlyRate: number | null
  preDiscountAmount: number | null
  discountAmount: number | null
  proposedAmount: number | null
  currency: string
  warning?: 'missing_price'
}

export interface RecalculationFilters {
  from?: string
  until?: string
  clientId?: string
  billingEntityId?: string
  professionalId?: string
  uninvoicedOnly?: boolean
  skipOverrides?: boolean
}

export interface RecalculationPreview {
  entries: Array<{ id: string; currentAmount: number; proposedAmount: number; difference: number }>
  selectedCount: number
  recalculableCount: number
  skippedOverrideCount: number
  skippedInvoicedCount: number
  missingPriceCount: number
  currentTotal: number
  proposedTotal: number
  difference: number
}
