import { createClient } from 'npm:@supabase/supabase-js@2.112.0'
import { corsHeaders, isAllowedOrigin, json } from '../_shared/http.ts'

const anonymousEvents = new Set(['login_failed', 'password_recovery_requested'])
const authenticatedEvents = new Set(['login_succeeded', 'logout', 'password_changed', 'access_denied'])

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(request) })
  if (request.method !== 'POST') return json(request, { error: 'Método não permitido.' }, 405)
  if (!isAllowedOrigin(request)) return json(request, { error: 'Origem não autorizada.' }, 403)

  try {
    const { eventType, email, metadata = {} } = await request.json()
    if (!anonymousEvents.has(eventType) && !authenticatedEvents.has(eventType)) {
      return json(request, { error: 'Evento de segurança inválido.' }, 400)
    }

    const url = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const salt = Deno.env.get('SECURITY_EVENT_HASH_SALT')
    if (!url || !serviceKey || !salt) return json(request, { error: 'Serviço de auditoria não configurado.' }, 503)

    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const authorization = request.headers.get('authorization')
    let userId: string | null = null
    let sessionId: string | null = null
    if (authenticatedEvents.has(eventType)) {
      if (!authorization?.startsWith('Bearer ')) return json(request, { error: 'Autenticação necessária.' }, 401)
      const token = authorization.slice(7)
      const { data, error } = await admin.auth.getUser(token)
      if (error || !data.user) return json(request, { error: 'Sessão inválida.' }, 401)
      userId = data.user.id
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
      sessionId = typeof payload.session_id === 'string' ? payload.session_id : null
    }

    const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? ''
    const { error: insertError } = await admin.from('security_events').insert({
      user_id: userId,
      event_type: eventType,
      session_id: sessionId,
      ip_hash: forwardedFor ? await sha256(`${salt}:${forwardedFor}`) : null,
      email_hash: typeof email === 'string' && email ? await sha256(`${salt}:${email.trim().toLowerCase()}`) : null,
      user_agent: request.headers.get('user-agent'),
      metadata: typeof metadata === 'object' && metadata !== null ? metadata : {},
    })
    if (insertError) throw insertError
    return json(request, { recorded: true }, 201)
  } catch {
    return json(request, { error: 'Não foi possível registar o evento.' }, 400)
  }
})
