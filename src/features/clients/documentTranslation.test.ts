import {afterEach,describe,expect,it,vi} from 'vitest'
import {translateDocument,validateTranslations} from './documentTranslation'
vi.mock('../../lib/supabase',()=>({supabase:{auth:{getSession:async()=>({data:{session:{access_token:'synthetic-token'}},error:null})}}}))
afterEach(()=>vi.unstubAllGlobals())
describe('document translation client',()=>{
 it('reordena por identificador e rejeita faltas ou duplicados',()=>{
  const source=[{id:'a',kind:'work' as const,text:'Reunião'},{id:'b',kind:'expense' as const,text:'Correio'}]
  expect(validateTranslations(source,[{...source[1],text:'Post'},{...source[0],text:'Meeting'}]).map(item=>item.text)).toEqual(['Meeting','Post'])
  expect(()=>validateTranslations(source,[source[0],source[0]])).toThrow('repetidos');expect(()=>validateTranslations(source,[])).toThrow('incompleta')
 })
 it('traduz todos os lotes e nunca devolve o primeiro lote como documento completo',async()=>{
  const items=Array.from({length:21},(_,index)=>({id:String(index),kind:'work' as const,text:'Reunião'}))
  const fetcher=vi.fn().mockResolvedValueOnce(Response.json({items:items.slice(0,20).map(item=>({...item,text:'Meeting'}))})).mockResolvedValueOnce(Response.json({error:'Indisponível'},{status:502}));vi.stubGlobal('fetch',fetcher)
  await expect(translateDocument('client','en',items)).rejects.toThrow('Indisponível');expect(fetcher).toHaveBeenCalledTimes(2)
 })
})
