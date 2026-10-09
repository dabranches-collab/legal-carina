import { beforeEach, expect, it, vi } from 'vitest'
import { emptyWorkflowScope } from '../../types/workflowScope'
const rpc=vi.hoisted(()=>vi.fn())
vi.mock('../../lib/supabase',()=>({supabase:{rpc}}))
import { scopedClientIds, scopedRead, scopedQuery } from './scopedRead'
beforeEach(()=>rpc.mockReset())
it('mantém a consulta original sem filtros',async()=>{rpc.mockResolvedValue({data:[{remaining:123,token:'fixture'}],error:null});expect(await scopedRead('get_payment_queue',emptyWorkflowScope)).toEqual([{remaining:123,token:'fixture'}]);expect(rpc).toHaveBeenCalledWith('get_payment_queue')})
it('consulta exclusivamente o contrato de leitura filtrado',async()=>{rpc.mockResolvedValue({data:[],error:null});await scopedRead('get_payment_queue',{...emptyWorkflowScope,clientType:'company'});expect(rpc).toHaveBeenCalledWith('get_workflow_payment_queue',{p_scope_billing_entity_id:null,p_scope_professional_id:null,p_scope_client_type:'company'})})
it('não recua para resultados globais quando falta a RPC',async()=>{rpc.mockResolvedValue({data:null,error:{code:'PGRST202',message:'missing'}});await expect(scopedRead('get_payment_queue',{...emptyWorkflowScope,clientType:'company'})).rejects.toThrow('Não foram apresentados resultados globais');expect(rpc).toHaveBeenCalledTimes(1)})
it('recusa filtros inválidos antes de pedir dados',async()=>{await expect(scopedRead('get_payment_queue',{...emptyWorkflowScope,society:'name'})).rejects.toThrow('inválido');expect(rpc).not.toHaveBeenCalled()})
it('não aceita uma resposta malformada como selecção vazia',async()=>{rpc.mockResolvedValue({data:{ids:[]},error:null});await expect(scopedClientIds({...emptyWorkflowScope,clientType:'company'})).rejects.toThrow('Resposta inválida')})
it('parâmetros de uma vista não podem substituir o âmbito partilhado',async()=>{
 rpc.mockResolvedValue({data:[],error:null})
 await scopedQuery('get_entity_dashboard_rolling',{...emptyWorkflowScope,clientType:'individual'},{p_kind:'billing',p_entity_id:'fixture',p_scope_client_type:'company'})
 expect(rpc).toHaveBeenCalledWith('get_workflow_entity_dashboard_rolling',expect.objectContaining({p_kind:'billing',p_entity_id:'fixture',p_scope_client_type:'individual'}))
})
