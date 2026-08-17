import { useCallback, useEffect, useState, type FormEvent } from 'react'
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
export function ClientDocumentsPanel({firmId,clientId,readOnly=false}:{firmId:string;clientId:string;readOnly?:boolean}) {
  const [documents,setDocuments]=useState<ClientDocument[]>([])
  const [category,setCategory]=useState('commercial_registry'),[title,setTitle]=useState(''),[description,setDescription]=useState('')
  const [documentDate,setDocumentDate]=useState(''),[expiresAt,setExpiresAt]=useState(''),[file,setFile]=useState<File|null>(null)
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('')

  const load=useCallback(async()=>{
    if(!supabase)return
    setLoading(true);setError('')
    const {data,error:errorResult}=await supabase.from('client_documents').select('id,category,title,description,original_filename,storage_path,mime_type,size_bytes,document_date,expires_at,status,created_at').eq('firm_id',firmId).eq('client_id',clientId).neq('status','removed').order('created_at',{ascending:false})
    if(errorResult)setError(errorResult.message.includes('client_documents')?'O módulo documental ficará disponível após a próxima actualização da base de dados.':errorResult.message)
    else setDocuments((data??[]) as ClientDocument[])
    setLoading(false)
  },[firmId,clientId])

  useEffect(()=>{void load()},[load])

  async function upload(event:FormEvent){
    event.preventDefault();if(!supabase||!file||!title.trim())return
    setError('');setNotice('')
    if(file.size<=0||file.size>maxSize){setError('O documento deve ter no máximo 20 MB.');return}
    setBusy(true)
    const fileBytes=new Uint8Array(await file.arrayBuffer()),canonicalMime=validateClientDocument(file.name,fileBytes)
    if(!canonicalMime){setError('O conteúdo não corresponde a um PDF, JPG, PNG, DOCX ou XLSX válido, ou contém macros.');setBusy(false);return}
    const body=new FormData();body.set('file',file);body.set('firmId',firmId);body.set('clientId',clientId);body.set('category',category);body.set('title',title.trim());body.set('description',description.trim());body.set('documentDate',documentDate);body.set('expiresAt',expiresAt)
    const {data,error:uploadError}=await supabase.functions.invoke('client-documents',{body})
    if(uploadError||data?.error){setError(data?.error??'Não foi possível arquivar o documento.');setBusy(false);return}
    setTitle('');setDescription('');setDocumentDate('');setExpiresAt('');setFile(null);setNotice('Documento carregado e protegido no arquivo privado.');setBusy(false);await load()
  }

  async function openDocument(document:ClientDocument){
    if(!supabase)return
    setError('')
    const {data,error:linkError}=await supabase.storage.from('client-documents').createSignedUrl(document.storage_path,60,{download:false})
    if(linkError||!data){setError(linkError?.message??'Não foi possível criar o acesso temporário.');return}
    window.open(data.signedUrl,'_blank','noopener,noreferrer')
  }
  async function changeDocument(document:ClientDocument,action:'archive'|'activate'|'remove'){
    const label=action==='remove'?'eliminar definitivamente':action==='archive'?'arquivar':'reactivar'
    if(!window.confirm(`Pretende ${label} “${document.title}”?`))return
    setBusy(true);setError('');setNotice('')
    const {data,error:actionError}=await supabase!.functions.invoke('client-documents',{body:{action,documentId:document.id}})
    if(actionError||data?.error)setError(data?.error??'Não foi possível alterar o documento.')
    else{setNotice(action==='remove'?'Documento eliminado.':action==='archive'?'Documento arquivado.':'Documento reactivado.');await load()}
    setBusy(false)
  }
  const columns:TableColumn<ClientDocument>[]=[
    {id:'title',label:'Documento',essential:true,sticky:true,value:item=>`${item.title} ${item.original_filename}`,render:item=><><span className="block font-semibold">{item.title}</span><span className="text-xs text-text-secondary">{item.original_filename}</span></>},
    {id:'category',label:'Tipo',value:item=>categoryLabel(item.category)},
    {id:'date',label:'Data',kind:'date',value:item=>item.document_date,render:item=>item.document_date?new Date(`${item.document_date}T00:00:00`).toLocaleDateString('pt-PT'):'—'},
    {id:'size',label:'Tamanho (MB)',kind:'number',align:'right',value:item=>item.size_bytes/1024/1024,render:item=>(item.size_bytes/1024/1024).toLocaleString('pt-PT',{maximumFractionDigits:2})},
    {id:'status',label:'Estado',value:item=>item.status,render:item=>item.status==='active'?'Activo':'Arquivado'},
    {id:'action',label:'Acções',sortable:false,searchable:false,exportable:false,value:()=>null,render:item=><div className="flex flex-wrap gap-2"><button type="button" onClick={()=>void openDocument(item)} className="rounded-lg border border-border px-3 py-2 font-semibold text-primary">Consultar</button>{!readOnly&&<><button disabled={busy} type="button" onClick={()=>void changeDocument(item,item.status==='active'?'archive':'activate')} className="rounded-lg border border-border px-3 py-2 font-semibold text-primary">{item.status==='active'?'Arquivar':'Reactivar'}</button><button disabled={busy} type="button" onClick={()=>void changeDocument(item,'remove')} className="rounded-lg border border-danger/40 px-3 py-2 font-semibold text-danger">Eliminar</button></>}</div>},
  ]

  return <section className="mt-6 border-t border-border pt-5" aria-labelledby="client-documents-title"><h3 id="client-documents-title" className="font-display text-xl font-semibold">Documentos do cliente</h3><p className="mt-1 text-sm text-text-secondary">Arquivo privado. Cada consulta utiliza uma ligação temporária válida durante 60 segundos.</p>
    {error&&<p role="alert" className="mt-3 rounded-lg bg-danger-soft p-3 text-sm text-danger">{error}</p>}{notice&&<p role="status" className="mt-3 rounded-lg bg-success-soft p-3 text-sm text-success">{notice}</p>}
    {!readOnly&&<form onSubmit={upload} className="mt-4 grid gap-3 rounded-xl border border-border bg-surface-subtle p-4 sm:grid-cols-2"><label className="text-sm font-semibold">Tipo<select value={category} onChange={e=>setCategory(e.target.value)} className="control mt-1 w-full px-3">{categories.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><label className="text-sm font-semibold">Título<input required maxLength={160} value={title} onChange={e=>setTitle(e.target.value)} className="control mt-1 w-full px-3" placeholder="Ex.: Certidão permanente 2026"/></label><label className="text-sm font-semibold sm:col-span-2">Descrição opcional<textarea maxLength={1000} value={description} onChange={e=>setDescription(e.target.value)} className="control mt-1 min-h-20 w-full p-3"/></label><label className="text-sm font-semibold">Data do documento<input type="date" value={documentDate} onChange={e=>setDocumentDate(e.target.value)} className="control mt-1 w-full px-3"/></label><label className="text-sm font-semibold">Validade opcional<input type="date" value={expiresAt} onChange={e=>setExpiresAt(e.target.value)} className="control mt-1 w-full px-3"/></label><label className="text-sm font-semibold sm:col-span-2">Ficheiro<input required type="file" accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx" onChange={e=>setFile(e.target.files?.[0]??null)} className="control mt-1 w-full p-2"/><span className="mt-1 block text-xs font-normal text-text-secondary">PDF, JPG, PNG, DOCX ou XLSX · máximo 20 MB · sem macros.</span></label><button disabled={busy||!file||!title.trim()} className="min-h-11 rounded-lg bg-primary px-4 font-semibold text-surface disabled:opacity-50 sm:col-span-2">{busy?'A proteger e carregar…':'Carregar documento'}</button></form>}
    <div className="mt-4"><StandardDataTable id="client-documents" label="Documentos do cliente" rows={documents} columns={columns} rowKey={item=>item.id} loading={loading} error={error||undefined} onRetry={()=>void load()} defaultPageSize={10} emptyMessage="Este cliente ainda não tem documentos arquivados."/></div>
  </section>
}
