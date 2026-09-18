import {useEffect,useState} from 'react'
import {supabase} from '../../lib/supabase'
import {saveProvisionNotePdf} from './creditPdf'
import type {CreditAccount,ProvisionNote} from './credit'
import {documentIsVoided,type HonorariumDocument} from './honorariumDocuments'
import type {ClientDocumentData,IssuerData,FormalSnapshot} from './formalDocumentPdf'
import {issuerLogoPath,issuerMatchesSociety} from './societyBranding'

type Job={id:string;client_id:string;billing_entity_id:string|null;agreed_amount:number;vat_rate:number|null;provision_applied?:number;currency:string;status:string;is_paid:boolean}
const totalWithVat=(amount:number,rate:number)=>(Math.round(amount*100)+Math.round(Math.round(amount*100)*rate/100))/100
async function issuerLogo(issuer:IssuerData,societyName:string){
 const path=issuerLogoPath(issuer,societyName);if(!path)return null
 const blob=path.startsWith('/')?await fetch(path).then(response=>{if(!response.ok)throw new Error('Não foi possível carregar o logótipo da sociedade.');return response.blob()}):await (async()=>{const result=await supabase!.storage.from('billing-entity-logos').download(path);if(result.error||!result.data)throw result.error??new Error('Não foi possível carregar o logótipo da sociedade.');return result.data})()
 const bitmap=await createImageBitmap(blob),scale=Math.min(1,720/bitmap.width,480/bitmap.height),canvas=document.createElement('canvas')
 canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale))
 const context=canvas.getContext('2d');if(!context)throw new Error('Não foi possível preparar o logótipo da sociedade.')
 context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close()
 let quality=.8,result=canvas.toDataURL('image/jpeg',quality)
 while(result.length>24000&&quality>.5){quality-=.05;result=canvas.toDataURL('image/jpeg',quality)}
 if(result.length>24000)throw new Error('O logótipo da sociedade é demasiado grande para guardar nesta nota.')
 return result
}

