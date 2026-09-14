// Somente dados sintéticos. Nunca imprime chaves nem configura o ambiente remoto.
import { readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'
import { translateTexts } from '../worker/documentTranslation.ts'

const env=parseEnv(readFileSync(new URL('../.env.local',import.meta.url),'utf8'))
if(!env.AZURE_TRANSLATOR_KEY||!env.AZURE_TRANSLATOR_REGION)throw new Error('Azure Translator não configurado.')
const source=[{id:'synthetic-work',kind:'work',text:'Análise documental e preparação de requerimento. Reunião de 30 minutos às 14h30 sobre o processo TESTE-123. Consulta do artigo 10.º e pagamento de 1.250,50 euros.'},{id:'synthetic-expense',kind:'expense',text:'Correio registado para envio de certidões.'}]
try{
 for(const language of ['en','fr']){
  const translated=await translateTexts(language,source,env.AZURE_TRANSLATOR_KEY,env.AZURE_TRANSLATOR_REGION)
  console.log(JSON.stringify({language,translated}))
  if(translated.length!==2||translated[0].text===source[0].text||['TESTE-123','14h30','10.º','1.250,50'].some(value=>!translated[0].text.includes(value)))throw new Error('Validação sintética falhou.')
 }
}catch(error){console.error(error instanceof Error&&/^(Azure Translator HTTP \d+|incomplete|invalid|Validação sintética falhou\.)$/.test(error.message)?error.message:'O teste sintético não foi concluído (ligação ou resposta inválida).');process.exitCode=1}
