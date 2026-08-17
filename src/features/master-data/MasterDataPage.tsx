import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { StandardDataTable, type TableColumn } from '../../components/table/StandardDataTable'
import { supabase } from '../../lib/supabase'
import { ClientDocumentsPanel } from '../clients/ClientDocumentsPanel'

type Section='clients'|'billing_entities'|'professionals'
type Row={id:string;firm_id:string;display_name?:string;name?:string;client_code?:string;client_type?:'individual'|'company';active:boolean}
type Profile={id?:string;client_type:'individual'|'company';client_code:string;active:boolean}
type ClientDetails={legal_name:string;tax_number:string;email:string;phone:string;address:string;notes:string}
type Identifier={id?:string;identifier_type:'citizen_card'|'passport'|'residence_permit'|'company_registration'|'tax'|'other';identifier_number:string;issuing_country:string;issuing_authority:string;issued_on:string;expires_on:string;notes:string}
const sections:{id:Section;label:string}[]=[{id:'clients',label:'Clientes'},{id:'billing_entities',label:'Sociedades'},{id:'professionals',label:'Responsáveis'}]
const emptyProfiles=():Profile[]=>[{client_type:'individual',client_code:'',active:true},{client_type:'company',client_code:'',active:false}]
const emptyDetails=():ClientDetails=>({legal_name:'',tax_number:'',email:'',phone:'',address:'',notes:''})
const emptyIdentifier=():Identifier=>({identifier_type:'citizen_card',identifier_number:'',issuing_country:'',issuing_authority:'',issued_on:'',expires_on:'',notes:''})
const identifierLabels:Record<Identifier['identifier_type'],string>={citizen_card:'Cartão de Cidadão / BI',passport:'Passaporte',residence_permit:'Título de residência',company_registration:'Registo comercial',tax:'Identificação fiscal',other:'Outro'}

