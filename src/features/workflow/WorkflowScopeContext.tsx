import { useEffect, useState, type ReactNode } from 'react'
import { workflowPreviewEnabled } from '../../types/workflowNavigation'
import { readWorkflowScope, workflowScopeError } from '../../types/workflowScope'
import { WorkflowScopeContext, clearWorkflowScope } from './useWorkflowScope'

export function WorkflowScopeProvider({ children }: { children: ReactNode }) {
  const enabled = workflowPreviewEnabled(window.location.search, import.meta.env.DEV, import.meta.env.VITE_APP_ENV, import.meta.env.VITE_WORKFLOW_NAVIGATION)
  const [scope, setScope] = useState(() => readWorkflowScope(window.location.search, enabled))
  useEffect(() => {
    const sync = () => setScope(readWorkflowScope(window.location.search, enabled))
    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
  }, [enabled])
  // Remount the read views so a previous scope cannot leave stale rows or dialogs.
  return <WorkflowScopeContext.Provider value={scope}><div key={JSON.stringify(scope)}>{workflowScopeError(scope) ? <div role="alert" className="card m-4 p-5">{workflowScopeError(scope)}<button className="control ml-3 min-h-11 px-3" onClick={clearWorkflowScope}>Limpar âmbito</button></div> : children}</div></WorkflowScopeContext.Provider>
}
