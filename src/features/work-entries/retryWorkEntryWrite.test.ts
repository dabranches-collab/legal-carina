import {expect,test,vi} from 'vitest'
import {retryWorkEntryWrite} from './retryWorkEntryWrite'

test('repete uma transacção anulada por concorrência',async()=>{
 const operation=vi.fn().mockResolvedValueOnce({error:{code:'40001'}}).mockResolvedValue({error:null})
 expect((await retryWorkEntryWrite(operation)).error).toBeNull()
 expect(operation).toHaveBeenCalledTimes(2)
})
test('não repete uma falha de rede com resultado desconhecido',async()=>{
 const operation=vi.fn().mockResolvedValue({error:{code:'NETWORK'}})
 await retryWorkEntryWrite(operation)
 expect(operation).toHaveBeenCalledTimes(1)
})
