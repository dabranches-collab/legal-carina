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
 const doc=new jsPDF();let y=20
 function line(text:string,bold=false){doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(10);for(const row of doc.splitTextToSize(text,180) as string[]){if(y>275){doc.addPage();y=20}doc.text(row,15,y);y+=5}y+=2}
 line(`Nota de Honorários · ${note.number}${note.revision?` · v${note.revision}`:''}`,true);if(reversed)line('ESTORNADA — cópia histórica',true)
 line(note.document_options?.society_name??account.society_name,true);line(note.document_options?.client_name??account.client_name);line(`Emissão: ${creditDate(note.issued_at)}`)
 for(const item of note.items){line(`${creditDate(item.work_date)} · ${item.duration_minutes} min · ${creditMoney(item.effective_amount,account.currency)}`,true);line(item.activity_description)}
 line(`Honorários: ${creditMoney(note.subtotal,account.currency)}`);line(`IVA (${note.vat_rate}%): ${creditMoney(note.vat,account.currency)}`)
 line(`Total: ${creditMoney(note.total,account.currency)}`,true);line(`Provisão descontada: ${creditMoney(note.deducted,account.currency)}`,true)
 line(`Valor a pagar: ${creditMoney(note.remaining,account.currency)}`,true);line(`Saldo de provisão após esta nota: ${creditMoney(note.balance_after,account.currency)}`)
 for(let page=1;page<=doc.getNumberOfPages();page++){doc.setPage(page);doc.setFontSize(8);doc.text(`${note.number} · ${page} / ${doc.getNumberOfPages()}`,105,290,{align:'center'})}
 return doc
}
export function saveProvisionNotePdf(account:CreditAccount,note:ProvisionNote,reversed=false){createProvisionNotePdf(account,note,reversed).save(`${note.number}${note.revision?`-v${note.revision}`:''}${reversed?'-estornada':''}.pdf`)}