export function MasterDataPage({initialSection='clients'}:{initialSection?:Section}){
  const [section,setSection]=useState<Section>(initialSection),[rows,setRows]=useState<Row[]>([]),[firmId,setFirmId]=useState('')
  const [loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState('')
  const [editing,setEditing]=useState<Row|null>(null),[creating,setCreating]=useState(false),[editName,setEditName]=useState('')
  const [editActive,setEditActive]=useState(true),[profiles,setProfiles]=useState<Profile[]>(emptyProfiles),[saving,setSaving]=useState(false)
  const [mode,setMode]=useState<'view'|'edit'>('view'),[details,setDetails]=useState<ClientDetails>(emptyDetails),[identifiers,setIdentifiers]=useState<Identifier[]>([])
  const [identifiersAvailable,setIdentifiersAvailable]=useState(true)
  useEffect(()=>setSection(initialSection),[initialSection])
  const load=useCallback(async()=>{
    if(!supabase)return
    setLoading(true);setError('')
    let targetFirm=firmId
    if(!targetFirm){const{data}=await supabase.from('firm_members').select('firm_id').eq('active',true).limit(1).maybeSingle();targetFirm=data?.firm_id??'';setFirmId(targetFirm)}
    const fields=section==='billing_entities'?'id,firm_id,name,active':section==='clients'?'id,firm_id,display_name,client_code,client_type,active':'id,firm_id,display_name,active'
    const{data,error:failure}=await supabase.from(section).select(fields).order(section==='billing_entities'?'name':'display_name')
    if(failure)setError(failure.message);else setRows((data??[]) as unknown as Row[])
    setLoading(false)
  },[firmId,section])
  useEffect(()=>{void load()},[load])
  async function openEditor(row:Row){
    setCreating(false);setEditing(row);setMode('view');setEditName(row.display_name??row.name??'');setEditActive(row.active);setError('');setDetails(emptyDetails());setIdentifiers([]);setIdentifiersAvailable(true)
    if(section!=='clients'){setProfiles([]);return}
    const [clientResult,profileResult,identifierResult]=await Promise.all([
      supabase!.from('clients').select('legal_name,tax_number,email,phone,address,notes').eq('id',row.id).single(),
      supabase!.from('client_profiles').select('id,client_type,client_code,active').eq('client_id',row.id),
      supabase!.from('client_identifiers').select('id,identifier_type,identifier_number,issuing_country,issuing_authority,issued_on,expires_on,notes').eq('client_id',row.id).order('created_at'),
    ])
    if(clientResult.data)setDetails(Object.fromEntries(Object.keys(emptyDetails()).map(key=>[key,(clientResult.data as Record<string,string|null>)[key]??''])) as ClientDetails)
    if(identifierResult.error){setIdentifiersAvailable(false)}else setIdentifiers((identifierResult.data??[]).map(item=>({...item,issuing_country:item.issuing_country??'',issuing_authority:item.issuing_authority??'',issued_on:item.issued_on??'',expires_on:item.expires_on??'',notes:item.notes??''})) as Identifier[])
    const found=(profileResult.data??[]) as unknown as Profile[]
    setProfiles(found.length?(['individual','company'] as const).map(type=>found.find(item=>item.client_type===type)??{client_type:type,client_code:'',active:false}):[
      {client_type:row.client_type??'individual',client_code:row.client_code??'',active:true},
      {client_type:row.client_type==='individual'?'company':'individual',client_code:'',active:false},
    ])
  }
  function openCreator(){setEditing(null);setCreating(true);setMode('edit');setEditName('');setEditActive(true);setProfiles(emptyProfiles());setDetails(emptyDetails());setIdentifiers([]);setIdentifiersAvailable(true);setError('');setNotice('')}
  function closeEditor(){setEditing(null);setCreating(false);setError('')}
  function updateProfile(type:'individual'|'company',change:Partial<Profile>){setProfiles(current=>current.map(item=>item.client_type===type?{...item,...change}:item))}
  function updateIdentifier(index:number,change:Partial<Identifier>){setIdentifiers(current=>current.map((item,itemIndex)=>itemIndex===index?{...item,...change}:item))}
  async function removeIdentifier(index:number){
    const item=identifiers[index]
    if(!item||!window.confirm('Eliminar este documento de identificação?'))return
    setError('')
    if(item.id){const {error:removeError}=await supabase!.from('client_identifiers').delete().eq('id',item.id);if(removeError){setError(removeError.message);return}}
    setIdentifiers(current=>current.filter((_,itemIndex)=>itemIndex!==index))
  }
  async function save(event:FormEvent){
    event.preventDefault();if(!supabase||(!editing&&!creating)||!firmId)return
    setSaving(true);setError('');const name=editName.trim()
    if(section==='clients'&&!profiles.some(item=>item.active)){setError('Active pelo menos uma vertente: Particular ou Empresa.');setSaving(false);return}
    if(section==='clients'&&profiles.some(item=>item.active&&!item.client_code.trim())){setError('Indique o código de cada vertente activa.');setSaving(false);return}
    let targetId=editing?.id
    if(creating){
      const primary=profiles.find(item=>item.active)!
      const result=section==='billing_entities'
        ?await supabase.from('billing_entities').insert({firm_id:firmId,name,active:editActive}).select('id').single()
        :section==='professionals'
          ?await supabase.from('professionals').insert({firm_id:firmId,display_name:name,active:editActive}).select('id').single()
          :await supabase.from('clients').insert({firm_id:firmId,display_name:name,client_code:primary.client_code.trim(),client_type:primary.client_type,active:editActive,...details}).select('id').single()
      const{data,error:createError}=result
      if(createError){setError(createError.message);setSaving(false);return}targetId=data.id
    }else{
      const field=section==='billing_entities'?'name':'display_name'
      const updatePayload=section==='clients'?{[field]:name,active:editActive,...details}:{[field]:name,active:editActive}
      const{error:updateError}=await supabase.from(section).update(updatePayload).eq('id',editing!.id)
      if(updateError){setError(updateError.message);setSaving(false);return}
    }
    if(section==='clients'&&targetId){for(const item of profiles){const payload={firm_id:firmId,client_id:targetId,client_type:item.client_type,client_code:item.client_code.trim(),active:item.active};const result=item.id?await supabase.from('client_profiles').update(payload).eq('id',item.id):await supabase.from('client_profiles').insert(payload);if(result.error){setError(result.error.message);setSaving(false);return}}}
    if(section==='clients'&&targetId&&identifiersAvailable){for(const item of identifiers.filter(value=>value.identifier_number.trim())){const payload={firm_id:firmId,client_id:targetId,identifier_type:item.identifier_type,identifier_number:item.identifier_number.trim(),issuing_country:item.issuing_country.trim()||null,issuing_authority:item.issuing_authority.trim()||null,issued_on:item.issued_on||null,expires_on:item.expires_on||null,notes:item.notes.trim()||null};const result=item.id?await supabase.from('client_identifiers').update(payload).eq('id',item.id):await supabase.from('client_identifiers').insert(payload);if(result.error){setError(result.error.message);setSaving(false);return}}}
    setNotice(`${name} ${creating?'criado':'actualizado'}.`);setSaving(false);closeEditor();await load()
  }
  const columns:TableColumn<Row>[]=[
    {id:'name',label:'Nome',essential:true,sticky:true,value:row=>row.display_name??row.name??''},
    ...(section==='clients'?[{id:'code',label:'Código',value:(row:Row)=>row.client_code??''},{id:'type',label:'Perfil actual',filterOptions:[{value:'individual',label:'Particular'},{value:'company',label:'Empresa'}],value:(row:Row)=>row.client_type??'',render:(row:Row)=>row.client_type==='individual'?'Particular':'Empresa'}] as TableColumn<Row>[]:[]),
    {id:'active',label:'Estado',kind:'boolean',value:row=>row.active,render:row=>row.active?'Activo':'Inactivo'},
    {id:'actions',label:'Acções',sortable:false,searchable:false,filterable:false,exportable:false,value:()=>null,render:row=><button type="button" onClick={()=>void openEditor(row)} className="rounded-lg border border-border px-3 py-2 font-semibold text-primary">Abrir ficha</button>},
  ]
  const profile=(type:'individual'|'company')=>profiles.find(item=>item.client_type===type)??{client_type:type,client_code:'',active:false}
  const editorOpen=Boolean(editing||creating),label=sections.find(item=>item.id===section)?.label??'Entidades'
  return <div className="space-y-5">
    {notice&&<p role="status" className="rounded-lg bg-success-soft p-3 text-sm text-success">{notice}</p>}
    <section className="card p-4"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-display text-xl font-semibold">{label}</h2><p className="mt-1 text-sm text-text-secondary">Lista central para criação, consulta e edição individual. Abra uma ficha com duplo clique.</p></div><button type="button" onClick={openCreator} className="min-h-11 rounded-lg bg-primary px-4 font-semibold text-surface">Criar {section==='clients'?'cliente':section==='billing_entities'?'Sociedade':'Responsável'}</button></div><StandardDataTable id={`master-${section}`} label={label} rows={rows} columns={columns} rowKey={row=>row.id} loading={loading} error={!editorOpen&&error?`Não foi possível carregar a lista: ${error}`:undefined} onRetry={()=>void load()} onRowDoubleClick={row=>void openEditor(row)} defaultPageSize={20}/></section>
    {editorOpen&&<div className="app-safe-fixed fixed z-[75] grid place-items-center bg-navigation/55 p-4"><form onSubmit={save} role="dialog" aria-modal="true" aria-labelledby="entity-edit-title" className="card max-h-[calc(100dvh-2rem)] w-full max-w-4xl overflow-y-auto p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.15em] text-secondary">{creating?'Nova ficha':mode==='view'?'Consulta':'Edição'}</p><h2 id="entity-edit-title" className="mt-1 font-display text-2xl font-semibold">{creating?'Criar entidade':editName}</h2></div><button type="button" onClick={closeEditor} className="min-h-11 min-w-11 text-xl" aria-label="Fechar">×</button></div>
      <fieldset disabled={mode==='view'}>
      <label className="mt-5 block text-sm font-semibold">Nome<input required maxLength={160} value={editName} onChange={event=>setEditName(event.target.value)} className="control mt-1 w-full px-3"/></label><label className="mt-4 flex min-h-11 items-center gap-3 rounded-lg border border-border px-3 text-sm font-semibold"><input type="checkbox" checked={editActive} onChange={event=>setEditActive(event.target.checked)}/>{editActive?'Entidade activa':'Entidade inactiva'}</label>
      {section==='clients'&&<><fieldset className="mt-5"><legend className="font-semibold">Vertentes do cliente</legend>{(['individual','company'] as const).map(type=>{const item=profile(type);return <div key={type} className="mt-3 grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-[auto_1fr] sm:items-end"><label className="flex min-h-11 items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={item.active} onChange={event=>updateProfile(type,{active:event.target.checked})}/>{type==='individual'?'Particular':'Empresa'}</label><label className="text-xs font-semibold">Código desta vertente<input disabled={mode==='view'||!item.active} value={item.client_code} onChange={event=>updateProfile(type,{client_code:event.target.value})} className="control mt-1 w-full px-3 text-sm"/></label></div>})}<p className="mt-2 text-xs text-text-secondary">Com as duas vertentes activas, o cliente aparece automaticamente como Misto.</p></fieldset>
      <fieldset className="mt-6"><legend className="font-semibold">Identificação e contactos</legend><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold">Denominação legal<input maxLength={200} value={details.legal_name} onChange={e=>setDetails({...details,legal_name:e.target.value})} className="control mt-1 w-full px-3"/></label><label className="text-sm font-semibold">NIF<input maxLength={40} value={details.tax_number} onChange={e=>setDetails({...details,tax_number:e.target.value})} className="control mt-1 w-full px-3"/></label><label className="text-sm font-semibold">Correio electrónico<input type="email" maxLength={200} value={details.email} onChange={e=>setDetails({...details,email:e.target.value})} className="control mt-1 w-full px-3"/></label><label className="text-sm font-semibold">Telefone<input maxLength={40} value={details.phone} onChange={e=>setDetails({...details,phone:e.target.value})} className="control mt-1 w-full px-3"/></label><label className="text-sm font-semibold sm:col-span-2">Morada<textarea maxLength={1000} value={details.address} onChange={e=>setDetails({...details,address:e.target.value})} className="control mt-1 min-h-20 w-full p-3"/></label><label className="text-sm font-semibold sm:col-span-2">Notas<textarea maxLength={2000} value={details.notes} onChange={e=>setDetails({...details,notes:e.target.value})} className="control mt-1 min-h-20 w-full p-3"/></label></div></fieldset>
      <fieldset className="mt-6"><div className="flex flex-wrap items-center justify-between gap-3"><legend className="font-semibold">Documentos de identificação</legend>{mode==='edit'&&identifiersAvailable&&<button type="button" onClick={()=>setIdentifiers(current=>[...current,emptyIdentifier()])} className="min-h-10 rounded-lg border border-border px-3 font-semibold text-primary">Adicionar identificação</button>}</div>{!identifiersAvailable?<p className="mt-2 rounded-lg bg-warning-soft p-3 text-sm text-warning">Esta área ficará disponível após a próxima actualização controlada da base de dados.</p>:identifiers.length===0?<p className="mt-2 text-sm text-text-secondary">Sem documentos de identificação registados.</p>:identifiers.map((item,index)=><div key={item.id??index} className="mt-3 grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-2"><label className="text-sm font-semibold">Tipo<select value={item.identifier_type} onChange={e=>updateIdentifier(index,{identifier_type:e.target.value as Identifier['identifier_type']})} className="control mt-1 w-full px-3">{Object.entries(identifierLabels).map(([value,text])=><option key={value} value={value}>{text}</option>)}</select></label><label className="text-sm font-semibold">Número<input required maxLength={100} value={item.identifier_number} onChange={e=>updateIdentifier(index,{identifier_number:e.target.value})} className="control mt-1 w-full px-3"/></label><label className="text-sm font-semibold">País emissor<input maxLength={100} value={item.issuing_country} onChange={e=>updateIdentifier(index,{issuing_country:e.target.value})} className="control mt-1 w-full px-3"/></label><label className="text-sm font-semibold">Entidade emissora<input maxLength={160} value={item.issuing_authority} onChange={e=>updateIdentifier(index,{issuing_authority:e.target.value})} className="control mt-1 w-full px-3"/></label><label className="text-sm font-semibold">Data de emissão<input type="date" value={item.issued_on} onChange={e=>updateIdentifier(index,{issued_on:e.target.value})} className="control mt-1 w-full px-3"/></label><label className="text-sm font-semibold">Validade<input type="date" value={item.expires_on} onChange={e=>updateIdentifier(index,{expires_on:e.target.value})} className="control mt-1 w-full px-3"/></label><label className="text-sm font-semibold sm:col-span-2">Notas do documento<input maxLength={500} value={item.notes} onChange={e=>updateIdentifier(index,{notes:e.target.value})} className="control mt-1 w-full px-3"/></label>{mode==='edit'&&<button type="button" onClick={()=>void removeIdentifier(index)} className="min-h-10 rounded-lg border border-danger/40 px-3 font-semibold text-danger sm:col-span-2 sm:justify-self-end">Eliminar identificação</button>}</div>)}</fieldset></>}
      </fieldset>
      {section==='clients'&&editing&&<ClientDocumentsPanel firmId={editing.firm_id} clientId={editing.id} readOnly={mode==='view'}/>} {error&&<p role="alert" className="mt-4 rounded-lg bg-danger-soft p-3 text-sm text-danger">{error}</p>}<div className="mt-6 flex justify-end gap-3"><button type="button" onClick={closeEditor} className="min-h-11 rounded-lg border border-border px-4 font-semibold">Fechar</button>{mode==='view'?<button type="button" onClick={()=>setMode('edit')} className="min-h-11 rounded-lg bg-primary px-4 font-semibold text-surface">Editar</button>:<button disabled={saving||!editName.trim()} className="min-h-11 rounded-lg bg-primary px-4 font-semibold text-surface disabled:opacity-50">{saving?'A guardar…':'Guardar alterações'}</button>}</div>
    </form></div>}
  </div>
}
