import { createClient } from 'npm:@supabase/supabase-js@2.112.1'
import { corsHeaders, isAllowedOrigin, json } from '../_shared/http.ts'

const maximumSize = 20 * 1024 * 1024
const categories = new Set(['commercial_registry','identification','tax','address','power_of_attorney','contract','correspondence','court','invoice','other'])
const mimeByExtension:Record<string,string> = { pdf:'application/pdf',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function safeName(value:string) {
  return value.normalize('NFKC').replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(-120) || 'documento'
}
async function hash(bytes:Uint8Array) {
  const digest=await crypto.subtle.digest('SHA-256',bytes)
  return Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('')
}
function validContent(extension:string,bytes:Uint8Array) {
  if(extension==='pdf')return bytes[0]===0x25&&bytes[1]===0x50&&bytes[2]===0x44&&bytes[3]===0x46
  if(extension==='jpg'||extension==='jpeg')return bytes[0]===0xff&&bytes[1]===0xd8&&bytes.at(-2)===0xff&&bytes.at(-1)===0xd9
  if(extension==='png')return [0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a].every((value,index)=>bytes[index]===value)
  if(extension==='docx'||extension==='xlsx'){
    if(bytes[0]!==0x50||bytes[1]!==0x4b)return false
    const directory=new TextDecoder('latin1').decode(bytes)
    return directory.includes('[Content_Types].xml')&&(extension==='docx'?directory.includes('word/'):directory.includes('xl/'))&&!/(vbaProject|externalLinks|embeddings)/i.test(directory)
  }
  return false
}

Deno.serve(async(request)=>{
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:corsHeaders(request)})
  if(request.method!=='POST')return json(request,{error:'Método não permitido.'},405)
  if(!isAllowedOrigin(request))return json(request,{error:'Origem não autorizada.'},403)
  const url=Deno.env.get('SUPABASE_URL'),serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),authorization=request.headers.get('authorization')
  if(!url||!serviceKey)return json(request,{error:'Arquivo documental não configurado.'},503)
  if(!authorization?.startsWith('Bearer '))return json(request,{error:'Autenticação necessária.'},401)
  const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}})
  const token=authorization.slice(7),{data:authData,error:authError}=await admin.auth.getUser(token)
  if(authError||!authData.user)return json(request,{error:'Sessão inválida.'},401)
  const userClient=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')??serviceKey,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}})
  try{
    const contentType=request.headers.get('content-type')??''
    if(contentType.includes('application/json')){
      const input=await request.json(),action=String(input.action??''),documentId=String(input.documentId??'')
      if(!uuidPattern.test(documentId)||!['archive','activate','remove'].includes(action))return json(request,{error:'Operação documental inválida.'},400)
      const {data:allowed}=await userClient.rpc('can_manage_client_document_record',{target_document_id:documentId})
      if(!allowed)return json(request,{error:'Sem permissão para alterar este documento.'},403)
      const {data:document,error:documentError}=await admin.from('client_documents').select('id,storage_path').eq('id',documentId).single()
      if(documentError||!document)return json(request,{error:'Documento não encontrado.'},404)
      if(action==='remove'){
        const {error:storageError}=await admin.storage.from('client-documents').remove([document.storage_path]);if(storageError)throw storageError
        const {error:removeError}=await admin.from('client_documents').delete().eq('id',documentId);if(removeError)throw removeError
      }else{
        const {error:updateError}=await admin.from('client_documents').update({status:action==='archive'?'archived':'active'}).eq('id',documentId);if(updateError)throw updateError
      }
      return json(request,{updated:true})
    }
    const form=await request.formData(),file=form.get('file')
    const firmId=String(form.get('firmId')??''),clientId=String(form.get('clientId')??''),category=String(form.get('category')??''),title=String(form.get('title')??'').normalize('NFKC').trim()
    if(!(file instanceof File)||!uuidPattern.test(firmId)||!uuidPattern.test(clientId)||!categories.has(category)||!title||title.length>160||file.size<=0||file.size>maximumSize)return json(request,{error:'Dados do documento inválidos.'},400)
    const extension=file.name.split('.').at(-1)?.toLowerCase()??'',canonicalMime=mimeByExtension[extension],bytes=new Uint8Array(await file.arrayBuffer())
    if(!canonicalMime||!validContent(extension,bytes))return json(request,{error:'O conteúdo do ficheiro não corresponde a um formato permitido ou contém conteúdo activo.'},400)
    const {data:allowed}=await userClient.rpc('can_manage_client_document',{target_firm_id:firmId,target_client_id:clientId})
    if(!allowed)return json(request,{error:'Sem permissão para arquivar documentos deste cliente.'},403)
    const documentId=crypto.randomUUID(),path=`${firmId}/${clientId}/${documentId}/${safeName(file.name)}`
    const {error:uploadError}=await admin.storage.from('client-documents').upload(path,bytes,{contentType:canonicalMime,upsert:false});if(uploadError)throw uploadError
    const record={id:documentId,firm_id:firmId,client_id:clientId,category,title,description:String(form.get('description')??'').trim()||null,original_filename:file.name.normalize('NFKC').slice(0,255),storage_path:path,mime_type:canonicalMime,size_bytes:file.size,sha256:await hash(bytes),document_date:String(form.get('documentDate')??'')||null,expires_at:String(form.get('expiresAt')??'')||null,uploaded_by:authData.user.id}
    const {error:metadataError}=await admin.from('client_documents').insert(record)
    if(metadataError){await admin.storage.from('client-documents').remove([path]);throw metadataError}
    return json(request,{documentId},201)
  }catch{return json(request,{error:'Não foi possível concluir a operação documental.'},400)}
})
