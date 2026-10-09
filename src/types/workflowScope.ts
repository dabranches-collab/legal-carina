export type WorkflowScope = { society: string; professional: string; clientType: string }
export const emptyWorkflowScope: WorkflowScope = { society: '', professional: '', clientType: '' }
export const workflowScopeParams = ['scopeSociety', 'scopeProfessional', 'scopeClientType'] as const
export function readWorkflowScope(search: string, enabled: boolean): WorkflowScope {
  if (!enabled) return emptyWorkflowScope
  const params = new URLSearchParams(search)
  return { society: params.get(workflowScopeParams[0]) ?? '', professional: params.get(workflowScopeParams[1]) ?? '', clientType: params.get(workflowScopeParams[2]) ?? '' }
}
export function workflowScopeError(scope: WorkflowScope): string {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return ((scope.society && !uuid.test(scope.society)) || (scope.professional && !uuid.test(scope.professional)) || (scope.clientType && !['individual', 'company', 'mixed'].includes(scope.clientType))) ? 'O âmbito indicado no endereço é inválido. Limpe os filtros para continuar.' : ''
}
export const hasWorkflowScope = (scope: WorkflowScope) => Boolean(scope.society || scope.professional || scope.clientType)
export const workflowScopeArgs = (scope: WorkflowScope) => ({ p_scope_billing_entity_id: scope.society || null, p_scope_professional_id: scope.professional || null, p_scope_client_type: scope.clientType || null })
export function preserveWorkflowScope(source: URLSearchParams, target: URLSearchParams) {
  for (const param of workflowScopeParams) if (!target.has(param) && source.has(param)) target.set(param, source.get(param)!)
}
// A local drill-down and the shared scope must intersect, never silently override.
export function intersectWorkflowFilter(local: string | null, shared: string): string {
  return local && shared && local !== shared ? '__NONE__' : local || shared
}
export function intersectWorkflowClientType(local: string | null, shared: string): string {
  if (local === 'mixed' && ['individual', 'company'].includes(shared)) return `mixed:${shared}`
  if (shared === 'mixed' && local && ['individual', 'company'].includes(local)) return `mixed:${local}`
  return intersectWorkflowFilter(local, shared)
}
export const isMixedWorkScope = (type: string | null) => type === 'mixed' || type === 'mixed:individual' || type === 'mixed:company'
export const mixedProfileType = (type: string | number | boolean | null) => typeof type === 'string' && type.startsWith('mixed:') ? type.slice(6) : null
