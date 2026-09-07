// Somente dados sintéticos. Nunca imprime chaves nem configura o ambiente remoto.
import { readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'
import { translateTexts } from '../worker/documentTranslation.ts'

const env=parseEnv(readFileSync(new URL('../.env.local',import.meta.url),'utf8'))
if(!env.OPENAI_API_KEY)throw new Error('OPENAI_API_KEY não configurada.')
const source=[{id:'synthetic-work',kind:'work',text:'Análise documental e preparação de requerimento. Reunião de 30 minutos sobre o processo TESTE-123.'},{id:'synthetic-expense',kind:'expense',text:'Correio registado para envio de certidões.'}]
try{
 for(const language of ['en','fr']){
  const translated=await translateTexts(language,source,env.OPENAI_API_KEY)
  if(translated.length!==2||translated[0].text===source[0].text||!translated[0].text.includes('TESTE-123'))throw new Error('Validação sintética falhou.')
  console.log(JSON.stringify({language,translated}))
 }
}catch(error){console.error(error instanceof Error&&/^OpenAI HTTP \d+: [a-z_]+$/.test(error.message)?error.message:'O teste sintético não foi concluído (ligação ou resposta inválida).');process.exitCode=1}
