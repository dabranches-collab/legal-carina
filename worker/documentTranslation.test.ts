// @vitest-environment node
import {afterEach,describe,expect,it,vi} from 'vitest'
import {handleDocumentTranslation,translateTexts} from './documentTranslation'

const id='00000000-0000-4000-8000-000000000001',clientId='00000000-0000-4000-8000-000000000002'
const items=[{id,kind:'work' as const,text:'Análise documental e reunião de 30 minutos.'}]
const translated=[{...items[0],text:'Document review and a 30-minute meeting.'}]
const env={OPENAI_API_KEY:'synthetic-key',TRANSLATION_LIMITER:{limit:vi.fn(async()=>({success:true}))}}
const request=(body:unknown={clientId,language:'en',items})=>new Request('https://example.test/api/document-translation',{method:'POST',headers:{Origin:'https://example.test',Authorization:'Bearer synthetic-token',apikey:'synthetic-public-key','Content-Type':'application/json'},body:JSON.stringify(body)})
const provider=(value=translated)=>Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({items:value})}]}]})
afterEach(()=>{vi.unstubAllGlobals();env.TRANSLATION_LIMITER.limit.mockResolvedValue({success:true})})
describe('document translation endpoint',()=>{
 it('verifica sessão e âmbito antes de enviar apenas os textos à OpenAI',async()=>{
  const fetcher=vi.fn().mockResolvedValueOnce(Response.json({id:'user'})).mockResolvedValueOnce(Response.json([{id,activity_description:items[0].text}])).mockResolvedValueOnce(provider());vi.stubGlobal('fetch',fetcher)
  const result=await handleDocumentTranslation(request(),env)
  expect(result.status).toBe(200);expect(await result.json()).toEqual({items:translated});expect(result.headers.get('Cache-Control')).toBe('no-store')
  expect(String(fetcher.mock.calls[1][0])).toContain(`client_id=eq.${clientId}`)
  const body=JSON.parse(fetcher.mock.calls[2][1].body);expect(body.store).toBe(false);expect(JSON.parse(body.input)).toEqual(items);expect(body.input).not.toContain(clientId)
 })
 it('recusa registos inacessíveis ou alterados sem chamar o fornecedor',async()=>{
  const fetcher=vi.fn().mockResolvedValueOnce(Response.json({id:'user'})).mockResolvedValueOnce(Response.json([]));vi.stubGlobal('fetch',fetcher)
  expect((await handleDocumentTranslation(request(),env)).status).toBe(409);expect(fetcher).toHaveBeenCalledTimes(2)
 })
 it('recusa falta de sessão e origem externa',async()=>{
  const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);const noAuth=request();noAuth.headers.delete('authorization')
  expect((await handleDocumentTranslation(noAuth,env)).status).toBe(401)
  const foreign=request();foreign.headers.set('origin','https://external.test');expect((await handleDocumentTranslation(foreign,env)).status).toBe(403);expect(fetcher).not.toHaveBeenCalled()
 })
 it('recusa lotes inválidos e respeita o limite por utilizador',async()=>{
  const fetcher=vi.fn().mockResolvedValue(Response.json({id:'user'}));vi.stubGlobal('fetch',fetcher)
  expect((await handleDocumentTranslation(request({clientId,language:'en',items:[...items,...items]}),env)).status).toBe(400)
  env.TRANSLATION_LIMITER.limit.mockResolvedValue({success:false});expect((await handleDocumentTranslation(request(),env)).status).toBe(429);expect(fetcher).toHaveBeenCalledTimes(1)
 })
 it('recusa traduções incompletas e repetições do fornecedor',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(provider([])));await expect(translateTexts('en',items,'synthetic-key')).rejects.toThrow('incomplete')
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(provider([...translated,...translated])));await expect(translateTexts('en',[...items,{...items[0],id:clientId}],'synthetic-key')).rejects.toThrow('invalid')
 })
 it('confirma as despesas activas e o cliente através do movimento',async()=>{
  const expense={id,kind:'expense',text:'Correio registado'}
  const fetcher=vi.fn().mockResolvedValueOnce(Response.json({id:'user'})).mockResolvedValueOnce(Response.json([{id,observations:expense.text}])).mockResolvedValueOnce(provider([{...expense,kind:'expense' as never,text:'Registered post'}]));vi.stubGlobal('fetch',fetcher)
  expect((await handleDocumentTranslation(request({clientId,language:'en',items:[expense]}),env)).status).toBe(200)
  expect(String(fetcher.mock.calls[1][0])).toContain('work_entries.client_id=eq.');expect(String(fetcher.mock.calls[1][0])).toContain('status=eq.active')
 })
})
