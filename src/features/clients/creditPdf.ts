import {supabase} from '../../lib/supabase'
import {createFormalDocumentPdf, downloadPdf, type FormalSnapshot, type ClientDocumentData, type IssuerData} from './formalDocumentPdf'
import { jsPDF } from 'jspdf'
import { creditDate, creditKind, creditMoney, creditStatement, type CreditAccount, type ProvisionNote, type CreditMovement } from './credit'
import type { CreditUsage } from './creditUsage'

export function saveCreditUsagePdf(account:CreditAccount,usage:CreditUsage){
 const doc=new jsPDF();let y=20
 const line=(text:string,bold=false)=>{doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(10);for(const part of doc.splitTextToSize(text,180) as string[]){if(y>275){doc.addPage();y=20}doc.text(part,15,y);y+=5}y+=2}
 line('Acompanhamento da provisão',true);line(account.client_name);line(account.society_name)
 line(`Registos desde ${usage.startsOn?creditDate(usage.startsOn):'o depósito'} até ${creditDate(new Date().toLocaleDateString('sv-SE'))}`)
 line(`Saldo disponível: ${creditMoney(account.balance,account.currency)}`,true)
 line(`Recebido: ${creditMoney(account.received,account.currency)}`)
 line(`Utilização estimada: ${creditMoney(usage.consumed,account.currency)}`)
 line(`Saldo estimado após registos: ${creditMoney(usage.balance,account.currency)}`,true)
 if(usage.excess>0)line(`Registos sem cobertura: ${creditMoney(usage.excess,account.currency)}`)
 if(usage.missingPrice>0)line(`Saldo por apurar: ${usage.missingPrice} registos sem preço.`)
 for(const row of usage.rows){line(`${creditDate(row.work_date)} · ${row.duration_minutes} min · ${row.effective_amount===null?'Sem preço':creditMoney(row.effective_amount,account.currency)}`,true);line(row.activity_description)}
 line(`Honorários dos registos: ${creditMoney(usage.subtotal,account.currency)} · IVA: ${creditMoney(usage.vat,account.currency)}`)
 line('Mapa de acompanhamento calculado com os valores actuais dos registos. Os serviços já descontados em notas anteriores não são contados novamente.')
 doc.save(`acompanhamento-provisao-${new Date().toISOString().slice(0,10)}.pdf`)
}

export function createCreditPdf(account:CreditAccount,movements:CreditMovement[],from='',to=''){
  const statement=creditStatement(movements,from,to),doc=new jsPDF()
  let y=20
  const heading=()=>{doc.setFont('helvetica','bold');doc.setFontSize(15);doc.text('Extracto de provisões',15,y);y+=8;doc.setFontSize(10)
    for(const text of [account.society_name,account.client_name,`Período de lançamento: ${from?creditDate(from):'início'} a ${to?creditDate(to):'actual'} · ${account.currency}`]){
      const lines=doc.splitTextToSize(text,180);doc.text(lines,15,y);y+=lines.length*5
    }y+=5;doc.setFont('helvetica','normal')}
  const line=(text:string,bold=false)=>{
    doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(9)
    const lines=doc.splitTextToSize(text,180) as string[]
    for(const value of lines){if(y>276){doc.addPage();y=18;heading();doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(9)}doc.text(value,15,y);y+=4.5}
  }
  heading();line(`Saldo inicial: ${creditMoney(statement.opening,account.currency)}`,true);y+=4
  for(const row of statement.rows){
    line(`${creditDate(row.recorded_at)} · ${creditKind(row.kind)} · ${creditMoney(row.amount,account.currency)} · Saldo: ${creditMoney(row.balance,account.currency)}`,true)
    line(`Data do pagamento / consumo: ${creditDate(row.movement_date)} · ${row.reference}`)
    if(row.note){line(`Nota ${row.note.number} · Total: ${creditMoney(row.note.total,account.currency)} · A pagar: ${creditMoney(row.note.remaining,account.currency)}`);for(const item of row.note.items){line(`${creditDate(item.work_date)} · ${item.duration_minutes} min · ${creditMoney(item.effective_amount,account.currency)} · ${item.activity_description}`)}}
    if(row.reverses_id)line(`Estorno do movimento ${row.reverses_id}`)
    y+=4
  }
  line(`Saldo final: ${creditMoney(statement.closing,account.currency)}`,true)
  line('As provisões são descontadas no total das Notas de Honorários, incluindo o IVA indicado na nota. Os registos discriminam os serviços prestados.')
  for(let page=1;page<=doc.getNumberOfPages();page++){doc.setPage(page);doc.setFontSize(8);doc.text(`Extracto justificativo · ${page} / ${doc.getNumberOfPages()}`,105,289,{align:'center'})}
  doc.setProperties({title:`Extracto de provisões · ${account.client_name}`})
  return doc
}
export function saveCreditPdf(account:CreditAccount,movements:CreditMovement[],from='',to=''){
  createCreditPdf(account,movements,from,to).save(`extracto-provisoes-${account.client_name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'-')}-${new Date().toISOString().slice(0,10)}.pdf`)
}

