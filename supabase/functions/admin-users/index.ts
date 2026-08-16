import { createClient } from 'npm:@supabase/supabase-js@2.112.0'
import { corsHeaders, isAllowedOrigin, json } from '../_shared/http.ts'

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function normalizeUsername(value: unknown) {
  return String(value ?? '').normalize('NFKC').trim().toLowerCase()
}

function normalizeDisplayName(value: unknown) {
  return String(value ?? '').normalize('NFKC').replace(/\s+/g, ' ').trim()
}

async function deriveAuthPassword(credentialId: string, pin: string) {
  return `CL!${await sha256(`carina-legal-pin-v1:${credentialId}:${pin}`)}`
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
    if (input.action === 'list_users') {
      const firmId = String(input.firmId ?? '')
      if (!memberships.some((membership) => membership.firm_id === firmId)) return json(request, { error: 'Sociedade inválida.' }, 400)
      const { data: firmUsers, error: memberError } = await admin.from('firm_members').select('user_id, role, active, created_at').eq('firm_id', firmId)
      if (memberError) throw memberError
      const { data: authUsers, error: usersError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
      if (usersError) throw usersError
      const { data: credentials, error: credentialsError } = await admin.from('user_login_credentials').select('user_id,username,display_name').eq('firm_id', firmId)
      if (credentialsError) throw credentialsError
      const authById = new Map(authUsers.users.map((user) => [user.id, user]))
      const usernameById = new Map((credentials ?? []).map((credential) => [credential.user_id, credential.username]))
      const displayNameById = new Map((credentials ?? []).map((credential) => [credential.user_id, credential.display_name]))
      return json(request, { users: firmUsers.map((membership) => {
        const user = authById.get(membership.user_id)
        return { userId: membership.user_id, username: usernameById.get(membership.user_id) ?? '', displayName: displayNameById.get(membership.user_id) ?? '', role: membership.role, active: membership.active, invitedAt: membership.created_at, lastSignInAt: user?.last_sign_in_at ?? null }
      }) })
    }

    if (input.action === 'list_login_activity') {
      const firmId = String(input.firmId ?? '')
      const callerMembership = memberships.find((membership) => membership.firm_id === firmId)
      if (callerMembership?.role !== 'owner') return json(request, { error: 'Apenas o proprietário pode consultar o histórico de acessos.' }, 403)
      const { data: firmUsers, error: memberError } = await admin.from('firm_members').select('user_id').eq('firm_id', firmId)
      if (memberError) throw memberError
      const userIds = (firmUsers ?? []).map((membership) => membership.user_id)
      if (!userIds.length) return json(request, { groups: [] })
      const [{ data: events, error: eventsError }, { data: credentials, error: credentialsError }] = await Promise.all([
        admin.from('security_events').select('id,user_id,occurred_at').eq('event_type', 'login_succeeded').in('user_id', userIds).order('occurred_at', { ascending: false }).limit(500),
        admin.from('user_login_credentials').select('user_id,username,display_name').eq('firm_id', firmId),
      ])
      if (eventsError || credentialsError) throw eventsError ?? credentialsError
      const identityById = new Map((credentials ?? []).map((credential) => [credential.user_id, credential]))
      const groups: Array<{ userId:string; username:string; displayName:string; firstAt:string; lastAt:string; count:number; events:string[] }> = []
      for (const event of events ?? []) {
        if (!event.user_id) continue
        const previous = groups.at(-1)
        if (previous?.userId === event.user_id) {
          previous.count += 1
          previous.firstAt = event.occurred_at
          previous.events.push(event.occurred_at)
        } else {
          const identity = identityById.get(event.user_id)
          groups.push({ userId:event.user_id, username:identity?.username ?? '', displayName:identity?.display_name ?? identity?.username ?? 'Utilizador', firstAt:event.occurred_at, lastAt:event.occurred_at, count:1, events:[event.occurred_at] })
        }
      }
      return json(request, { groups: groups.slice(0, 100) })
    }

    if (input.action === 'create_pin_user') {
      const firmId = String(input.firmId ?? '')
      const username = normalizeUsername(input.username)
      const displayName = normalizeDisplayName(input.displayName)
      const pin = String(input.pin ?? '')
      const role = String(input.role ?? '')
      const allowedRoles = ['admin', 'billing', 'professional', 'viewer', 'auditor']
      if (!memberships.some((membership) => membership.firm_id === firmId)
        || !allowedRoles.includes(role)
        || displayName.length < 1 || displayName.length > 100
        || !/^[a-z0-9][a-z0-9._-]{2,31}$/.test(username)
        || !/^\d{4}$/.test(pin)) return json(request, { error: 'Nome, PIN ou perfil inválido.' }, 400)

      const credentialId = crypto.randomUUID()
      const authEmail = `lc-${credentialId}@auth.invalid`
      const password = await deriveAuthPassword(credentialId, pin)
      const { data, error } = await admin.auth.admin.createUser({
        email: authEmail, password, email_confirm: true, user_metadata: { username, display_name: displayName }, app_metadata: { must_change_pin: true },
      })
      if (error || !data.user) throw error ?? new Error('Utilizador não criado')
      const { error: membershipError } = await admin.from('firm_members').insert({ firm_id: firmId, user_id: data.user.id, role })
      if (membershipError) { await admin.auth.admin.deleteUser(data.user.id); throw membershipError }
      const { error: credentialError } = await admin.from('user_login_credentials').insert({
        id: credentialId, firm_id: firmId, user_id: data.user.id, username, display_name: displayName, auth_email: authEmail, created_by: authData.user.id, must_change_pin: true,
      })
      if (credentialError) { await admin.auth.admin.deleteUser(data.user.id); throw credentialError }
      await admin.from('audit_log').insert({
        firm_id: firmId, actor_user_id: authData.user.id, action: 'insert', entity_type: 'user_access',
        entity_id: data.user.id, new_data: { username, display_name: displayName, role, active: true, auth_method: 'pin' },
      })
      return json(request, { userId: data.user.id, username }, 201)
    }

    if (input.action === 'configure_pin_access') {
      const firmId = String(input.firmId ?? '')
      const userId = String(input.userId ?? '')
      const username = normalizeUsername(input.username)
      const displayName = normalizeDisplayName(input.displayName)
      const pin = String(input.pin ?? '')
      if (!memberships.some((membership) => membership.firm_id === firmId)
        || !/^[a-z0-9][a-z0-9._-]{2,31}$/.test(username)
        || displayName.length < 1 || displayName.length > 100
        || !/^\d{4}$/.test(pin)) return json(request, { error: 'Nome ou PIN inválido.' }, 400)
      const { data: target } = await admin.from('firm_members').select('user_id,role').eq('firm_id', firmId).eq('user_id', userId).maybeSingle()
      if (!target) return json(request, { error: 'Utilizador inválido.' }, 400)
      const callerMembership = memberships.find((membership) => membership.firm_id === firmId)
      if (target.role === 'owner' && (callerMembership?.role !== 'owner' || userId !== authData.user.id)) {
        return json(request, { error: 'O acesso do proprietário só pode ser redefinido pelo próprio.' }, 403)
      }
      const { data: existing } = await admin.from('user_login_credentials').select('id,auth_email').eq('user_id', userId).maybeSingle()
      const credentialId = existing?.id ?? crypto.randomUUID()
      const authEmail = existing?.auth_email ?? `lc-${credentialId}@auth.invalid`
      const password = await deriveAuthPassword(credentialId, pin)
      const { data: targetAuthData, error: targetAuthError } = await admin.auth.admin.getUserById(userId)
      if (targetAuthError || !targetAuthData.user) throw targetAuthError ?? new Error('Utilizador não encontrado')
      const { error: authUpdateError } = await admin.auth.admin.updateUserById(userId, {
        email: authEmail, password, email_confirm: true, user_metadata: { ...(targetAuthData.user.user_metadata ?? {}), username, display_name: displayName },
        app_metadata: { ...(targetAuthData.user.app_metadata ?? {}), must_change_pin: true },
      })
      if (authUpdateError) throw authUpdateError
      const { error: credentialError } = await admin.from('user_login_credentials').upsert({
        id: credentialId, firm_id: firmId, user_id: userId, username, display_name: displayName, auth_email: authEmail, created_by: authData.user.id,
        failed_attempts: 0, locked_until: null, must_change_pin: true, pin_changed_at: null,
      }, { onConflict: 'user_id' })
      if (credentialError) throw credentialError
      await admin.from('audit_log').insert({
        firm_id: firmId, actor_user_id: authData.user.id, action: existing ? 'update' : 'insert', entity_type: 'user_access',
        entity_id: userId, new_data: { username, display_name: displayName, auth_method: 'pin', initial_pin_assigned: true, mandatory_change_required: true },
      })
      return json(request, { configured: true, username })
    }

    if (input.action === 'update_user_identity') {
      const firmId = String(input.firmId ?? ''), userId = String(input.userId ?? '')
      const username = normalizeUsername(input.username), displayName = normalizeDisplayName(input.displayName)
      if (!memberships.some((membership) => membership.firm_id === firmId)
        || !/^[a-z0-9][a-z0-9._-]{2,31}$/.test(username)
        || displayName.length < 1 || displayName.length > 100) return json(request, { error: 'Nome ou utilizador inválido.' }, 400)
      const { data: target } = await admin.from('firm_members').select('user_id,role').eq('firm_id', firmId).eq('user_id', userId).maybeSingle()
      if (!target) return json(request, { error: 'Utilizador inválido.' }, 400)
      const callerMembership = memberships.find((membership) => membership.firm_id === firmId)
      if (target.role === 'owner' && (callerMembership?.role !== 'owner' || userId !== authData.user.id)) return json(request, { error: 'O perfil do proprietário só pode ser alterado pelo próprio.' }, 403)
      const { data: targetAuthData, error: targetAuthError } = await admin.auth.admin.getUserById(userId)
      if (targetAuthError || !targetAuthData.user) throw targetAuthError ?? new Error('Utilizador não encontrado')
      const { error: authUpdateError } = await admin.auth.admin.updateUserById(userId, { user_metadata: { ...(targetAuthData.user.user_metadata ?? {}), username, display_name: displayName } })
      if (authUpdateError) throw authUpdateError
      const { error: credentialError } = await admin.from('user_login_credentials').update({ username, display_name: displayName }).eq('user_id', userId).eq('firm_id', firmId)
      if (credentialError) throw credentialError
      await admin.from('audit_log').insert({ firm_id: firmId, actor_user_id: authData.user.id, action: 'update', entity_type: 'user_identity', entity_id: userId, new_data: { username, display_name: displayName } })
      return json(request, { updated: true })
    }

    if (input.action === 'get_billing_permissions') {
      const firmId = String(input.firmId ?? '')
      const userId = String(input.userId ?? '')
      if (!memberships.some((membership) => membership.firm_id === firmId)) return json(request, { error: 'Sociedade inválida.' }, 400)
      const [{ data: entities, error: entityError }, { data: grants, error: grantError }, { data: finance, error: financeError }] = await Promise.all([
        admin.from('billing_entities').select('id,name').eq('firm_id', firmId).eq('active', true).order('name'),
        admin.from('access_grants').select('billing_entity_id').eq('firm_id', firmId).eq('user_id', userId).eq('principal_type', 'user').eq('resource_type', 'billing_entity').eq('active', true),
        admin.from('billing_entity_financial_permissions').select('billing_entity_id,can_view_financials').eq('firm_id', firmId).eq('user_id', userId),
      ])
      if (entityError || grantError || financeError) throw entityError ?? grantError ?? financeError
      const visible = new Set((grants ?? []).map((grant) => grant.billing_entity_id))
      const financial = new Set((finance ?? []).filter((item) => item.can_view_financials).map((item) => item.billing_entity_id))
      return json(request, { billingEntities: (entities ?? []).map((entity) => ({ billingEntityId: entity.id, name: entity.name, visible: visible.has(entity.id), financial: financial.has(entity.id) })) })
    }

    if (input.action === 'set_billing_permissions') {
      const firmId = String(input.firmId ?? '')
      const userId = String(input.userId ?? '')
      const permissions = Array.isArray(input.permissions) ? input.permissions : []
      if (!memberships.some((membership) => membership.firm_id === firmId)) return json(request, { error: 'Sociedade inválida.' }, 400)
      const { data: target } = await admin.from('firm_members').select('role').eq('firm_id', firmId).eq('user_id', userId).maybeSingle()
      if (!target || ['owner', 'admin'].includes(target.role)) return json(request, { error: 'As permissões deste perfil são integrais.' }, 400)
      const { data: entities } = await admin.from('billing_entities').select('id').eq('firm_id', firmId)
      const allowedIds = new Set((entities ?? []).map((entity) => entity.id))
      if (permissions.some((item) => !allowedIds.has(String(item.billingEntityId ?? '')) || (item.financial && !item.visible))) return json(request, { error: 'Permissões inválidas.' }, 400)
      const { error: deleteGrantError } = await admin.from('access_grants').delete().eq('firm_id', firmId).eq('user_id', userId).eq('principal_type', 'user').eq('resource_type', 'billing_entity')
      const { error: deleteFinanceError } = await admin.from('billing_entity_financial_permissions').delete().eq('firm_id', firmId).eq('user_id', userId)
      if (deleteGrantError || deleteFinanceError) throw deleteGrantError ?? deleteFinanceError
      const visibleRows = permissions.filter((item) => item.visible).map((item) => ({ firm_id: firmId, principal_type: 'user', user_id: userId, resource_type: 'billing_entity', billing_entity_id: item.billingEntityId, permission: target.role === 'billing' ? 'billing' : target.role === 'professional' ? 'edit' : 'view', created_by: authData.user.id }))
      const financeRows = permissions.filter((item) => item.visible).map((item) => ({ firm_id: firmId, user_id: userId, billing_entity_id: item.billingEntityId, can_view_financials: Boolean(item.financial), created_by: authData.user.id }))
      if (visibleRows.length) { const { error } = await admin.from('access_grants').insert(visibleRows); if (error) throw error }
      if (financeRows.length) { const { error } = await admin.from('billing_entity_financial_permissions').insert(financeRows); if (error) throw error }
      await admin.from('audit_log').insert({ firm_id: firmId, actor_user_id: authData.user.id, action: 'update', entity_type: 'user_billing_permissions', entity_id: userId, new_data: { billing_entities: permissions.map((item) => ({ billing_entity_id: item.billingEntityId, visible: Boolean(item.visible), financial: Boolean(item.financial) })) } })
      return json(request, { updated: true })
    }

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

    if (input.action === 'update_user') {
      const firmId = String(input.firmId ?? '')
      const userId = String(input.userId ?? '')
      const role = String(input.role ?? '')
      const active = Boolean(input.active)
      const allowedRoles = ['admin', 'billing', 'professional', 'viewer', 'auditor']
      if (!memberships.some((membership) => membership.firm_id === firmId) || !allowedRoles.includes(role)) return json(request, { error: 'Alteração inválida.' }, 400)
      const { data: target } = await admin.from('firm_members').select('role').eq('firm_id', firmId).eq('user_id', userId).maybeSingle()
      if (!target || target.role === 'owner') return json(request, { error: 'O proprietário não pode ser alterado por esta operação.' }, 400)
      const { error } = await admin.from('firm_members').update({ role, active }).eq('firm_id', firmId).eq('user_id', userId)
      if (error) throw error
      return json(request, { updated: true })
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
