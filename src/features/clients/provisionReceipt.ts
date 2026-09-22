export type ProvisionAmountMode = 'gross' | 'net'

const cents = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100

/** The credit ledger records cash received, including any VAT already paid. */
export function provisionReceipt(amount: number, vatRate: number, mode: ProvisionAmountMode) {
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(vatRate) || vatRate < 0 || vatRate > 100) return null
  if (mode === 'net') {
    const net = cents(amount)
    const vat = cents(net * vatRate / 100)
    return { net, vat, gross: cents(net + vat) }
  }
  const gross = cents(amount)
  const net = cents(gross / (1 + vatRate / 100))
  return { net, vat: cents(gross - net), gross }
}