export function FixedFeeNoteActions({job,societyName,readOnly}:{job:Job;societyName:string;readOnly:boolean}){
 const [note,setNote]=useState<HonorariumDocument|null>(null)
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[confirmVoid,setConfirmVoid]=useState(false)
 useEffect(()=>{if(!supabase)return;let active=true;void supabase.rpc('get_client_honorarium_documents',{p_client_id:job.client_id}).then(result=>{if(!active)return;if(result.error){setError(result.error.message);return}const current=((result.data??[]) as HonorariumDocument[]).find(item=>item.fixed_fee_job_id===job.id&&item.is_current);setNote(current??null)});return()=>{active=false}},[job.id,job.client_id])
 const accountFor=(saved:ProvisionNote):CreditAccount=>({id:'',client_id:job.client_id,client_name:saved.document_options?.client_name??'',billing_entity_id:job.billing_entity_id??'',society_name:societyName,currency:job.currency,received:0,consumed:0,balance:saved.balance_after})
 async function issue(){
  if(!supabase||!job.billing_entity_id||job.vat_rate===null||busy)return
  setBusy(true);setError('')
  try{
   const [clientResult,issuerResult]=await Promise.all([
    supabase.from('clients').select('display_name,legal_name,address,honorarium_language,honorarium_delivery_method,honorarium_recipient_name,honorarium_salutation,default_billing_entity_id').eq('id',job.client_id).single(),
    supabase.from('billing_entities').select('id,name,legal_name,tax_number,address,email,phone,bank_account_holder,bank_name,bank_account_number,iban,bic_swift,bank_accounts,default_vat_rate,default_currency,logo_path').eq('id',job.billing_entity_id).single(),
   ])
   if(clientResult.error||issuerResult.error)throw clientResult.error??issuerResult.error
   const client=clientResult.data as ClientDocumentData&{display_name:string},issuer=issuerResult.data as IssuerData
   if(!issuerMatchesSociety(issuer,societyName))throw new Error('A identidade da sociedade emissora não coincide com o trabalho.')
   if(!client.honorarium_salutation)throw new Error('Defina a saudação formal na ficha do cliente antes de emitir a nota.')
   const bankAccounts=issuer.bank_accounts?.length?issuer.bank_accounts:issuer.iban?[{account_holder:issuer.bank_account_holder??'',bank_name:issuer.bank_name??'',account_number:issuer.bank_account_number??'',iban:issuer.iban,bic_swift:issuer.bic_swift??'',currency:job.currency}]:[]
   if(!issuer.legal_name||!issuer.tax_number||!issuer.address||!bankAccounts.length)throw new Error('Complete os dados de identificação e a conta bancária da sociedade antes de emitir a nota.')
   const presentation:FormalSnapshot={version:1,societyName,clientName:client.display_name,clientDocument:client,issuer,issuerLogo:await issuerLogo(issuer,societyName),language:client.honorarium_language??'pt',columns:['period','description','duration'],showTimeTotal:true,showAmountTotal:true,bankAccounts}
   const options={client_name:client.display_name,society_name:societyName,language:presentation.language,presentation,fixed_fee_paid:job.is_paid}
   const response=await supabase.rpc('issue_fixed_fee_honorarium_note',{p_job_id:job.id,p_document_options:options,p_expected_total:totalWithVat(job.agreed_amount,job.vat_rate),p_expected_applied:Number(job.provision_applied??0),p_expected_revision:note?.revision??null,p_request_id:crypto.randomUUID()})
   if(response.error)throw response.error
   const saved=response.data as ProvisionNote&HonorariumDocument
   setNote({...saved,is_current:true,voided:false,credit_note_id:null,credit_note:null,credit_active:false,fixed_fee_job_id:job.id})
   await saveProvisionNotePdf(accountFor(saved),saved)
  }catch(cause){setError(cause instanceof Error?cause.message:'Não foi possível emitir a nota.')}
  finally{setBusy(false)}
 }
 async function reprint(){if(!note)return;setBusy(true);setError('');try{await saveProvisionNotePdf(accountFor(note),note,documentIsVoided(note))}catch(cause){setError(cause instanceof Error?cause.message:'Não foi possível guardar a nota.')}finally{setBusy(false)}}
 async function voidNote(){if(!supabase||!note||busy)return;setBusy(true);setError('');try{const result=await supabase.rpc('void_honorarium_document',{p_document_id:note.document_id,p_expected_revision:note.revision,p_request_id:crypto.randomUUID()});if(result.error)throw result.error;setNote({...note,...result.data,is_current:true,voided:true,fixed_fee_job_id:job.id});setConfirmVoid(false)}catch(cause){setError(cause instanceof Error?cause.message:'Não foi possível anular a nota.')}finally{setBusy(false)}}
 return <section className="mt-3 rounded-lg border border-border bg-surface-subtle p-3" aria-label="Nota de Honorários do trabalho a preço fixo">
  <div className="flex flex-wrap items-center gap-2"><strong className="mr-auto text-sm">Nota de Honorários</strong>{note&&<span className="text-xs font-semibold">{note.number} · v{note.revision}{documentIsVoided(note)?' · anulada':''}</span>}</div>
  <p className="mt-1 text-xs text-text-secondary">A nota apresenta o preço acordado uma vez e a provisão já aplicada. Emiti-la não altera os estados Facturado e Pago do trabalho.</p>
  <div className="mt-2 flex flex-wrap gap-2">
   {!readOnly&&job.status!=='cancelled'&&job.billing_entity_id&&job.vat_rate!==null&&<button type="button" className="control min-h-9 px-3 text-sm font-semibold" disabled={busy} onClick={()=>void issue()}>{busy?'A preparar…':note&&!documentIsVoided(note)?'Rever e emitir nova versão':'Emitir nota e guardar PDF'}</button>}
   {note&&<button type="button" className="control min-h-9 px-3 text-sm" disabled={busy} onClick={()=>void reprint()}>Guardar nota existente</button>}
   {!readOnly&&note&&!documentIsVoided(note)&&<button type="button" className="control min-h-9 px-3 text-sm text-danger" disabled={busy} onClick={()=>setConfirmVoid(true)}>Anular nota</button>}
  </div>
  {confirmVoid&&<div role="alert" className="mt-2 rounded-lg bg-danger-soft p-2 text-sm">A nota fica no histórico como anulada. A provisão já aplicada ao trabalho mantém-se no livro.<div className="mt-2 flex gap-2"><button type="button" className="control px-3 text-danger" disabled={busy} onClick={()=>void voidNote()}>Confirmar anulação</button><button type="button" className="control px-3" onClick={()=>setConfirmVoid(false)}>Cancelar</button></div></div>}
  {error&&<p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
 </section>
}
