import { createContext, useContext } from 'react'
import { emptyWorkflowScope, workflowScopeParams } from '../../types/workflowScope'
export const WorkflowScopeContext = createContext(emptyWorkflowScope)
export const useWorkflowScope = () => useContext(WorkflowScopeContext)
export function clearWorkflowScope() {
  const url = new URL(window.location.href)
  for (const key of workflowScopeParams) url.searchParams.delete(key)
  window.history.pushState({}, '', url); window.dispatchEvent(new PopStateEvent('popstate'))
}