export function createProvisionNotePdf(account:CreditAccount,note:ProvisionNote,reversed=false){
 if(note.document_options?.presentation)return formalCopyPdf(note,note.document_options.presentation,reversed)
 const doc=new jsPDF();let y=20
 const language=note.document_options?.language==='en'?'en':note.document_options?.language==='fr'?'fr':'pt'
 const copy={pt:['Nota de Honorários','ESTORNADA — cópia histórica','Emissão','Honorários','IVA','Total','Provisão descontada','Valor a pagar','Saldo de provisão após esta nota','Despesas informativas — não incluídas nos totais'],en:['Fee Note','VOIDED — historical copy','Issued','Fees','VAT','Total','Advance deducted','Amount due','Advance balance after this note','Informational expenses — not included in totals'],fr:["Note d’honoraires",'ANNULÉE — copie historique','Émission','Honoraires','TVA','Total','Provision déduite','Montant à payer','Solde de provision après cette note','Frais informatifs — non inclus dans les totaux']}[language]
 const money=(value:number,currency=account.currency)=>new Intl.NumberFormat(language==='en'?'en-GB':language==='fr'?'fr-FR':'pt-PT',{style:'currency',currency}).format(value)
 const translations=note.document_options?.translation
 const description=(id:string,original:string)=>language==='pt'?original:translations?.language===language?translations.items.find(item=>item.kind==='work'&&item.id===id)?.text??original:original
 // Notas antigas conservam a cópia original; só as novas contêm a tradução guardada.
 const legacy=language!=='pt'&&(!translations||translations.language!==language)
 function line(text:string,bold=false){doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(10);for(const row of doc.splitTextToSize(text,180) as string[]){if(y>275){doc.addPage();y=20}doc.text(row,15,y);y+=5}y+=2}
 line(`${copy[0]} · ${note.number}${note.revision?` · v${note.revision}`:''}`,true);if(reversed)line(copy[1],true)
 if(legacy)line(language==='en'?'Historical original: work descriptions were not translated. Reissue the note to obtain a complete translation.':'Original historique : les descriptions des prestations n’ont pas été traduites. Réémettez la note pour obtenir une traduction intégrale.')
 line(note.document_options?.society_name??account.society_name,true);line(note.document_options?.client_name??account.client_name);line(`${copy[2]}: ${creditDate(note.issued_at)}`)
 for(const item of note.items){line(`${creditDate(item.work_date)} · ${item.duration_minutes} min · ${money(item.effective_amount)}`,true);line(description(item.id,item.activity_description))}
 line(`${copy[3]}: ${money(note.subtotal)}`);line(`${copy[4]} (${note.vat_rate}%): ${money(note.vat)}`)
 line(`${copy[5]}: ${money(note.total)}`,true);line(`${copy[6]}: ${money(note.deducted)}`,true)
 line(`${copy[7]}: ${money(note.remaining)}`,true);line(`${copy[8]}: ${money(note.balance_after)}`)
 if(note.document_options?.expenses?.length){line(copy[9],true);for(const expense of note.document_options.expenses){const item=note.items.find(row=>row.id===expense.work_entry_id);if(item)line(description(item.id,item.activity_description));line(money(expense.amount,expense.currency));if(expense.observations)line(expense.observations)}}
 for(let page=1;page<=doc.getNumberOfPages();page++){doc.setPage(page);doc.setFontSize(8);doc.text(`${note.number} · ${page} / ${doc.getNumberOfPages()}`,105,290,{align:'center'})}
 return doc
}
function formalCopyPdf(note:ProvisionNote,snapshot:FormalSnapshot,reversed:boolean,legacy=false){
 const language=snapshot.language,translation=note.document_options?.translation
 const rows=note.items.map(row=>({...row,professional_name:'',billing_entity_name:snapshot.issuer?.name??null,activity_description:language==='pt'?row.activity_description:translation?.language===language?translation.items.find(t=>t.kind==='work'&&t.id===row.id)?.text??row.activity_description:row.activity_description}))
 const doc=createFormalDocumentPdf(snapshot,rows,note.document_options?.expenses??[],note)
 if(reversed||legacy)for(let page=1;page<=doc.getNumberOfPages();page++){doc.setPage(page);doc.setFont('helvetica','bold');doc.setFontSize(7);doc.text(reversed?{pt:'ESTORNADA — cópia histórica',en:'VOIDED — historical copy',fr:'ANNULÉE — copie historique'}[language]:{pt:'Cópia reconstituída: apresentação recuperada das fichas actuais.',en:'Reconstructed copy: presentation recovered from current records.',fr:'Copie reconstituée : présentation issue des fiches actuelles.'}[language],105,295,{align:'center'})}
 return doc
}
export async function saveProvisionNotePdf(account:CreditAccount,note:ProvisionNote,reversed=false){
 let snapshot=note.document_options?.presentation
 const legacy=!snapshot
 if(!snapshot){
  if(!supabase)throw new Error('Ligação indisponível para recuperar a apresentação da nota antiga.')
  const [client,entity]=await Promise.all([supabase.from('clients').select('legal_name,address,honorarium_language,honorarium_delivery_method,honorarium_recipient_name,default_billing_entity_id').eq('id',account.client_id).maybeSingle(),supabase.from('billing_entities').select('id,name,legal_name,tax_number,address,phone,bank_account_holder,bank_name,bank_account_number,iban,bic_swift,bank_accounts,default_vat_rate,default_currency,logo_path').eq('id',account.billing_entity_id).maybeSingle()])
  if(client.error||entity.error)throw new Error('Não foi possível recuperar a apresentação da nota antiga.')
  const opts=(note.document_options??{}) as Record<string,unknown>,issuer=entity.data as IssuerData|null,clientDocument=client.data as ClientDocumentData|null
  let issuerLogo:string|null=null
  const logoPath=issuer?.logo_path||(issuer?.name?.toUpperCase().includes('LEGALTEAM')?'/brand/legalteam-logo.jpg':null)
  if(logoPath){const blob=logoPath.startsWith('/')?await fetch(logoPath).then(r=>{if(!r.ok)throw new Error('Não foi possível recuperar o logótipo.');return r.blob()}):await supabase.storage.from('billing-entity-logos').download(logoPath).then(r=>{if(r.error)throw r.error;return r.data});issuerLogo=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob)})}
  const bankAccounts=Array.isArray(opts.bankAccounts)?opts.bankAccounts as FormalSnapshot['bankAccounts']:issuer?.bank_accounts?.length?issuer.bank_accounts:issuer?.iban?[{account_holder:issuer.bank_account_holder??'',bank_name:issuer.bank_name??'',account_number:issuer.bank_account_number??'',iban:issuer.iban,bic_swift:issuer.bic_swift??'',currency:account.currency}]:[]
  snapshot={version:1,clientName:note.document_options?.client_name??account.client_name,clientDocument:clientDocument?{...clientDocument,honorarium_recipient_name:typeof opts.recipient==='string'?opts.recipient:clientDocument.honorarium_recipient_name}:null,issuer:issuer?{...issuer,default_currency:account.currency}:null,issuerLogo,language:opts.language==='en'?'en':opts.language==='fr'?'fr':'pt',columns:Array.isArray(opts.columns)&&opts.columns.length?opts.columns.filter(c=>['period','description','duration'].includes(String(c))) as FormalSnapshot['columns']:['period','description','duration'],showTimeTotal:opts.showTimeTotal!==false,showAmountTotal:opts.showAmountTotal===true,bankAccounts}
 }
 downloadPdf(formalCopyPdf(note,snapshot,reversed,legacy),`${note.number}${note.revision?`-v${note.revision}`:''}${reversed?'-estornada':''}.pdf`)
}
