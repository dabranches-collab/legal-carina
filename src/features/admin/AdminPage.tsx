import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Icon } from '../../components/ui/Icon'
import { supabase } from '../../lib/supabase'
import { AdminUsersTable } from './AdminTables'
import { useAuth } from '../auth/AuthContext'
import { makeAccessMessage } from './accessMessage'

type Role = 'admin'|'manager'|'operator'|'billing'|'professional'|'viewer'|'auditor'
type AdminUser = { userId:string; username:string; displayName:string; display_name?:string; pinConfigured:boolean; role:Role|'owner'; active:boolean; invitedAt:string; lastSignInAt:string|null }
type BillingAccess = { billingEntityId:string; name:string; visible:boolean; financial:boolean }
const roleHelp:Record<Role,string> = {
  admin:'Gestão integral da aplicação, utilizadores e configurações.', manager:'Gestão operacional dentro das Sociedades autorizadas; os valores financeiros dependem de autorização separada.', operator:'Actualização diária dos movimentos nas Sociedades autorizadas: completar dados, corrigir Sociedade e actualizar facturação e pagamento. Sem administração de utilizadores ou configurações.', billing:'Facturação, recebimentos e valores das sociedades autorizadas.', professional:'Registos e processos dentro das sociedades autorizadas.', viewer:'Consulta dos dados autorizados, sem alteração.', auditor:'Consulta e auditoria dos dados autorizados, sem alteração operacional.',
}
export function AdminPage() {
  const {user:currentUser}=useAuth()
  const [firmId,setFirmId] = useState('')
  const [users,setUsers] = useState<AdminUser[]>([])
  const [loading,setLoading] = useState(true)
  const [error,setError] = useState('')
  const [notice,setNotice] = useState('')
  const [accessMessage,setAccessMessage] = useState('')
  const [username,setUsername] = useState('')
  const [displayName,setDisplayName] = useState('')
  const [pin,setPin] = useState('')
  const [role,setRole] = useState<Role>('professional')
  const [newAccess,setNewAccess] = useState<BillingAccess[]>([])
  const [sending,setSending] = useState(false)
  const [editing,setEditing] = useState<AdminUser|null>(null)
  const [access,setAccess] = useState<BillingAccess[]>([])
  const [editUsername,setEditUsername] = useState('')
  const [editDisplayName,setEditDisplayName] = useState('')
  const [editPin,setEditPin] = useState('')
  const [editRole,setEditRole] = useState<Role>('professional')
  const [editActive,setEditActive] = useState(true)

  const invoke = useCallback(async (body:Record<string,unknown>) => {
    if (!supabase) throw new Error('Ligação ao Supabase indisponível.')
    const { data, error: failure } = await supabase.functions.invoke('admin-users', { body })
    let message=data?.error as string|undefined
    if(!message&&failure){const response=(failure as {context?:Response}).context;if(response){try{const payload=await response.clone().json() as {error?:string};message=payload.error}catch{/* mantém a mensagem técnica como último recurso */}}}
    if (failure || message) throw new Error(message ?? failure?.message ?? 'Operação não concluída.')
    return data
  }, [])

  const load = useCallback(async () => {
    if (!supabase) { setError('Ligação ao Supabase indisponível.'); setLoading(false); return }
    setLoading(true); setError('')
    const { data:membership,error:membershipError } = await supabase.from('firm_members').select('firm_id,role').eq('active',true).in('role',['owner','admin']).limit(1).maybeSingle()
    if (membershipError || !membership) { setError('Permissão administrativa necessária.'); setLoading(false); return }
    setFirmId(membership.firm_id)
    try {
      const [data,entitiesResult]=await Promise.all([invoke({ action:'list_users', firmId:membership.firm_id }),supabase.from('billing_entities').select('id,name').eq('firm_id',membership.firm_id).eq('active',true).order('name')])
      setUsers((data.users ?? []).map((item:AdminUser)=>({...item,displayName:(item.userId===currentUser?.id?currentUser.user_metadata?.display_name:'')||item.displayName||item.display_name||item.username})))
      if(!entitiesResult.error) setNewAccess((entitiesResult.data??[]).map(entity=>({billingEntityId:entity.id,name:entity.name,visible:false,financial:false})))
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível listar os utilizadores.') }
    setLoading(false)
  }, [invoke,currentUser])

  useEffect(() => { void load() }, [load])

  async function createUser(event:FormEvent) {
    event.preventDefault(); if (!firmId || pin.length !== 4) return
    setSending(true); setError(''); setNotice('')
    try { const temporaryPin=pin; const created=await invoke({ action:'create_pin_user', firmId, displayName, username, pin, role }); if(role!=='admin') await invoke({action:'set_billing_permissions',firmId,userId:created.userId,permissions:newAccess.map(({billingEntityId,visible,financial})=>({billingEntityId,visible,financial}))}); setAccessMessage(makeAccessMessage(username,temporaryPin)); setNotice(`Acesso criado para ${displayName}.`); setDisplayName(''); setUsername(''); setPin(''); await load() }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível criar o acesso.') }
    setSending(false)
  }

  async function openPermissions(user:AdminUser) {
    setEditing(user); setEditDisplayName(user.displayName || user.username); setEditUsername(user.username); setEditPin(''); setEditRole(user.role === 'owner' ? 'admin' : user.role); setEditActive(user.active); setError('')
    if (user.role === 'owner' || user.role === 'admin') {
      setAccess(newAccess.map(item=>({...item,visible:false,financial:false})))
      return
    }
    try { const data = await invoke({ action:'get_billing_permissions', firmId, userId:user.userId }); setAccess(data.billingEntities ?? []) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível carregar as permissões.') }
  }

  async function saveAccess(event:FormEvent) {
    event.preventDefault(); if (!editing) return
    setSending(true); setError('')
    try {
      if (editPin) await invoke({ action:'configure_pin_access', firmId, userId:editing.userId, displayName:editDisplayName, username:editUsername, pin:editPin })
      else await invoke({ action:'update_user_identity', firmId, userId:editing.userId, displayName:editDisplayName, username:editUsername })
      if (editing.userId===currentUser?.id) {
        const {error:identityError}=await supabase!.auth.updateUser({data:{...(currentUser.user_metadata??{}),username:editUsername,display_name:editDisplayName.trim()}})
        if(identityError) throw identityError
      }
      if (editing.role !== 'owner') await invoke({ action:'update_user', firmId, userId:editing.userId, role:editRole, active:editActive })
      if (editing.role !== 'owner' && editRole !== 'admin') await invoke({ action:'set_billing_permissions', firmId, userId:editing.userId, permissions:access.map(({ billingEntityId,visible,financial }) => ({ billingEntityId,visible,financial })) })
      if (editPin) setAccessMessage(makeAccessMessage(editUsername,editPin))
      setUsers(values=>values.map(item=>item.userId===editing.userId?{...item,displayName:editDisplayName.trim(),username:editUsername,role:item.role==='owner'?item.role:editRole,active:item.role==='owner'?item.active:editActive}:item))
      setNotice(`Acesso de ${editDisplayName || editing.displayName} actualizado.`); setEditing(null)
      await load()
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível guardar as permissões.') }
    setSending(false)
  }

  async function copyAccessMessage() {
    try { await navigator.clipboard.writeText(accessMessage); setNotice('Mensagem de acesso copiada. Pode colá-la no email ou WhatsApp.') }
    catch { setError('Não foi possível copiar automaticamente. Seleccione o texto da mensagem e copie-o manualmente.') }
  }

  async function copyCredentials(login:string,temporaryPin?:string) {
    const message=makeAccessMessage(login,temporaryPin)
    setAccessMessage(message)
    try { await navigator.clipboard.writeText(message); setNotice(temporaryPin?'Dados de acesso copiados: link, utilizador e PIN temporário.':'Dados de acesso copiados: link e utilizador.') }
    catch { setError('Não foi possível copiar automaticamente. A mensagem ficou disponível para cópia manual.') }
  }

  return <div className="space-y-5">
    {error && <div role="alert" className="rounded-lg bg-danger-soft p-3 text-sm text-danger">{error}</div>}
    {notice && <div role="status" className="rounded-lg bg-success-soft p-3 text-sm text-success">{notice}</div>}
    {accessMessage && <div className="app-safe-fixed fixed z-[85] grid place-items-center bg-navigation/60 p-4"><section role="dialog" aria-modal="true" className="card w-full max-w-2xl p-5" aria-labelledby="access-message-title"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="access-message-title" className="font-semibold">Mensagem de acesso</h2><p className="mt-1 text-sm text-text-secondary">Pronta para colar num email ou WhatsApp. Feche-a depois de enviar.</p></div><div className="flex gap-2"><button type="button" onClick={()=>void copyAccessMessage()} className="min-h-11 rounded-lg bg-primary px-4 font-semibold text-surface">Copiar mensagem</button><button type="button" onClick={()=>setAccessMessage('')} className="min-h-11 rounded-lg border border-border px-4 font-semibold">Fechar</button></div></div><textarea readOnly value={accessMessage} rows={7} className="control mt-4 w-full resize-y p-3 text-sm" aria-label="Mensagem de acesso gerada"/></section></div>}
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
      <div className="card overflow-hidden"><div className="flex items-center justify-between border-b border-border p-5"><div><h2 className="font-semibold">Utilizadores da aplicação</h2><p className="mt-1 text-sm text-text-secondary">Perfis e visibilidade são aplicados no backend.</p></div><button onClick={() => void load()} className="control grid size-10 place-items-center" aria-label="Actualizar utilizadores"><Icon name="trend" className="size-4"/></button></div>
        <div className="p-4"><AdminUsersTable rows={users} loading={loading} onConfigure={user=>void openPermissions(user as AdminUser)}/></div>
      </div>
      <form onSubmit={createUser} className="card h-fit p-5"><p className="text-xs font-semibold uppercase tracking-[0.15em] text-secondary">Administração</p><h2 className="mt-2 font-display text-xl font-semibold">Criar utilizador</h2><p className="mt-2 text-sm text-text-secondary">O nome fica visível durante a sessão; o utilizador serve apenas para entrar. No primeiro acesso, o PIN inicial terá de ser substituído.</p>
        <label className="mt-5 block text-sm font-semibold">Nome visível<input required minLength={1} maxLength={100} value={displayName} onChange={e=>setDisplayName(e.target.value)} className="control mt-1 w-full px-3" autoComplete="name" placeholder="Ex.: Carina Santos"/></label>
        <label className="mt-4 block text-sm font-semibold">Utilizador para login<input required minLength={3} maxLength={32} pattern="[a-z0-9][a-z0-9._-]{2,31}" value={username} onChange={e=>setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g,''))} className="control mt-1 w-full px-3" autoComplete="off" placeholder="Ex.: carina"/></label>
        <label className="mt-4 block text-sm font-semibold">PIN inicial de 4 algarismos<input required type="text" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,'').slice(0,4))} className="control mt-1 w-full px-3 text-center tracking-[0.3em]" autoComplete="off" aria-describedby="initial-pin-help"/></label>
        <p id="initial-pin-help" className="mt-2 text-xs text-text-secondary">O PIN fica visível neste formulário para poder comunicá-lo ao utilizador. Será substituído obrigatoriamente no primeiro acesso.</p>
        <label className="mt-4 block text-sm font-semibold">Perfil<select value={role} onChange={e=>setRole(e.target.value as Role)} className="control mt-1 w-full px-3"><option value="admin">Administrador</option><option value="manager">Gestor</option><option value="operator">Operador</option><option value="billing">Financeiro</option><option value="professional">Advogado</option><option value="viewer">Consulta</option><option value="auditor">Auditor</option></select></label><p className="mt-2 text-xs leading-5 text-text-secondary">{roleHelp[role]}</p>
        {role==='admin'?<p className="mt-4 rounded-lg bg-warning-soft p-3 text-xs text-warning">O administrador terá acesso integral a todas as Sociedades e respectivos valores.</p>:<fieldset className="mt-5"><legend className="font-semibold">Visibilidade inicial por Sociedade</legend><p className="mt-1 text-xs text-text-secondary">Defina separadamente se pode consultar a Sociedade e os respectivos valores financeiros.</p><div className="mt-3 divide-y divide-border rounded-lg border border-border">{newAccess.map((item,index)=><div key={item.billingEntityId} className="p-3"><span className="block text-sm font-medium">{item.name}</span><div className="mt-2 flex flex-wrap gap-4"><label className="flex min-h-10 items-center gap-2 text-xs"><input type="checkbox" checked={item.visible} onChange={e=>setNewAccess(values=>values.map((value,i)=>i===index?{...value,visible:e.target.checked,financial:e.target.checked?value.financial:false}:value))}/> Ver Sociedade</label><label className="flex min-h-10 items-center gap-2 text-xs"><input type="checkbox" checked={item.financial} disabled={!item.visible} onChange={e=>setNewAccess(values=>values.map((value,i)=>i===index?{...value,financial:e.target.checked}:value))}/> Ver valores financeiros</label></div></div>)}</div></fieldset>}
        <button type="button" disabled={!username||pin.length!==4} onClick={()=>void copyCredentials(username,pin)} className="mt-5 min-h-11 w-full rounded-lg border border-primary px-4 font-semibold text-primary disabled:opacity-40">Copiar dados de acesso</button>
        <button disabled={sending||!firmId||!displayName.trim()||pin.length!==4} className="mt-3 min-h-11 w-full rounded-lg bg-primary px-4 font-semibold text-surface disabled:opacity-50">{sending?'A criar…':'Criar utilizador'}</button>
      </form>
    </section>
    {editing && <div className="app-safe-fixed fixed z-[75] grid place-items-center bg-primary/45 p-4"><form onSubmit={saveAccess} role="dialog" aria-modal="true" aria-labelledby="permissions-title" className="card max-h-[min(48rem,calc(100dvh-2rem))] w-full max-w-2xl overflow-y-auto p-6"><div className="flex justify-between gap-4"><div><h2 id="permissions-title" className="font-display text-2xl font-semibold">Acesso de {editing.displayName || editing.username || 'utilizador'}</h2><p className="mt-1 text-sm text-text-secondary">A visibilidade e os valores financeiros são independentes por sociedade.</p></div><button type="button" onClick={()=>setEditing(null)} className="min-h-11 min-w-11 text-xl" aria-label="Fechar">×</button></div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold">Nome visível<input required maxLength={100} value={editDisplayName} onChange={e=>setEditDisplayName(e.target.value)} className="control mt-1 w-full px-3"/></label><label className="text-sm font-semibold">Utilizador para login<input required disabled={editing.role==='owner'&&editing.userId!==currentUser?.id} value={editUsername} onChange={e=>setEditUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g,''))} className="control mt-1 w-full px-3 disabled:opacity-60"/>{editing.role==='owner'&&editing.userId!==currentUser?.id&&<span className="mt-1 block text-xs font-normal text-text-secondary">Um Administrador pode corrigir o nome visível, mas não pode alterar o login do Proprietário.</span>}</label><label className="text-sm font-semibold">Reset do PIN <span className="font-normal text-text-secondary">(opcional)</span><input type="text" inputMode="numeric" autoComplete="off" pattern="[0-9]{4}" maxLength={4} value={editPin} onChange={e=>setEditPin(e.target.value.replace(/\D/g,'').slice(0,4))} className="control mt-1 w-full px-3 text-center tracking-[0.3em]"/></label></div>
      {editing.role !== 'owner' && <div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold">Perfil<select value={editRole} onChange={e=>setEditRole(e.target.value as Role)} className="control mt-1 w-full px-3"><option value="admin">Administrador</option><option value="manager">Gestor</option><option value="operator">Operador</option><option value="billing">Financeiro</option><option value="professional">Advogado</option><option value="viewer">Consulta</option><option value="auditor">Auditor</option></select></label><label className="flex min-h-11 items-center gap-3 self-end rounded-lg border border-border px-3 text-sm font-semibold"><input type="checkbox" checked={editActive} onChange={e=>setEditActive(e.target.checked)}/>{editActive?'Acesso activo':'Acesso suspenso'}</label></div>}
      {editPin && <p className="mt-2 text-xs text-warning">O utilizador terá de substituir este PIN no próximo login.</p>}
      <fieldset className="mt-6"><legend className="font-semibold">Permissões por Sociedade</legend><p className="mt-1 text-sm text-text-secondary">Defina separadamente a visibilidade da Sociedade e o acesso aos respectivos valores financeiros.</p>{(editing.role==='owner'||editRole==='admin')&&<p className="mt-3 rounded-lg bg-warning-soft p-3 text-sm text-warning">{editing.role==='owner'?'O proprietário tem acesso integral e não pode ser suspenso nem perder permissões.':'O perfil Administrador tem acesso integral a todas as Sociedades e valores financeiros.'}</p>}<div className="mt-3 divide-y divide-border rounded-lg border border-border">{access.length===0?<p className="p-3 text-sm text-text-secondary">Não existem Sociedades activas para configurar.</p>:access.map((item,index)=>{const integral=editing.role==='owner'||editRole==='admin';return <div key={item.billingEntityId} className="grid gap-3 p-3 sm:grid-cols-[1fr_auto_auto] sm:items-center"><span className="font-medium">{item.name}</span><label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={integral||item.visible} disabled={integral} onChange={e=>setAccess(values=>values.map((value,i)=>i===index?{...value,visible:e.target.checked,financial:e.target.checked?value.financial:false}:value))}/> Ver Sociedade</label><label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={integral||item.financial} disabled={integral||!item.visible} onChange={e=>setAccess(values=>values.map((value,i)=>i===index?{...value,financial:e.target.checked}:value))}/> Ver valores financeiros</label></div>})}</div></fieldset>
      <p className="mt-4 text-xs text-text-secondary">Pode copiar sempre o link e o utilizador. Para incluir um PIN válido, atribua acima um novo PIN temporário; o PIN actual não pode ser consultado.</p>
      <div className="mt-4 flex flex-wrap justify-end gap-3"><button type="button" disabled={!editUsername||Boolean(editPin&&editPin.length!==4)} onClick={()=>void copyCredentials(editUsername,editPin||undefined)} className="min-h-11 rounded-lg border border-primary px-4 font-semibold text-primary disabled:opacity-40">{editPin.length===4?'Copiar dados com novo PIN':'Copiar link e utilizador'}</button><button type="button" onClick={()=>setEditing(null)} className="min-h-11 rounded-lg border border-border px-4 font-semibold">Cancelar</button><button disabled={sending||!editDisplayName.trim()||Boolean(editPin&&editPin.length!==4)} className="min-h-11 rounded-lg bg-primary px-4 font-semibold text-surface disabled:opacity-50">{sending?'A guardar…':'Guardar permissões'}</button></div>
    </form></div>}
  </div>
}
