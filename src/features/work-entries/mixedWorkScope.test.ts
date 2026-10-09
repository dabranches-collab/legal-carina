import {beforeEach,expect,it,vi} from 'vitest'
const mocks=vi.hoisted(()=>({pages:[] as Array<Array<{client_id:string;client_type:string}>>,rpc:vi.fn(),eq:vi.fn(),range:vi.fn()}))
vi.mock('../../lib/supabase',()=>({supabase:{rpc:mocks.rpc,from:()=>{
 const query={select:()=>query,eq:(...args:unknown[])=>{mocks.eq(...args);return query},order:()=>query,range:(...args:unknown[])=>{mocks.range(...args);return query},then:(resolve:(data:unknown)=>unknown)=>Promise.resolve({data:mocks.pages.shift()??[],error:null}).then(resolve)}
 return query
}}}))
import {mixedWorkAggregate,mixedWorkClientIds} from './mixedWorkScope'
const profiles=[{client_id:'a',client_type:'individual'},{client_id:'a',client_type:'company'},{client_id:'a',client_type:'company'},{client_id:'b',client_type:'individual'},{client_id:'b',client_type:'company'},{client_id:'c',client_type:'individual'}]
beforeEach(()=>{mocks.pages=[];mocks.rpc.mockReset();mocks.eq.mockReset();mocks.range.mockReset()})
it('lê todas as páginas e não duplica clientes mistos',async()=>{
 mocks.pages=[Array.from({length:1000},()=>profiles[0]),profiles.slice(1)]
 expect(await mixedWorkClientIds(null)).toEqual(['a','b'])
 expect(mocks.range.mock.calls).toEqual([[0,999],[1000,1999]])
})
it('a ficha de um cliente não recebe os registos de outros mistos',async()=>{
 mocks.pages=[profiles];expect(await mixedWorkClientIds('b')).toEqual(['b']);expect(mocks.eq).toHaveBeenCalledWith('client_id','b')
})
it('somatórios usam a vertente canónica e preservam todos os outros filtros',async()=>{
 mocks.pages=[profiles];mocks.rpc.mockImplementation((_name,args)=>Promise.resolve({data:{unpaid:{count:1,amount:args.p_client_id==='a'?100:50,priced:1,minutes:30}},error:null}))
 const args={p_client_type:'mixed:company',p_client_id:null,p_professional_id:'pro',p_billing_entity_id:'society',p_year:2026,p_search:'query'}
 expect((await mixedWorkAggregate('get_work_attention_summaries',args,true)).data).toEqual({unpaid:{count:2,amount:150,priced:2,minutes:60}})
 for(const [,sent] of mocks.rpc.mock.calls){expect(sent).toMatchObject({...args,p_client_type:'company',p_client_id:expect.stringMatching(/^[ab]$/)});expect(['a','b']).toContain(sent.p_client_id)}
})
it('não apresenta um total parcial quando uma consulta falha',async()=>{
 mocks.pages=[profiles];mocks.rpc.mockResolvedValueOnce({data:{unpaid:5},error:null}).mockResolvedValueOnce({data:null,error:{code:'42501',message:'Forbidden'}})
 expect(await mixedWorkAggregate('get_work_attention_counts',{p_client_type:'mixed',p_client_id:null},false)).toEqual({data:null,error:{code:'42501',message:'Forbidden'}})
})
it('não consulta movimentos se não há clientes mistos elegíveis',async()=>{
 mocks.pages=[[profiles[0]]];expect(await mixedWorkAggregate('get_work_attention_counts',{p_client_type:'mixed'},false)).toEqual({data:{},error:null});expect(mocks.rpc).not.toHaveBeenCalled()
})
it('não transforma montantes inválidos ou ocultos num zero confirmado',async()=>{
 mocks.pages=[profiles];mocks.rpc.mockResolvedValue({data:{unpaid:{amount:null,count:1}},error:null})
 await expect(mixedWorkAggregate('get_work_attention_summaries',{p_client_type:'mixed'},true)).rejects.toThrow('inválido')
})
