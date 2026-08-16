import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Icon } from '../../components/ui/Icon'
import { supabase } from '../../lib/supabase'

type Role = 'admin'|'billing'|'professional'|'viewer'|'auditor'
type AdminUser = { userId:string; username:string; role:Role|'owner'; active:boolean; invitedAt:string; lastSignInAt:string|null }
type BillingAccess = { billingEntityId:string; name:string; visible:boolean; financial:boolean }
const roleLabels:Record<AdminUser['role'],string> = { owner:'Proprietário', admin:'Administrador', billing:'Financeiro', professional:'Advogado', viewer:'Consulta', auditor:'Auditor' }
const roleHelp:Record<Role,string> = {
  admin:'Gestão integral da aplicação, utilizadores e configurações.', billing:'Faturação, recebimentos e valores das sociedades autorizadas.', professional:'Registos e processos dentro das sociedades autorizadas.', viewer:'Consulta dos dados autorizados, sem alteração.', auditor:'Consulta e auditoria dos dados autorizados, sem alteração operacional.',
}

export function AdminPage() {
  const [firmId,setFirmId] = useState('')
  const [users,setUsers] = useState<AdminUser[]>([])
  const [loading,setLoading] = useState(true)
  const [error,setError] = useState('')
  const [notice,setNotice] = useState('')
  const [username,setUsername] = useState('')
  const [pin,setPin] = useState('')
  const [confirmPin,setConfirmPin] = useState('')
  const [role,setRole] = useState<Role>('professional')
  const [sending,setSending] = useState(false)
  const [editing,setEditing] = useState<AdminUser|null>(null)
  const [access,setAccess] = useState<BillingAccess[]>([])
  const [editUsername,setEditUsername] = useState('')
  const [editPin,setEditPin] = useState('')

  const invoke = useCallback(async (body:Record<string,unknown>) => {
    if (!supabase) throw new Error('Ligação ao Supabase indisponível.')
    const { data, error: failure } = await supabase.functions.invoke('admin-users', { body })
    if (failure || data?.error) throw new Error(data?.error ?? failure?.message ?? 'Operação não concluída.')
    return data
  }, [])

  const load = useCallback(async () => {
    if (!supabase) { setError('Ligação ao Supabase indisponível.'); setLoading(false); return }
    setLoading(true); setError('')
    const { data:membership,error:membershipError } = await supabase.from('firm_members').select('firm_id,role').eq('active',true).in('role',['owner','admin']).limit(1).maybeSingle()
    if (membershipError || !membership) { setError('Permissão administrativa necessária.'); setLoading(false); return }
    setFirmId(membership.firm_id)
    try { const data = await invoke({ action:'list_users', firmId:membership.firm_id }); setUsers(data.users ?? []) } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível listar os utilizadores.') }
    setLoading(false)
  }, [invoke])

  useEffect(() => { void load() }, [load])

  async function createUser(event:FormEvent) {
    event.preventDefault(); if (!firmId || pin !== confirmPin) return
    setSending(true); setError(''); setNotice('')
    try { await invoke({ action:'create_pin_user', firmId, username, pin, role }); setNotice(`Acesso criado para ${username}.`); setUsername(''); setPin(''); setConfirmPin(''); await load() }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível criar o acesso.') }
    setSending(false)
  }

  async function openPermissions(user:AdminUser) {
    setEditing(user); setEditUsername(user.username); setEditPin(''); setError('')
    try { const data = await invoke({ action:'get_billing_permissions', firmId, userId:user.userId }); setAccess(data.billingEntities ?? []) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível carregar as permissões.') }
  }

  async function saveAccess(event:FormEvent) {
    event.preventDefault(); if (!editing) return
    setSending(true); setError('')
    try {
      if (editPin) await invoke({ action:'configure_pin_access', firmId, userId:editing.userId, username:editUsername, pin:editPin })
      if (editing.role !== 'owner' && editing.role !== 'admin') await invoke({ action:'set_billing_permissions', firmId, userId:editing.userId, permissions:access.map(({ billingEntityId,visible,financial }) => ({ billingEntityId,visible,financial })) })
      setNotice(`Acesso de ${editUsername || editing.username} atualizado.`); setEditing(null); await load()
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível guardar as permissões.') }
    setSending(false)
  }

  return <div className="space-y-5">
    <nav aria-label="Secções de administração" className="card flex gap-2 p-2"><button aria-current="page" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-surface">Utilizadores e permissões</button><button disabled className="rounded-lg px-4 py-2 text-sm text-text-secondary opacity-60">Equipas</button></nav>
    {error && <div role="alert" className="rounded-lg bg-danger-soft p-3 text-sm text-danger">{error}</div>}
    {notice && <div role="status" className="rounded-lg bg-success-soft p-3 text-sm text-success">{notice}</div>}
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
      <div className="card overflow-hidden"><div className="flex items-center justify-between border-b border-border p-5"><div><h2 className="font-semibold">Utilizadores da aplicação</h2><p className="mt-1 text-sm text-text-secondary">Perfis e visibilidade são aplicados no backend.</p></div><button onClick={() => void load()} className="control grid size-10 place-items-center" aria-label="Atualizar utilizadores"><Icon name="trend" className="size-4"/></button></div>
        {loading ? <div role="status" className="space-y-2 p-5">{Array.from({length:3},(_,i)=><div key={i} className="h-12 animate-pulse rounded bg-surface-subtle"/>)}</div> : <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-surface-subtle text-text-secondary"><tr><th className="px-5 py-3">Utilizador</th><th className="px-5 py-3">Perfil</th><th className="px-5 py-3">Estado</th><th className="px-5 py-3">Último acesso</th><th className="px-5 py-3">Ações</th></tr></thead><tbody>{users.map(user=><tr key={user.userId} className="border-t border-border"><td className="px-5 py-3 font-medium">{user.username || 'PIN por configurar'}</td><td className="px-5 py-3">{roleLabels[user.role]}</td><td className="px-5 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${user.active?'bg-success-soft text-success':'bg-surface-subtle text-text-secondary'}`}>{user.active?'Ativo':'Inativo'}</span></td><td className="px-5 py-3 text-text-secondary">{user.lastSignInAt?new Date(user.lastSignInAt).toLocaleString('pt-PT'):'Ainda não entrou'}</td><td className="px-5 py-3"><button onClick={() => void openPermissions(user)} className="rounded-lg border border-border px-3 py-2 font-semibold text-primary">Configurar</button></td></tr>)}</tbody></table></div>}
      </div>
      <form onSubmit={createUser} className="card h-fit p-5"><p className="text-xs font-semibold uppercase tracking-[0.15em] text-secondary">Administração</p><h2 className="mt-2 font-display text-xl font-semibold">Criar utilizador</h2><p className="mt-2 text-sm text-text-secondary">Defina o nome, PIN e perfil. O PIN nunca é guardado na base de dados.</p>
        <label className="mt-5 block text-sm font-semibold">Nome de utilizador<input required minLength={3} maxLength={32} pattern="[a-z0-9][a-z0-9._-]{2,31}" value={username} onChange={e=>setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g,''))} className="control mt-1 w-full px-3" autoComplete="off"/></label>
        <label className="mt-4 block text-sm font-semibold">PIN de 4 algarismos<input required type="password" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,'').slice(0,4))} className="control mt-1 w-full px-3 text-center tracking-[0.3em]" autoComplete="new-password"/></label>
        <label className="mt-4 block text-sm font-semibold">Confirmar PIN<input required type="password" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} value={confirmPin} onChange={e=>setConfirmPin(e.target.value.replace(/\D/g,'').slice(0,4))} className="control mt-1 w-full px-3 text-center tracking-[0.3em]" autoComplete="new-password"/></label>
        {pin && confirmPin && pin !== confirmPin && <p className="mt-2 text-xs text-danger">Os PIN não coincidem.</p>}
        <label className="mt-4 block text-sm font-semibold">Perfil<select value={role} onChange={e=>setRole(e.target.value as Role)} className="control mt-1 w-full px-3"><option value="admin">Administrador</option><option value="billing">Financeiro</option><option value="professional">Advogado</option><option value="viewer">Consulta</option><option value="auditor">Auditor</option></select></label><p className="mt-2 text-xs leading-5 text-text-secondary">{roleHelp[role]}</p>
        <button disabled={sending||!firmId||pin.length!==4||pin!==confirmPin} className="mt-5 min-h-11 w-full rounded-lg bg-primary px-4 font-semibold text-surface disabled:opacity-50">{sending?'A criar…':'Criar utilizador'}</button>
      </form>
    </section>
    {editing && <div className="app-safe-fixed fixed z-[75] grid place-items-center bg-primary/45 p-4"><form onSubmit={saveAccess} role="dialog" aria-modal="true" aria-labelledby="permissions-title" className="card max-h-[min(48rem,calc(100dvh-2rem))] w-full max-w-2xl overflow-y-auto p-6"><div className="flex justify-between gap-4"><div><h2 id="permissions-title" className="font-display text-2xl font-semibold">Acesso de {editing.username || 'utilizador'}</h2><p className="mt-1 text-sm text-text-secondary">A visibilidade e os valores financeiros são independentes por sociedade faturante.</p></div><button type="button" onClick={()=>setEditing(null)} className="min-h-11 min-w-11 text-xl" aria-label="Fechar">×</button></div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold">Nome de utilizador<input required value={editUsername} onChange={e=>setEditUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g,''))} className="control mt-1 w-full px-3"/></label><label className="text-sm font-semibold">Novo PIN <span className="font-normal text-text-secondary">(opcional)</span><input type="password" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} value={editPin} onChange={e=>setEditPin(e.target.value.replace(/\D/g,'').slice(0,4))} className="control mt-1 w-full px-3 text-center tracking-[0.3em]"/></label></div>
      {(editing.role==='owner'||editing.role==='admin') ? <p className="mt-5 rounded-lg bg-warning-soft p-3 text-sm text-warning">Proprietários e administradores têm acesso integral a todas as sociedades e valores.</p> : <fieldset className="mt-6"><legend className="font-semibold">Sociedades faturantes</legend><div className="mt-3 divide-y divide-border rounded-lg border border-border">{access.map((item,index)=><div key={item.billingEntityId} className="grid gap-3 p-3 sm:grid-cols-[1fr_auto_auto] sm:items-center"><span className="font-medium">{item.name}</span><label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={item.visible} onChange={e=>setAccess(values=>values.map((value,i)=>i===index?{...value,visible:e.target.checked,financial:e.target.checked?value.financial:false}:value))}/> Ver sociedade</label><label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={item.financial} disabled={!item.visible} onChange={e=>setAccess(values=>values.map((value,i)=>i===index?{...value,financial:e.target.checked}:value))}/> Ver valores</label></div>)}</div></fieldset>}
      <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={()=>setEditing(null)} className="min-h-11 rounded-lg border border-border px-4 font-semibold">Cancelar</button><button disabled={sending||Boolean(editPin&&editPin.length!==4)} className="min-h-11 rounded-lg bg-primary px-4 font-semibold text-surface disabled:opacity-50">{sending?'A guardar…':'Guardar permissões'}</button></div>
    </form></div>}
  </div>
}
