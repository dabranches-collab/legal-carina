import { beforeEach, expect, it, vi } from 'vitest'

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }))
vi.mock('../../lib/supabase', () => ({ supabase: { rpc } }))

import { getAttentionCounts } from './attentionCounts'

beforeEach(() => {
  rpc.mockReset()
  rpc.mockImplementation(async (_name: string, args: { p_kind: string }) => ({
    error: null,
    data: { total: args.p_kind === 'missing_price' ? 426 : 0 },
  }))
})
it('contadores partilhados não apresentam zero quando uma consulta falha',async()=>{
 rpc.mockResolvedValue({data:null,error:{message:'Unavailable'}})
 await expect(getAttentionCounts({professionalId:'pro',billingEntityId:'society',clientType:'company'},true)).rejects.toThrow('Unavailable')
})
it('contadores partilhados recusam uma resposta incompleta',async()=>{
 rpc.mockResolvedValue({data:{items:[]},error:null})
 await expect(getAttentionCounts({billingEntityId:'society'},true)).rejects.toThrow('inválida')
})

it('usa a pendência de cobrança normal nas caixas de clientes e sociedades', async () => {
  expect(await getAttentionCounts({ clientType: 'company' })).toEqual({
    uninvoiced: 0,
    unpaid: 0,
    missingPrice: 426,
  })
  expect(rpc).toHaveBeenCalledWith('get_attention_work_entries', expect.objectContaining({
    p_kind: 'missing_price',
    p_client_type: 'company',
  }))
  expect(rpc).not.toHaveBeenCalledWith('search_work_entries', expect.anything())
})
