import {expect,it,vi} from 'vitest'
import worker from './index'

it('permite a câmara apenas à própria aplicação e mantém as restantes restrições',async()=>{
 const assetFetch=vi.fn().mockResolvedValue(new Response('<html></html>',{headers:{'Content-Type':'text/html'}}))
 const env={ASSETS:{fetch:assetFetch}} as unknown as Env
 const response=await worker.fetch(new Request('https://legal-carina.example/'),env)
 expect(response.headers.get('Permissions-Policy')).toBe('camera=(self), geolocation=(), microphone=(), payment=(), usb=()')
 expect(assetFetch).toHaveBeenCalledOnce()
})
