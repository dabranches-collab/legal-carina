import { describe, expect, it } from 'vitest'
import { creditStatement, provisionTotals, type CreditMovement } from './credit'
describe('provisões para honorários',()=>{
 it('desconta o total com IVA e conserva o saldo remanescente',()=>{expect(provisionTotals(100,23,1000)).toEqual({subtotal:100,vat:23,total:123,deducted:123,remaining:0,balance_after:877})})
 it('admite saldo insuficiente sem saldo negativo',()=>{expect(provisionTotals(100,23,50)).toEqual({subtotal:100,vat:23,total:123,deducted:50,remaining:73,balance_after:0})})
 it('arredonda o IVA ao cêntimo antes do desconto',()=>{expect(provisionTotals(0.03,23,1)).toEqual({subtotal:.03,vat:.01,total:.04,deducted:.04,remaining:0,balance_after:.96})})
 it('apresenta saldo inicial e estorno no período de lançamento',()=>{
  const rows=[{id:'1',recorded_at:'2026-08-01T10:00:00Z',amount:1000},{id:'2',recorded_at:'2026-09-01T10:00:00Z',amount:-123},{id:'3',recorded_at:'2026-09-02T10:00:00Z',amount:123}] as CreditMovement[]
  const result=creditStatement(rows,'2026-09-01','2026-09-02');expect(result.opening).toBe(1000);expect(result.rows.map(row=>row.balance)).toEqual([877,1000]);expect(result.closing).toBe(1000)
  expect(creditStatement(rows,'2026-10-01','2026-10-02')).toEqual({opening:1000,rows:[],closing:1000})
 })
})
