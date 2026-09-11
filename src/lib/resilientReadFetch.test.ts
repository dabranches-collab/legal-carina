import { afterEach,expect,test,vi } from 'vitest'
import { resilientReadFetch } from './resilientReadFetch'
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers()})
test('recupera a leitura sem repetir escritas ou pedidos cancelados',async()=>{
 vi.useFakeTimers()
 const fetch=vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValue(new Response('{}'))
 vi.stubGlobal('fetch',fetch)
 const result=resilientReadFetch('https://example.test/rest/v1/rpc/search_work_entries',{method:'POST',body:'{}'})
 await vi.runAllTimersAsync();expect((await result).status).toBe(200);expect(fetch).toHaveBeenCalledTimes(2)
 fetch.mockReset().mockRejectedValue(new TypeError('Failed to fetch'))
 await expect(resilientReadFetch('https://example.test/rest/v1/rpc/issue_provision_honorarium_note',{method:'POST',body:'{}'})).rejects.toThrow('Failed to fetch')
 expect(fetch).toHaveBeenCalledTimes(1)
 const controller=new AbortController();controller.abort();fetch.mockClear()
 await expect(resilientReadFetch('https://example.test/rest/v1/work_entries',{signal:controller.signal})).rejects.toThrow()
 expect(fetch).toHaveBeenCalledTimes(1)
})
