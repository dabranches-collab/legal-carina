import { describe, expect, test } from 'vitest'
import { allocatedAmounts } from './fixedFeeAllocation'

describe('repartição analítica do preço fixo', () => {
  test('distribui todos os cêntimos pelas horas, mesmo com um registo sem duração no fim', () => {
    const allocation = allocatedAmounts(100, [
      { id: 'a', duration_minutes: 30 },
      { id: 'b', duration_minutes: 60 },
      { id: 'c', duration_minutes: 0 },
    ])
    expect(allocation.get('a')).toBe(33.33)
    expect(allocation.get('b')).toBe(66.67)
    expect(allocation.get('c')).toBe(0)
    expect([...allocation.values()].reduce((sum, value) => sum + value, 0)).toBe(100)
  })
})
