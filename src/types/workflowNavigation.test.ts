import { describe, expect, it } from 'vitest'
import { workflowPreviewEnabled } from './workflowNavigation'

describe('navegação em validação', () => {
  it('ignora pedidos de preview na configuração operacional', () => {
    expect(workflowPreviewEnabled('?workflow=preview', false, 'production')).toBe(false)
    expect(workflowPreviewEnabled('?workflow=preview&qa-iphone=1', false)).toBe(false)
  })
  it('exige opção explícita mesmo no ambiente de teste', () => {
    expect(workflowPreviewEnabled('?view=overview', true)).toBe(false)
    expect(workflowPreviewEnabled('?workflow=preview', true)).toBe(true)
    expect(workflowPreviewEnabled('?workflow=preview', false, 'test')).toBe(true)
  })
})
