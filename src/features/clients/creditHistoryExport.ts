import type { CreditAccount, CreditMovement } from './credit'
import { creditDate, creditMoney } from './credit'
import type { CreditUsage } from './creditUsage'

export type HistoryMode='values'|'time'
export function creditHistoryData(account:CreditAccount,usage:CreditUsage,movements:CreditMovement[],mode:HistoryMode){
 const events:Array<{id:string;date:string;description:string;minutes:number;receipt:number;base:number;total:number;missing:boolean}>=[]
 const active=movements.filter(m=>!m.reversed&&m.kind!=='reversal')
 for(const m of active.filter(m=>m.kind==='payment'))events.push({id:m.id,date:m.movement_date,description:'Provisão recebida',minutes:0,receipt:Math.round(m.amount*100),base:0,total:0,missing:false})
 const seen=new Set<string>()
 function services(rows:Array<{id:string;work_date:string;activity_description:string;duration_minutes:number;effective_amount:number|null}>,total:number){
  const base=rows.reduce((n,r)=>n+Math.round(Number(r.effective_amount??0)*100),0)
  let cumulative=0,previous=0
  for(const r of rows){const cents=Math.round(Number(r.effective_amount??0)*100);cumulative+=cents;const allocated=base?Math.round(cumulative*Math.round(total*100)/base):0
   if(!seen.has(r.id)){events.push({id:r.id,date:r.work_date,description:r.activity_description,minutes:r.duration_minutes,receipt:0,base:cents,total:allocated-previous,missing:r.effective_amount===null});seen.add(r.id)}previous=allocated
  }
 }
 for(const m of active)if(m.note&&m.kind==='consumption')services(m.note.items,m.note.total)
 services(usage.rows,usage.total)
 events.sort((a,b)=>a.date.localeCompare(b.date)||(b.receipt-a.receipt)||a.id.localeCompare(b.id))
 const header=mode==='values'?['Data','Descrição','Tempo (min)','Provisão recebida','Honorários sem IVA','IVA','Total com IVA','Saldo da provisão']:['Data','Descrição','Tempo (min)']
 let balance=0
 const rows=events.map(e=>{balance+=e.receipt-e.total;return mode==='values'?[creditDate(e.date),e.description,e.minutes,e.receipt/100,e.missing?'Sem preço':e.base/100,(e.total-e.base)/100,e.missing?'Por apurar':e.total/100,Math.max(0,balance)/100]:[creditDate(e.date),e.receipt?`${e.description} · ${creditMoney(e.receipt/100,account.currency)}`:e.description,e.minutes]})
 const summary:[string,number|string][]=[['Provisões recebidas',Number(account.received)],['Provisão utilizada',usage.consumed],['Saldo disponível',usage.balance],['Valor dos registos sem cobertura',usage.excess],['Tempo total (min)',events.reduce((n,e)=>n+e.minutes,0)]]
 if(usage.missingPrice)summary.push(['Registos sem preço · saldo por apurar',usage.missingPrice])
 return {header,rows,summary}
}

export async function createCreditHistoryFile(account:CreditAccount,usage:CreditUsage,movements:CreditMovement[],mode:HistoryMode,format:'pdf'|'xlsx'){
 const data=creditHistoryData(account,usage,movements,mode),name=`historico-provisoes-${new Date().toLocaleDateString('sv-SE')}`
 if(format==='xlsx'){
  const XLSX=await import('xlsx'),book=XLSX.utils.book_new()
  const sheet=XLSX.utils.aoa_to_sheet([[account.client_name],[account.society_name],['Histórico de provisões · '+account.currency],[],data.header,...data.rows,[],['Resumo final'],...data.summary])
  sheet['!cols']=data.header.map((_,i)=>({wch:i===1?65:i===0?14:22}))
  if(mode==='values')for(let r=5;r<5+data.rows.length;r++)for(let c=3;c<data.header.length;c++){const cell=sheet[XLSX.utils.encode_cell({r,c})];if(cell?.t==='n')cell.z='#,##0.00'}
  XLSX.utils.book_append_sheet(book,sheet,'Histórico');return {blob:new Blob([XLSX.write(book,{bookType:'xlsx',type:'array'})],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),filename:`${name}.xlsx`}
 }
 const {jsPDF}=await import('jspdf'),doc=new jsPDF();let y=20
 const line=(text:string,bold=false)=>{doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(10);for(const part of doc.splitTextToSize(text,180) as string[]){if(y>275){doc.addPage();y=20}doc.text(part,15,y);y+=5}y+=2}
 line('Histórico de provisões',true);line(account.client_name);line(account.society_name);line(mode==='values'?'Registos com valores e saldo corrente':'Registos com tempos · resumo monetário no final')
 for(const row of data.rows){line(`${row[0]} · ${row[2]} min`,true);line(String(row[1]));if(mode==='values'){if(Number(row[3]))line(`Provisão: ${creditMoney(Number(row[3]),account.currency)}`);else line(`Honorários: ${typeof row[4]==='number'?creditMoney(row[4],account.currency):row[4]} · IVA: ${creditMoney(Number(row[5]),account.currency)} · Total: ${typeof row[6]==='number'?creditMoney(row[6],account.currency):row[6]}`);line(`Saldo: ${creditMoney(Number(row[7]),account.currency)}`)}}
 line('Resumo final',true);for(const [label,value] of data.summary)line(`${label}: ${label.includes('(min)')||label.includes('sem preço')?value:creditMoney(Number(value),account.currency)}`,label==='Saldo disponível')
 line('Mapa de acompanhamento. Não emite uma Nota de Honorários nem altera pagamentos.')
 for(let page=1;page<=doc.getNumberOfPages();page++){doc.setPage(page);doc.setFontSize(8);doc.text(`${page} / ${doc.getNumberOfPages()}`,105,290,{align:'center'})}
 return {blob:doc.output('blob'),filename:`${name}.pdf`}
}
