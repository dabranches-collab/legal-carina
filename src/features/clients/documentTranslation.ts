import { supabase } from '../../lib/supabase'

export type TranslationItem = { id:string; kind:'work'|'expense'; text:string }
export type DocumentTranslation = { language:'en'|'fr'; items:TranslationItem[] }
export const translationKey = (item:Pick<TranslationItem,'kind'|'id'>) => `${item.kind}:${item.id}`

export function validateTranslations(source:TranslationItem[], value:unknown):TranslationItem[] {
  if(!Array.isArray(value)||value.length!==source.length)throw new Error('A tradução está incompleta. Tente novamente.')
  const received=new Map<string,TranslationItem>()
  for(const item of value){
    if(!item||typeof item.id!=='string'||!['work','expense'].includes(item.kind)||typeof item.text!=='string'||!item.text.trim()||item.text.length>24000)throw new Error('A tradução recebida é inválida.')
    const key=translationKey(item)
    if(received.has(key))throw new Error('A tradução contém registos repetidos.')
    received.set(key,item)
  }
  return source.map(item=>{const translated=received.get(translationKey(item));if(!translated)throw new Error('Falta a tradução de um registo.');return translated})
}

export async function translateDocument(clientId:string,language:'en'|'fr',items:TranslationItem[]):Promise<DocumentTranslation>{
  if(!items.length)return {language,items:[]}
  if(!supabase)throw new Error('Ligação indisponível para traduzir o documento.')
  const {data,error}=await supabase.auth.getSession()
  if(error||!data.session)throw new Error('Inicie sessão novamente para traduzir o documento.')
  const batches:TranslationItem[][]=[]
  let batch:TranslationItem[]=[],size=0
  for(const item of items){
    if(item.text.length>8000)throw new Error('Um dos textos ultrapassa o limite de tradução de 8000 caracteres.')
    if(batch.length&&(batch.length===20||size+item.text.length>12000)){batches.push(batch);batch=[];size=0}
    batch.push(item);size+=item.text.length
  }
  if(batch.length)batches.push(batch)
  const translated:TranslationItem[]=[]
  for(const source of batches){
    const response=await fetch('/api/document-translation',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${data.session.access_token}`,apikey:import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY??''},body:JSON.stringify({clientId,language,items:source}),signal:AbortSignal.timeout(90000)})
    const result=await response.json().catch(()=>null)
    if(!response.ok)throw new Error(typeof result?.error==='string'?result.error:'Não foi possível traduzir o documento. Tente novamente.')
    translated.push(...validateTranslations(source,result?.items))
  }
  return {language,items:translated}
}
