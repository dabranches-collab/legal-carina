import type { WorkflowScope } from '../../types/workflowScope'
// Existing allocated fixed-fee lines are filtered; their amounts are never recalculated.
export function matchesWorkflowWorkScope(line: {billingEntityId:string|null;professionalId:string|null;clientType:string|null;mixedClient:boolean}, scope: WorkflowScope) {
  return (!scope.society || line.billingEntityId === scope.society) && (!scope.professional || line.professionalId === scope.professional) && (!scope.clientType || (scope.clientType === 'mixed' ? line.mixedClient : line.clientType === scope.clientType))
}
