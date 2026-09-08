type Item={id:string;kind:'work'|'expense';text:string}
type Settings={AZURE_TRANSLATOR_KEY?:string;AZURE_TRANSLATOR_REGION?:string;TRANSLATION_LIMITER:{limit(options:{key:string}):Promise<{success:boolean}>}}
const database='https://vtvvqyebigflgqccbqsw.supabase.co'
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}})

async function readJson(body:Request|Response,maximum:number):Promise<unknown>{
  const reader=body.body?.getReader();if(!reader)throw new Error('empty')
  const chunks:Uint8Array[]=[];let size=0
  try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>maximum){await reader.cancel();throw new Error('size')}chunks.push(value)}}finally{reader.releaseLock()}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}
  return JSON.parse(new TextDecoder().decode(bytes))
}

export async function handleDocumentTranslation(request:Request,env:Settings):Promise<Response>{
  if(request.method!=='POST')return json({error:'Método não permitido.'},405)
  if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'Origem não autorizada.'},403)
  const authorization=request.headers.get('authorization'),apikey=request.headers.get('apikey')
  if(!authorization?.startsWith('Bearer ')||!apikey)return json({error:'Autenticação necessária.'},401)
  if(!env.AZURE_TRANSLATOR_KEY||!env.AZURE_TRANSLATOR_REGION||!env.TRANSLATION_LIMITER)return json({error:'Tradução automática ainda não configurada neste ambiente.'},503)
  if(!request.headers.get('content-type')?.includes('application/json'))return json({error:'Pedido inválido.'},400)
  let input:{clientId:string;language:'en'|'fr';items:Item[]}
  try{
    input=await readJson(request,100000) as typeof input
    if(!input||!uuid.test(input.clientId)||!['en','fr'].includes(input.language)||!Array.isArray(input.items)||!input.items.length||input.items.length>20)throw new Error('input')
    const keys=new Set<string>();let size=0
    for(const item of input.items){if(!item||!uuid.test(item.id)||!['work','expense'].includes(item.kind)||typeof item.text!=='string'||!item.text.trim()||item.text.length>8000||keys.has(`${item.kind}:${item.id}`))throw new Error('item');keys.add(`${item.kind}:${item.id}`);size+=item.text.length}
    if(size>12000)throw new Error('size')
  }catch{return json({error:'Conteúdo de tradução inválido ou demasiado extenso.'},400)}
  try{
    const headers={Authorization:authorization,apikey}
    const auth=await fetch(`${database}/auth/v1/user`,{headers,signal:AbortSignal.timeout(10000)})
    if(!auth.ok)return json({error:'Sessão inválida. Inicie sessão novamente.'},401)
    const user=await auth.json() as {id?:string;is_anonymous?:boolean}
    if(!user.id||user.is_anonymous)return json({error:'Sessão inválida.'},401)
    if(!(await env.TRANSLATION_LIMITER.limit({key:user.id})).success)return json({error:'Limite de traduções atingido. Aguarde um minuto e tente novamente.'},429)
    // Consultas com o JWT do utilizador: RLS conserva o âmbito de acesso existente.
    // Só textos exactamente iguais aos registos autorizados podem sair para tradução.
    for(const kind of ['work','expense'] as const){
      const items=input.items.filter(item=>item.kind===kind);if(!items.length)continue
      const query=new URLSearchParams({select:kind==='work'?'id,activity_description':'id,observations,work_entries!inner(client_id)',id:`in.(${items.map(item=>item.id).join(',')})`,[kind==='work'?'client_id':'work_entries.client_id']:`eq.${input.clientId}`})
      if(kind==='expense')query.set('status','eq.active')
      const response=await fetch(`${database}/rest/v1/${kind==='work'?'work_entries':'work_entry_expenses'}?${query}`,{headers,signal:AbortSignal.timeout(15000)})
      if(!response.ok)return json({error:'Não foi possível confirmar o acesso aos registos.'},403)
      const rows=await readJson(response,200000) as Array<{id:string;activity_description?:string;observations?:string}>
      if(!Array.isArray(rows)||items.some(item=>!rows.some(row=>row.id===item.id&&(kind==='work'?row.activity_description:row.observations)===item.text)))return json({error:'Os registos mudaram ou não estão acessíveis. Reabra a nota antes de traduzir.'},409)
    }
    const items=await translateTexts(input.language,input.items,env.AZURE_TRANSLATOR_KEY,env.AZURE_TRANSLATOR_REGION)
    return json({items})
  }catch(cause){
    const reason=cause instanceof Error?cause.message:''
    if(reason==='Azure Translator HTTP 429')return json({code:'translator_busy',error:'O tradutor atingiu temporariamente o limite de pedidos. Aguarde um minuto e tente novamente. Nenhuma nota foi emitida.'},429)
    if(/^Azure Translator HTTP (401|403)$/.test(reason))return json({code:'translator_unavailable',error:'O serviço de tradução está indisponível por configuração ou quota. Contacte o administrador. Nenhuma nota foi emitida.'},503)
    if(reason==='invalid'||reason==='incomplete')return json({code:'translation_validation',error:'A tradução recebida não preservou todos os textos ou referências. Nenhuma nota foi emitida; tente novamente ou comunique este erro ao administrador.'},502)
    return json({code:'translation_failed',error:'Não foi possível concluir a ligação ao serviço de tradução. Nenhuma nota foi emitida; tente novamente.'},502)
  }
}

