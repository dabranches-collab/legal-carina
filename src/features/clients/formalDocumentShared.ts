import type { DocumentLanguage, IssuerData } from './formalDocumentPdf'

export type HonorariumSalutation='exmo_senhor'|'exma_senhora'|'exmos_senhores'|'exmas_senhoras'

const salutations:Record<HonorariumSalutation,Record<DocumentLanguage,string>>={
 exmo_senhor:{pt:'Exmo. Senhor,',en:'Dear Sir,',fr:'Monsieur,'},
 exma_senhora:{pt:'Exma. Senhora,',en:'Dear Madam,',fr:'Madame,'},
 exmos_senhores:{pt:'Exmos. Senhores,',en:'Dear Sirs,',fr:'Mesdames, Messieurs,'},
 exmas_senhoras:{pt:'Exmas. Senhoras,',en:'Dear Madams,',fr:'Mesdames,'},
}

export function documentGreeting(value:HonorariumSalutation|null|undefined,language:DocumentLanguage,fallback:string){return value?salutations[value]?.[language]??fallback:fallback}

const ptMonths=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']
const frMonths=['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre']
const enMonths=['January','February','March','April','May','June','July','August','September','October','November','December']

export function formalDate(value:Date,language:DocumentLanguage){
 const day=value.getDate(),month=value.getMonth(),year=value.getFullYear()
 if(language==='en')return `Alfragide, ${day} ${enMonths[month]} ${year}`
 if(language==='fr')return `Alfragide, ${day} ${frMonths[month]} ${year}`
 return `Alfragide, ${day} de ${ptMonths[month][0].toLocaleUpperCase('pt-PT')}${ptMonths[month].slice(1)} de ${year}`
}

const normalized=(value:string|null|undefined)=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase()

export function issuerFooterLines(issuer:IssuerData,language:DocumentLanguage){
 if(normalized(`${issuer.name} ${issuer.legal_name}`).includes('CARINA SANTOS'))return [
  'CP 19372L · NIF 201739380',
  'Avenida dos Moinhos, 1C, 2610-118 Alfragide',
  'carinamarquesdossantos-19372l@adv.oa.pt',
 ]
 const taxLabel=language==='pt'?'NIF':language==='en'?'Tax ID':'Identifiant fiscal'
 return [
  `${issuer.legal_name||issuer.name}${issuer.tax_number?` · ${taxLabel} ${issuer.tax_number}`:''}`,
  [String(issuer.address||'').replace(/\s*\r?\n\s*/g,' · '),issuer.phone].filter(Boolean).join(' · '),
  issuer.email||'',
 ].filter(Boolean)
}

export const monthYear=(date:string)=>{const [year,month]=date.split('-');return `${month}-${year}`}
export const duration=(minutes:number)=>`${Math.floor(minutes/60)}:${String(minutes%60).padStart(2,'0')}:00`
