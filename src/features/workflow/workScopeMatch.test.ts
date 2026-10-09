import {expect,it} from 'vitest'
import {emptyWorkflowScope} from '../../types/workflowScope'
import {matchesWorkflowWorkScope} from './workScopeMatch'
it('preço fixo intersecta todas as dimensões sem alterar a repartição existente',()=>{
 const line={billingEntityId:'society',professionalId:'pro',clientType:'individual',mixedClient:true,amount:123.45}
 const scope={society:'society',professional:'pro',clientType:'mixed'}
 expect(matchesWorkflowWorkScope(line,scope)).toBe(true)
 expect(matchesWorkflowWorkScope({...line,professionalId:'other'},scope)).toBe(false)
 expect(matchesWorkflowWorkScope({...line,clientType:'company'},{...scope,clientType:'individual'})).toBe(false)
 expect(matchesWorkflowWorkScope({...line,billingEntityId:null},scope)).toBe(false)
 expect(matchesWorkflowWorkScope(line,emptyWorkflowScope)).toBe(true)
 expect(line.amount).toBe(123.45)
})
