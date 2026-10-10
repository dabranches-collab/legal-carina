import { supabase } from '../../lib/supabase'
import { mixedProfileType } from '../../types/workflowScope'
export type WorkScopeArgs = Record<string, string | number | boolean | null>
function metricNumber(value: unknown) {
  if (!['number', 'string'].includes(typeof value) || !Number.isFinite(Number(value))) throw new Error('Resumo de clientes MISTOS inválido.')
  return Number(value)
}
export async function mixedWorkClientIds(clientId: string | null): Promise<string[]> {
  if (!supabase) throw new Error('Ligação indisponível.')
  const types = new Map<string, Set<string>>()
  for (let from = 0;; from += 1000) {
    let query = supabase.from('client_profiles').select('client_id,client_type').eq('active', true).order('id').range(from, from + 999)
    if (clientId) query = query.eq('client_id', clientId)
    const response = await query
    if (response.error) throw response.error
    const rows = response.data ?? []
    for (const profile of rows) {
      if (clientId && profile.client_id !== clientId) continue
      const set = types.get(profile.client_id) ?? new Set<string>()
      set.add(profile.client_type); types.set(profile.client_id, set)
    }
    if (rows.length < 1000) break
  }
  return [...types].filter(([, types]) => types.has('individual') && types.has('company')).map(([id]) => id)
}
// Each client is counted once. RPCs receive a canonical profile type, never "mixed".
export async function mixedWorkAggregate(name: string, args: WorkScopeArgs, summaries: boolean) {
  if (!supabase) throw new Error('Ligação indisponível.')
  const ids = await mixedWorkClientIds(typeof args.p_client_id === 'string' ? args.p_client_id : null)
  const data: Record<string, number | Record<string, number>> = {}
  for (let offset = 0; offset < ids.length; offset += 6) {
    const responses = await Promise.all(ids.slice(offset, offset + 6).map(id => supabase!.rpc(name, { ...args, p_client_type: mixedProfileType(args.p_client_type), p_client_id: id })))
    for (const response of responses) {
      if (response.error) return { data: null, error: response.error }
      if (!response.data || typeof response.data !== 'object' || Array.isArray(response.data)) throw new Error('Resumo de clientes MISTOS inválido.')
      for (const [kind, value] of Object.entries(response.data)) {
        if (summaries) {
          if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Resumo de clientes MISTOS inválido.')
          const target = (data[kind] ?? {}) as Record<string, number>
          for (const [metric, amount] of Object.entries(value)) target[metric] = (target[metric] ?? 0) + metricNumber(amount)
          data[kind] = target
        } else data[kind] = Number(data[kind] ?? 0) + metricNumber(value)
      }
    }
  }
  return { data, error: null }
}
