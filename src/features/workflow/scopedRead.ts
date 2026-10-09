import { supabase } from '../../lib/supabase'
import { hasWorkflowScope, workflowScopeArgs, workflowScopeError, type WorkflowScope } from '../../types/workflowScope'

export async function scopedQuery(name: string, scope: WorkflowScope, args?: Record<string, unknown>) {
  const error = workflowScopeError(scope)
  if (error) throw new Error(error)
  if (!supabase) throw new Error('Ligação ao Supabase indisponível.')
  const active = hasWorkflowScope(scope)
  const result = active ? await supabase.rpc(`get_workflow_${name.replace(/^get_/, '')}`, {...args,...workflowScopeArgs(scope)}) : args ? await supabase.rpc(name,args) : await supabase.rpc(name)
  if (active && result.error?.code === 'PGRST202') return {...result,error:{...result.error,message:'Os filtros partilhados ainda não estão disponíveis no servidor. Não foram apresentados resultados globais em seu lugar.'}}
  return result
}
export async function scopedRead(name: string, scope: WorkflowScope, args?: Record<string, unknown>) {
  const result=await scopedQuery(name,scope,args)
  if(result.error)throw new Error(result.error.message)
  return result.data
}
export async function scopedClientIds(scope: WorkflowScope): Promise<Set<string> | null> {
  if (!hasWorkflowScope(scope)) return null
  const data = await scopedRead('get_client_ids', scope)
  if (!Array.isArray(data) || data.some(id => typeof id !== 'string')) throw new Error('Resposta inválida na selecção dos clientes.')
  return new Set(data)
}
