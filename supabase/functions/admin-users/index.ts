import { createClient } from 'npm:@supabase/supabase-js@2.112.0'
import { corsHeaders, isAllowedOrigin, json } from '../_shared/http.ts'

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(request) })
  if (request.method !== 'POST') return json(request, { error: 'Método não permitido.' }, 405)
  if (!isAllowedOrigin(request)) return json(request, { error: 'Origem não autorizada.' }, 403)

  const url = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const authorization = request.headers.get('authorization')
  if (!url || !serviceKey) return json(request, { error: 'Serviço administrativo não configurado.' }, 503)
  if (!authorization?.startsWith('Bearer ')) return json(request, { error: 'Autenticação necessária.' }, 401)

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const token = authorization.slice(7)
  const { data: authData, error: authError } = await admin.auth.getUser(token)
  if (authError || !authData.user) return json(request, { error: 'Sessão inválida.' }, 401)

  const { data: memberships } = await admin.from('firm_members').select('firm_id, role')
    .eq('user_id', authData.user.id).eq('active', true).in('role', ['owner', 'admin'])
  if (!memberships?.length) return json(request, { error: 'Permissão administrativa necessária.' }, 403)

  try {
    const input = await request.json()
    if (input.action === 'invite_user') {
      const firmId = String(input.firmId ?? '')
      const allowedFirm = memberships.some((membership) => membership.firm_id === firmId)
      const allowedRoles = ['admin', 'billing', 'professional', 'viewer', 'auditor']
      if (!allowedFirm || !allowedRoles.includes(input.role)) return json(request, { error: 'Convite inválido.' }, 400)
      const { data, error } = await admin.auth.admin.inviteUserByEmail(String(input.email ?? ''), {
        redirectTo: String(input.redirectTo ?? ''),
      })
      if (error || !data.user) throw error ?? new Error('Convite sem utilizador')
      const { error: membershipError } = await admin.from('firm_members').insert({ firm_id: firmId, user_id: data.user.id, role: input.role })
      if (membershipError) throw membershipError
      return json(request, { userId: data.user.id }, 201)
    }

    if (input.action === 'publish_legal_documents') {
      const documents = Array.isArray(input.documents) ? input.documents : []
      const requiredTypes = ['terms_of_service', 'privacy_policy', 'gdpr_terms']
      if (documents.length !== 3 || !requiredTypes.every((type) => documents.some((document) => document.documentType === type))) {
        return json(request, { error: 'São necessários os três documentos legais.' }, 400)
      }
      for (const document of documents) {
        if (!document.version || !document.title || !document.bodyMarkdown || !document.effectiveAt) {
          return json(request, { error: 'Documento legal incompleto.' }, 400)
        }
      }
      const rows = await Promise.all(documents.map(async (document) => ({
        document_type: document.documentType,
        version: document.version,
        title: document.title,
        body_markdown: document.bodyMarkdown,
        effective_at: document.effectiveAt,
        content_hash: await sha256(document.bodyMarkdown),
      })))
      const { data: published, error } = await admin.rpc('publish_legal_document_set', {
        target_documents: rows,
        publisher_user_id: authData.user.id,
      })
      if (error) throw error
      return json(request, { published }, 201)
    }
    return json(request, { error: 'Ação administrativa desconhecida.' }, 400)
  } catch {
    return json(request, { error: 'A operação administrativa não foi concluída.' }, 400)
  }
})
