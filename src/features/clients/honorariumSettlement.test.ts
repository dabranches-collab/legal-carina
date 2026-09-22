import {describe,expect,it} from 'vitest'
import {honorariumSettlement} from './honorariumSettlement'

describe('liquidação de nota com IVA na provisão',()=>{
 it('separa a provisão do pagamento directo e identifica o excedente',()=>{
  expect(honorariumSettlement(5166,1968,3566)).toEqual({remaining:0,excess:368})
 })
 it('mantém por pagar apenas a parte que falta',()=>{
  expect(honorariumSettlement(5166,1968,2000)).toEqual({remaining:1198,excess:0})
 })
})
