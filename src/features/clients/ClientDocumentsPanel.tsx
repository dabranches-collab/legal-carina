import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { StandardDataTable, type TableColumn } from '../../components/table/StandardDataTable'
import { validateClientDocument } from './documentValidation'

type ClientDocument = {
  id:string; category:string; title:string; description:string|null; original_filename:string
  storage_path:string; mime_type:string; size_bytes:number; document_date:string|null
  expires_at:string|null; status:'active'|'archived'|'removed'; created_at:string
}

const categories = [
  ['commercial_registry','Certidão de registo comercial'], ['identification','Documento de identificação'],
  ['tax','Documento fiscal'], ['address','Comprovativo de morada'], ['power_of_attorney','Procuração'],
  ['contract','Contrato'], ['correspondence','Correspondência'], ['court','Documento judicial'],
  ['invoice','Documento de facturação'], ['other','Outro'],
] as const
const maxSize = 20 * 1024 * 1024
const categoryLabel = (value:string) => categories.find(([key])=>key===value)?.[1] ?? 'Outro'
const validity=(expiresAt:string|null)=>{
  if(!expiresAt)return {label:'Sem validade',tone:'text-text-secondary'}
  const today=new Date();today.setHours(0,0,0,0)
  const expiry=new Date(`${expiresAt}T00:00:00`),days=Math.ceil((expiry.getTime()-today.getTime())/86400000)
  if(days<0)return {label:'Expirado',tone:'text-danger'}
  if(days<=30)return {label:`Expira em ${days} ${days===1?'dia':'dias'}`,tone:'text-warning-strong'}
  return {label:'Válido',tone:'text-success'}
}
export function ClientDocumentsPanel({firmId,clientId,readOnly=false}:{firmId:string;clientId:string;readOnly?:boolean}) {
  const [documents,setDocuments]=useState<ClientDocument[]>([])
  const [category,setCategory]=useState('commercial_registry'),[title,setTitle]=useState(''),[description,setDescription]=useState('')
  const [documentDate,setDocumentDate]=useState(''),[expiresAt,setExpiresAt]=useState(''),[files,setFiles]=useState<File[]>([])
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('')
  const [showRemoved,setShowRemoved]=useState(false)

  const load=useCallback(async()=>{
    if(!supabase)return
    setLoading(true);setError('')
    const baseQuery=supabase.from('client_documents').select('id,category,title,description,original_filename,storage_path,mime_type,size_bytes,document_date,expires_at,status,created_at').eq('firm_id',firmId).eq('client_id',clientId)
    const {data,error:errorResult}=await (showRemoved?baseQuery.eq('status','removed'):baseQuery.neq('status','removed')).order('created_at',{ascending:false})
    if(errorResult)setError(errorResult.message.includes('client_documents')?'O módulo documental ficará disponível após a próxima actualização da base de dados.':errorResult.message)
    else setDocuments((data??[]) as ClientDocument[])
    setLoading(false)
  },[firmId,clientId,showRemoved])

  useEffect(()=>{void load()},[load])

  async function upload(){
    if(!supabase||files.length===0)return
    setError('');setNotice('')
    setBusy(true)
    const failures:string[]=[],uploaded:string[]=[]
    for(const file of files){
      if(file.size<=0||file.size>maxSize){failures.push(`${file.name}: deve ter no máximo 20 MB.`);continue}
      const fileBytes=new Uint8Array(await file.arrayBuffer()),canonicalMime=validateClientDocument(file.name,fileBytes)
      if(!canonicalMime){failures.push(`${file.name}: formato inválido, conteúdo activo ou macros.`);continue}
      const fallbackTitle=file.name.replace(/\.[^.]+$/,'').replace(/[_-]+/g,' ').trim()
      const body=new FormData();body.set('file',file);body.set('firmId',firmId);body.set('clientId',clientId);body.set('category',category);body.set('title',title.trim()||(fallbackTitle||'Documento'));body.set('description',description.trim());body.set('documentDate',documentDate);body.set('expiresAt',expiresAt)
      const {data,error:uploadError}=await supabase.functions.invoke('client-documents',{body})
      if(uploadError||data?.error){
        const technicalMessage=data?.error??uploadError?.message??''
        const unavailable=/failed to send|edge function|not found|non-2xx/i.test(technicalMessage)
        failures.push(`${file.name}: ${unavailable?'o serviço documental ainda não está disponível nesta versão publicada.':technicalMessage||'não foi possível arquivar.'}`)
      }
      else uploaded.push(file.name)
    }
    if(uploaded.length){setTitle('');setDescription('');setDocumentDate('');setExpiresAt('');setFiles([]);setNotice(uploaded.length===1?'1 documento carregado e protegido no arquivo privado.':`${uploaded.length} documentos carregados e protegidos no arquivo privado.`);await load()}
    if(failures.length)setError(failures.join(' '))
    setBusy(false)
  }

  async function openDocument(document:ClientDocument){
    if(!supabase)return
    setError('')
    const {data,error:linkError}=await supabase.storage.from('client-documents').createSignedUrl(document.storage_path,60,{download:false})
    if(linkError||!data){setError(linkError?.message??'Não foi possível criar o acesso temporário.');return}
    window.open(data.signedUrl,'_blank','noopener,noreferrer')
  }
  async function changeDocument(document:ClientDocument,action:'archive'|'activate'|'remove'){
    const label=action==='remove'?'retirar do arquivo visível (poderá ser recuperado por um administrador)':action==='archive'?'arquivar':'reactivar'
    if(!window.confirm(`Pretende ${label} “${document.title}”?`))return
    setBusy(true);setError('');setNotice('')
    const {data,error:actionError}=await supabase!.functions.invoke('client-documents',{body:{action,documentId:document.id}})
    if(actionError||data?.error)setError(data?.error??'Não foi possível alterar o documento.')
    else{setNotice(action==='remove'?'Documento removido do arquivo visível e mantido para recuperação.':action==='archive'?'Documento arquivado.':'Documento reactivado.');await load()}
    setBusy(false)
  }
  const columns:TableColumn<ClientDocument>[]=[
    {id:'title',label:'Documento',essential:true,sticky:true,value:item=>`${item.title} ${item.original_filename}`,render:item=><><span className="block font-semibold">{item.title}</span><span className="text-xs text-text-secondary">{item.original_filename}</span></>},
    {id:'category',label:'Tipo',value:item=>categoryLabel(item.category)},
    {id:'date',label:'Data',kind:'date',value:item=>item.document_date,render:item=>item.document_date?new Date(`${item.document_date}T00:00:00`).toLocaleDateString('pt-PT'):'—'},
    {id:'expiry',label:'Validade',kind:'date',value:item=>item.expires_at,render:item=>{const state=validity(item.expires_at);return <span className={`font-semibold ${state.tone}`}>{item.expires_at?`${new Date(`${item.expires_at}T00:00:00`).toLocaleDateString('pt-PT')} · `:''}{state.label}</span>}},
    {id:'size',label:'Tamanho (MB)',kind:'number',align:'right',value:item=>item.size_bytes/1024/1024,render:item=>(item.size_bytes/1024/1024).toLocaleString('pt-PT',{maximumFractionDigits:2})},
    {id:'status',label:'Estado',value:item=>item.status,render:item=>item.status==='active'?'Activo':item.status==='archived'?'Arquivado':'Removido'},
    {id:'action',label:'Acções',sortable:false,searchable:false,exportable:false,value:()=>null,render:item=><div className="flex flex-wrap gap-2"><button type="button" onClick={()=>void openDocument(item)} className="rounded-lg border border-border px-3 py-2 font-semibold text-primary">Consultar</button>{!readOnly&&<><button disabled={busy} type="button" onClick={()=>void changeDocument(item,item.status==='active'?'archive':'activate')} className="rounded-lg border border-border px-3 py-2 font-semibold text-primary">{item.status==='active'?'Arquivar':'Reactivar'}</button>{item.status!=='removed'&&<button disabled={busy} type="button" onClick={()=>void changeDocument(item,'remove')} className="rounded-lg border border-danger/40 px-3 py-2 font-semibold text-danger">Remover</button>}</>}</div>},
  ]

  if(readOnly&&!loading&&!error&&documents.length===0)return <section className="mt-4 rounded-lg border border-border bg-surface-subtle px-4 py-3"><h3 className="font-display font-semibold">Documentos do cliente</h3><p className="mt-1 text-sm text-text-secondary">Sem documentos arquivados.</p></section>

  return <section className="mt-6 border-t border-border pt-5" aria-labelledby="client-documents-title"><h3 id="client-documents-title" className="font-display text-xl font-semibold">Documentos do cliente</h3><p className="mt-1 text-sm text-text-secondary">Arquivo privado. Cada consulta utiliza uma ligação temporária válida durante 60 segundos.</p>
    {error&&<p role="alert" className="mt-3 rounded-lg bg-danger-soft p-3 text-sm text-danger">{error}</p>}{notice&&<p role="status" className="mt-3 rounded-lg bg-success-soft p-3 text-sm text-success">{notice}</p>}
    {!readOnly&&<div className="mt-4 grid gap-3 rounded-xl border border-border bg-surface-subtle p-4 sm:grid-cols-2"><label className="text-sm font-semibold">Tipo<select value={category} onChange={e=>setCategory(e.target.value)} className="control mt-1 w-full px-3">{categories.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><label className="text-sm font-semibold">Título opcional<input maxLength={160} value={title} onChange={e=>setTitle(e.target.value)} className="control mt-1 w-full px-3" placeholder="Se ficar vazio, utiliza o nome do ficheiro"/></label><label className="text-sm font-semibold sm:col-span-2">Descrição opcional<textarea maxLength={1000} value={description} onChange={e=>setDescription(e.target.value)} className="control mt-1 min-h-20 w-full p-3"/></label><label className="text-sm font-semibold">Data do documento<input type="date" value={documentDate} onChange={e=>setDocumentDate(e.target.value)} className="control mt-1 w-full px-3"/></label><label className="text-sm font-semibold">Validade opcional<input type="date" value={expiresAt} onChange={e=>setExpiresAt(e.target.value)} className="control mt-1 w-full px-3"/></label><label className="text-sm font-semibold sm:col-span-2">Ficheiros<input multiple type="file" accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx" onChange={e=>setFiles(Array.from(e.target.files??[]))} className="control mt-1 w-full p-2"/><span className="mt-1 block text-xs font-normal text-text-secondary">Pode seleccionar vários · PDF, JPG, PNG, DOCX ou XLSX · máximo 20 MB por ficheiro · sem macros.</span>{files.length>0&&<span role="status" className="mt-1 block text-xs font-semibold text-primary">{files.length} {files.length===1?'ficheiro seleccionado':'ficheiros seleccionados'}</span>}</label><button type="button" onClick={()=>void upload()} disabled={busy||files.length===0} className="min-h-11 rounded-lg bg-primary px-4 font-semibold text-surface disabled:opacity-50 sm:col-span-2">{busy?`A proteger e carregar ${files.length}…`:files.length>1?`Carregar ${files.length} documentos`:'Carregar documento'}</button></div>}
    {!readOnly&&<div className="mt-4 flex justify-end"><button type="button" aria-pressed={showRemoved} onClick={()=>setShowRemoved(value=>!value)} className={`min-h-10 rounded-lg border px-3 text-sm font-semibold ${showRemoved?'border-warning bg-warning-soft text-warning-strong':'border-border text-primary'}`}>{showRemoved?'Voltar ao arquivo':'Ver removidos'}</button></div>}
    <div className="mt-3"><StandardDataTable id="client-documents" label={showRemoved?'Documentos removidos':'Documentos do cliente'} rows={documents} columns={columns} rowKey={item=>item.id} onRowDoubleClick={item=>void openDocument(item)} loading={loading} error={error||undefined} onRetry={()=>void load()} defaultPageSize={10} emptyMessage={showRemoved?'Não existem documentos removidos.':'Este cliente ainda não tem documentos arquivados.'}/></div>
  </section>
}
