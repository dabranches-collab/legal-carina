import { describe, expect, it } from 'vitest'
import { emptyWorkflowScope, hasWorkflowScope, intersectWorkflowFilter, intersectWorkflowClientType, preserveWorkflowScope, readWorkflowScope, workflowScopeArgs, workflowScopeError } from './workflowScope'
const society='00000000-0000-4000-8000-000000000002'
describe('âmbito partilhado',()=>{
 it('ignora parâmetros fora do modo de validação',()=>expect(readWorkflowScope('?scopeSociety=invalid',false)).toEqual(emptyWorkflowScope))
 it('restaura as três dimensões e transmite UUID, não nomes',()=>{const scope=readWorkflowScope(`?scopeSociety=${society}&scopeProfessional=${society}&scopeClientType=company`,true);expect(workflowScopeError(scope)).toBe('');expect(workflowScopeArgs(scope)).toEqual({p_scope_billing_entity_id:society,p_scope_professional_id:society,p_scope_client_type:'company'});expect(hasWorkflowScope(scope)).toBe(true)})
 it.each([{society:'LEGALTEAM'},{professional:'not-a-uuid'},{clientType:'all'}])('recusa endereços inválidos %j',invalid=>expect(workflowScopeError({...emptyWorkflowScope,...invalid})).not.toBe(''))
 it('intersecta pré-filtros sem alargar o âmbito',()=>{expect(intersectWorkflowFilter(null,society)).toBe(society);expect(intersectWorkflowFilter(society,society)).toBe(society);expect(intersectWorkflowFilter('another',society)).toBe('__NONE__')})
 it('intersecta o cliente misto com a vertente individual ou empresa',()=>{expect(intersectWorkflowClientType('individual','mixed')).toBe('mixed:individual');expect(intersectWorkflowClientType('mixed','company')).toBe('mixed:company');expect(intersectWorkflowClientType('individual','company')).toBe('__NONE__')})
 it('conserva o âmbito em ligações sem substituir uma selecção explícita',()=>{const target=new URLSearchParams('view=work&scopeClientType=individual');preserveWorkflowScope(new URLSearchParams(`scopeSociety=${society}&scopeClientType=company`),target);expect(target.get('scopeSociety')).toBe(society);expect(target.get('scopeClientType')).toBe('individual')})
})