const escapeHtml=(text:string)=>text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')
function protectedText(text:string):{html:string;references:string[]}{
  const references:string[]=[]
  const parts=text.split(/(https?:\/\/[^\s<>]+|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|[\p{L}\p{N}]+(?:[-/.,][\p{L}\p{N}]+)*)/gu)
  const html=parts.map((part,index)=>{
    const escaped=escapeHtml(part).replace(/\r\n|\n|\r/g,'<br>')
    if(index%2&&(/\d|@|^https?:/.test(part))){references.push(part);return `<span class="notranslate">${escaped}</span>`}
    return escaped
  }).join('')
  return {html:`<div>${html}</div>`,references}
}
function plainTranslation(html:string):string{
  // Eliminar somente o invólucro conhecido, antes de descodificar o texto escapado.
  const text=html.replace(/<br\s*\/?\s*>/gi,'\n').replace(/<\/span>(?=[\p{L}\p{N}])/giu,'</span> ').replace(/<\/?(?:div|span)\b[^>]*>/gi,'')
  if(/<[^>]*>/.test(text))throw new Error('invalid')
  return text.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi,(_,entity:string)=>{
    const named:Record<string,string>={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '}
    if(entity.startsWith('#')){const code=entity[1].toLowerCase()==='x'?parseInt(entity.slice(2),16):Number(entity.slice(1));if(code>0x10ffff)throw new Error('invalid');return String.fromCodePoint(code)}
    return named[entity.toLowerCase()]
  })
}
export async function translateTexts(language:'en'|'fr',items:Item[],key:string,region:string):Promise<Item[]>{
  const prepared=items.map(item=>protectedText(item.text))
  const query=new URLSearchParams({'api-version':'3.0',to:language,textType:'html',from:'pt'})
  const response=await fetch(`https://api.cognitive.microsofttranslator.com/translate?${query}`,{
    method:'POST',redirect:'error',signal:AbortSignal.timeout(60000),
    headers:{'Ocp-Apim-Subscription-Key':key,'Ocp-Apim-Subscription-Region':region,'Content-Type':'application/json; charset=UTF-8'},
    // A API mantém a ordem do lote. Identificadores e tipos ficam neste servidor.
    body:JSON.stringify(prepared.map(item=>({Text:item.html}))),
  })
  if(!response.ok){await response.body?.cancel();throw new Error(`Azure Translator HTTP ${response.status}`)}
  const result=await readJson(response,300000) as Array<{translations?:Array<{to?:string;text?:string}>}>
  if(!Array.isArray(result)||result.length!==items.length)throw new Error('incomplete')
  return items.map((item,index)=>{
    const translations=result[index]?.translations,translation=translations?.[0]
    if(!Array.isArray(translations)||translations.length!==1||translation?.to!==language||typeof translation.text!=='string'||!translation.text.trim()||translation.text.length>24000)throw new Error('invalid')
    const text=plainTranslation(translation.text)
    if(!text.trim()||prepared[index].references.some(reference=>!text.includes(reference)))throw new Error('invalid')
    return {...item,text}
  })
}
