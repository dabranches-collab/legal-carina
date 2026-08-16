import { createClient } from 'npm:@supabase/supabase-js@2.112.1'
import { corsHeaders, isAllowedOrigin, json } from '../_shared/http.ts'

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}
async function deriveAuthPassword(credentialId: string, pin: string) {
  return `CL!${await sha256(`carina-legal-pin-v1:${credentialId}:${pin}`)}`
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(request) })
  if (request.method !== 'POST') return json(request, { error: 'Método não permitido.' }, 405)
  if (!isAllowedOrigin(request)) return json(request, { error: 'Origem não autorizada.' }, 403)
  const url = Deno.env.get('SUPABASE_URL'), serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const publishableKey = Deno.env.get('SUPABASE_ANON_KEY'), authorization = request.headers.get('authorization')
  if (!url || !serviceKey || !publishableKey) return json(request, { error: 'Serviço de acesso indisponível.' }, 503)
  if (!authorization?.startsWith('Bearer ')) return json(request, { error: 'Autenticação necessária.' }, 401)
  try {
    const input = await request.json(), currentPin = String(input.currentPin ?? ''), newPin = String(input.newPin ?? '')
    if (!/^\d{4}$/.test(currentPin) || !/^\d{4}$/.test(newPin) || currentPin === newPin)
      return json(request, { error: 'Escolha um PIN novo de 4 algarismos.' }, 400)
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: authData, error: authError } = await admin.auth.getUser(authorization.slice(7))
    if (authError || !authData.user) return json(request, { error: 'Sessão inválida.' }, 401)
    const { data: credential, error: credentialError } = await admin.from('user_login_credentials')
      .select('id,user_id,firm_id,auth_email,must_change_pin').eq('user_id', authData.user.id).maybeSingle()
    if (credentialError || !credential) return json(request, { error: 'Acesso por PIN não configurado.' }, 400)
    const {data:membership}=await admin.from('firm_members').select('active').eq('firm_id',credential.firm_id).eq('user_id',authData.user.id).maybeSingle()
    if(!membership?.active)return json(request,{error:'Acesso suspenso.'},403)
    const authClient = createClient(url, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const { error: verificationError } = await authClient.auth.signInWithPassword({ email: credential.auth_email, password: await deriveAuthPassword(credential.id, currentPin) })
    if (verificationError) return json(request, { error: 'O PIN inicial não está correto.' }, 401)
    const appMetadata = { ...(authData.user.app_metadata ?? {}), must_change_pin: false }
    const { error: updateError } = await admin.auth.admin.updateUserById(authData.user.id, { password: await deriveAuthPassword(credential.id, newPin), app_metadata: appMetadata })
    if (updateError) throw updateError
    const { error: credentialUpdateError } = await admin.from('user_login_credentials').update({ must_change_pin: false, pin_changed_at: new Date().toISOString(), failed_attempts: 0, locked_until: null }).eq('id', credential.id)
    if (credentialUpdateError) throw credentialUpdateError
    const { error: auditError } = await admin.from('audit_log').insert({ firm_id: credential.firm_id, actor_user_id: authData.user.id, action: 'update', entity_type: 'user_access', entity_id: authData.user.id, new_data: { pin_changed: true, mandatory_change_completed: true } })
    if (auditError) throw auditError
    const { error: eventError } = await admin.from('security_events').insert({ user_id: authData.user.id, event_type: 'pin_changed', user_agent: request.headers.get('user-agent'), metadata: { mandatory_change: Boolean(credential.must_change_pin) } })
    if (eventError) throw eventError
    return json(request, { changed: true })
  } catch { return json(request, { error: 'Não foi possível alterar o PIN.' }, 400) }
})
