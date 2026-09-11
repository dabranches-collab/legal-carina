// @vitest-environment node
import {afterEach,describe,expect,it,vi} from 'vitest'
import {handleDocumentTranslation,translateTexts} from './documentTranslation'

const id='00000000-0000-4000-8000-000000000001',clientId='00000000-0000-4000-8000-000000000002'
const items=[{id,kind:'work' as const,text:'Análise documental e reunião de 30 minutos.'}]
const translated=[{...items[0],text:'Document review and a 30-minute meeting.'}]
const env={AZURE_TRANSLATOR_KEY:'synthetic-key',AZURE_TRANSLATOR_REGION:'northeurope',TRANSLATION_LIMITER:{limit:vi.fn(async()=>({success:true}))}}
const request=(body:unknown={clientId,language:'en',items})=>new Request('https://example.test/api/document-translation',{method:'POST',headers:{Origin:'https://example.test',Authorization:'Bearer synthetic-token',apikey:'synthetic-public-key','Content-Type':'application/json'},body:JSON.stringify(body)})
const provider=(value=translated,language='en')=>Response.json(value.map(item=>({translations:[{text:item.text,to:language}]})))
afterEach(()=>{vi.unstubAllGlobals();env.TRANSLATION_LIMITER.limit.mockResolvedValue({success:true})})
describe('document translation endpoint',()=>{
 it('protege referências e preserva quebras de linha e sinais literais',async()=>{
  const source=[{...items[0],text:'Análise TESTE-123 em 07/09/2026.\nValor < 30 & documento.'}]
  const fetcher=vi.fn().mockResolvedValue(Response.json([{translations:[{to:'en',text:'<div>Review <span class="notranslate">TESTE-123</span>on <span class="notranslate">07/09/2026</span>.<br>Value &lt; 30 &amp; document.</div>'}]}]));vi.stubGlobal('fetch',fetcher)
  const result=await translateTexts('en',source,'synthetic-key','northeurope')
  expect(result[0].text).toBe('Review TESTE-123 on 07/09/2026.\nValue < 30 & document.')
  expect(JSON.parse(fetcher.mock.calls[0][1].body)[0].Text).toContain('<span class="notranslate">TESTE-123</span>')
 })
 it.each(['en','fr'] as const)('protege montantes, horas e ordinais integralmente em %s',async language=>{
  const values=['1.250,50','14h30','10.º','08/09/2026','123-AB'],text=values.join(' · ')
  const fetcher=vi.fn(async(_url,options)=>{const sent=JSON.parse(options.body)[0].Text;for(const value of values)expect(sent).toContain(`<span class="notranslate">${value}</span>`);return Response.json([{translations:[{to:language,text:sent}]}])});vi.stubGlobal('fetch',fetcher)
  expect((await translateTexts(language,[{...items[0],text}],'synthetic-key','northeurope'))[0].text).toBe(text)
 })
 it('identifica o limite do fornecedor sem expor a resposta privada',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce(Response.json({id:'user'})).mockResolvedValueOnce(Response.json([{id,activity_description:items[0].text}])).mockResolvedValueOnce(Response.json({error:'private-provider-details'},{status:429})))
  const response=await handleDocumentTranslation(request(),env);expect(response.status).toBe(429);expect(await response.json()).toMatchObject({code:'translator_busy'})
 })
 it('recusa referências omitidas pelo fornecedor',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(provider()))
  await expect(translateTexts('en',[{...items[0],text:'Processo TESTE-123'}],'synthetic-key','northeurope')).rejects.toThrow('invalid')
 })
 it.each(['en','fr'] as const)('verifica sessão e âmbito antes de enviar apenas os textos ao Azure: %s',async(language)=>{
  const fetcher=vi.fn().mockResolvedValueOnce(Response.json({id:'user'})).mockResolvedValueOnce(Response.json([{id,activity_description:items[0].text}])).mockResolvedValueOnce(provider(translated,language));vi.stubGlobal('fetch',fetcher)
  const result=await handleDocumentTranslation(request({clientId,language,items}),env)
  expect(result.status).toBe(200);expect(await result.json()).toEqual({items:translated});expect(result.headers.get('Cache-Control')).toBe('no-store')
  expect(String(fetcher.mock.calls[1][0])).toContain(`client_id=eq.${clientId}`)
  const call=fetcher.mock.calls[2],body=JSON.parse(call[1].body);expect(body).toEqual([{Text:'<div>Análise documental e reunião de <span class="notranslate">30</span> minutos.</div>'}]);expect(call[1].body).not.toContain(clientId)
  expect(new URL(call[0]).searchParams.get('to')).toBe(language);expect(call[1].headers['Ocp-Apim-Subscription-Region']).toBe('northeurope');expect(call[1].redirect).toBe('manual')
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
 it('recusa traduções incompletas, vazias e num idioma diferente',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(provider([])));await expect(translateTexts('en',items,'synthetic-key','northeurope')).rejects.toThrow('incomplete')
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(provider(translated,'fr')));await expect(translateTexts('en',items,'synthetic-key','northeurope')).rejects.toThrow('invalid')
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(provider([{...items[0],text:''}])));await expect(translateTexts('en',items,'synthetic-key','northeurope')).rejects.toThrow('invalid')
 })
 it('conserva os identificadores e a ordem para registos com textos iguais',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(provider([...translated,...translated])))
  const result=await translateTexts('en',[...items,{...items[0],id:clientId,kind:'expense'}],'synthetic-key','northeurope')
  expect(result.map(({id,kind})=>({id,kind}))).toEqual([{id,kind:'work'},{id:clientId,kind:'expense'}])
 })
 it('não devolve detalhes nem segredos do fornecedor quando a quota acaba',async()=>{
  const fetcher=vi.fn().mockResolvedValueOnce(Response.json({id:'user'})).mockResolvedValueOnce(Response.json([{id,activity_description:items[0].text}])).mockResolvedValueOnce(Response.json({error:{message:'synthetic-provider-detail'}},{status:403}));vi.stubGlobal('fetch',fetcher)
  const result=await handleDocumentTranslation(request(),env);expect(result.status).toBe(503);expect(await result.text()).not.toContain('synthetic-provider-detail')
 })
 it('recusa configuração incompleta sem enviar textos',async()=>{
  const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher)
  expect((await handleDocumentTranslation(request(),{...env,AZURE_TRANSLATOR_REGION:undefined})).status).toBe(503);expect(fetcher).not.toHaveBeenCalled()
 })
 it('confirma as despesas activas e o cliente através do movimento',async()=>{
  const expense={id,kind:'expense',text:'Correio registado'}
  const fetcher=vi.fn().mockResolvedValueOnce(Response.json({id:'user'})).mockResolvedValueOnce(Response.json([{id,observations:expense.text}])).mockResolvedValueOnce(provider([{...expense,kind:'expense' as never,text:'Registered post'}]));vi.stubGlobal('fetch',fetcher)
  expect((await handleDocumentTranslation(request({clientId,language:'en',items:[expense]}),env)).status).toBe(200)
  expect(String(fetcher.mock.calls[1][0])).toContain('work_entries.client_id=eq.');expect(String(fetcher.mock.calls[1][0])).toContain('status=eq.active')
 })
})
