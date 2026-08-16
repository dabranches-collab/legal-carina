import { createClient } from 'npm:@supabase/supabase-js@2.112.1'
import { corsHeaders, isAllowedOrigin, json } from '../_shared/http.ts'

const LOCK_MINUTES = 15
const IP_MAX_ATTEMPTS = 25
const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,31}$/

function normalizeUsername(value: unknown) {
  return String(value ?? '').normalize('NFKC').trim().toLowerCase()
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function deriveAuthPassword(credentialId: string, pin: string) {
  return `CL!${await sha256(`carina-legal-pin-v1:${credentialId}:${pin}`)}`
}

async function hashIp(request: Request) {
  const address = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? ''
  const salt = Deno.env.get('SECURITY_EVENT_HASH_SALT')
  return address && salt ? sha256(`${salt}:${address}`) : null
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(request) })
  if (request.method !== 'POST') return json(request, { error: 'Método não permitido.' }, 405)
  if (!isAllowedOrigin(request)) return json(request, { error: 'Origem não autorizada.' }, 403)

  const url = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const publishableKey = Deno.env.get('SUPABASE_ANON_KEY')
  const eventSalt = Deno.env.get('SECURITY_EVENT_HASH_SALT')
  if (!url || !serviceKey || !publishableKey || !eventSalt) return json(request, { error: 'Serviço de acesso indisponível.' }, 503)

  const genericError = 'Nome de utilizador ou PIN inválido.'
  try {
    const input = await request.json()
    const username = normalizeUsername(input.username)
    const pin = String(input.pin ?? '')
    if (!USERNAME_PATTERN.test(username) || !/^\d{4}$/.test(pin)) return json(request, { error: genericError }, 401)

    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const ipHash = await hashIp(request)
    if (ipHash) {
      const since = new Date(Date.now() - LOCK_MINUTES * 60_000).toISOString()
      const { count, error: rateError } = await admin.from('security_events').select('id', { count:'exact', head:true }).eq('event_type','login_failed').eq('ip_hash',ipHash).gte('occurred_at',since)
      if (rateError) throw rateError
      if ((count ?? 0) >= IP_MAX_ATTEMPTS) return json(request, { error: 'Acesso temporariamente bloqueado. Tente novamente mais tarde.' }, 429)
    }
    const { data: credential, error: credentialError } = await admin.from('user_login_credentials')
      .select('id,user_id,firm_id,auth_email,failed_attempts,locked_until,must_change_pin')
      .eq('username', username).maybeSingle()
    if (credentialError || !credential) return json(request, { error: genericError }, 401)

    const lockedUntil = credential.locked_until ? new Date(credential.locked_until) : null
    if (lockedUntil && lockedUntil.getTime() > Date.now()) {
      return json(request, { error: 'Acesso temporariamente bloqueado. Tente novamente mais tarde.' }, 429)
    }

    const { data: membership, error: membershipError } = await admin.from('firm_members').select('active')
      .eq('firm_id', credential.firm_id).eq('user_id', credential.user_id).maybeSingle()
    if (membershipError) throw membershipError
    if (!membership?.active) return json(request, { error: genericError }, 401)

    const authClient = createClient(url, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const password = await deriveAuthPassword(credential.id, pin)
    const { data, error } = await authClient.auth.signInWithPassword({ email: credential.auth_email, password })
    if (error || !data.session || data.user.id !== credential.user_id) {
      const { data:failure,error:failureError }=await admin.rpc('register_pin_login_failure',{p_credential_id:credential.id,p_ip_hash:ipHash,p_user_agent:request.headers.get('user-agent')})
      if(failureError)throw failureError
      const shouldLock=Boolean(failure?.locked)
      return json(request, { error: shouldLock ? 'Acesso temporariamente bloqueado. Tente novamente mais tarde.' : genericError }, shouldLock ? 429 : 401)
    }

    const { error: successUpdateError } = await admin.from('user_login_credentials').update({
      failed_attempts: 0, locked_until: null, last_success_at: new Date().toISOString(),
    }).eq('id', credential.id)
    if (successUpdateError) throw successUpdateError
    const { error: successEventError } = await admin.from('security_events').insert({
      user_id: credential.user_id, event_type: 'login_succeeded',
      ip_hash: await hashIp(request), user_agent: request.headers.get('user-agent'), metadata: { auth_method: 'pin' },
    })
    if (successEventError) throw successEventError
    return json(request, {
      session: { access_token: data.session.access_token, refresh_token: data.session.refresh_token },
      mustChangePin: Boolean(credential.must_change_pin),
    })
  } catch {
    return json(request, { error: 'Não foi possível concluir o acesso.' }, 400)
  }
})
