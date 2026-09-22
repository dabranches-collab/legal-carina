import { describe, expect, it } from 'vitest'
import { provisionReceipt } from './provisionReceipt'

describe('provisões recebidas e IVA', () => {
  it('regista a totalidade da transferência quando a base foi introduzida sem IVA', () => {
    expect(provisionReceipt(1600, 23, 'net')).toEqual({ net: 1600, vat: 368, gross: 1968 })
  })
  it('não acrescenta novamente IVA ao total já pago', () => {
    expect(provisionReceipt(1968, 23, 'gross')).toEqual({ net: 1600, vat: 368, gross: 1968 })
  })
  it('arredonda ao cêntimo e mantém a soma exacta', () => {
    expect(provisionReceipt(100, 23, 'gross')).toEqual({ net: 81.3, vat: 18.7, gross: 100 })
    expect(provisionReceipt(0, 23, 'gross')).toBeNull()
  })
})
