import type { AllocationRates, AllocationWork } from './allocation'
import { allocateHonoraria, allocationColors } from './allocation'

export type AllocationReport={start:string;end:string;payment:'all'|'paid'|'unpaid';clientNames:string[];allClients:boolean;rates:AllocationRates;work:AllocationWork[]}
const money=(cents:number)=>new Intl.NumberFormat('pt-PT',{minimumFractionDigits:2,maximumFractionDigits:2}).format(cents/100)+' EUR'
const date=(value:string)=>value.split('-').reverse().join('/')
const time=(minutes:number)=>`${Math.floor(minutes/60)}h ${minutes%60}m`
export async function createAllocationPdf(report:AllocationReport){
 const {jsPDF}=await import('jspdf'),doc=new jsPDF(),map=allocateHonoraria(report.work,false,report.rates)
 const margin=15,width=180;let y=20
 const header=()=>{doc.setFillColor('#17293f');doc.rect(0,0,210,11,'F');doc.setFont('helvetica','bold');doc.setTextColor('#17293f');doc.setFontSize(18);doc.text('LEGALTEAM',margin,24);doc.setFontSize(12);doc.text('Distribuição de honorários',margin,32);y=42}
 const ensure=(height:number)=>{if(y+height>276){doc.addPage();header()}}
 const text=(value:string,size=9,bold=false)=>{doc.setFontSize(size);doc.setFont('helvetica',bold?'bold':'normal');const lines=doc.splitTextToSize(value,width) as string[];for(const line of lines){ensure(5);doc.setFontSize(size);doc.setFont('helvetica',bold?'bold':'normal');doc.setTextColor('#24364b');doc.text(line,margin,y);y+=5}y+=2}
 header()
 text(`Período: ${date(report.start)} a ${date(report.end)} | ${report.payment==='paid'?'Apenas registos pagos':report.payment==='unpaid'?'Apenas registos não pagos':'Todos os estados de pagamento'}`,10,true)
 text(`${report.allClients?'Clientes da LEGALTEAM no período':'Clientes seleccionados'} (${report.clientNames.length})`,10,true)
 if(!report.clientNames.length)text('Nenhum')
 else{
  doc.setFont('helvetica','normal');doc.setFontSize(9)
  const gap=6,names=report.clientNames
  let columns=Math.min(4,names.length)
  const measured=(count:number)=>Array.from({length:count},(_,column)=>{const lengths=names.filter((_,i)=>i%count===column).map(name=>doc.getTextWidth(name)+3).sort((a,b)=>a-b);return Math.max(30,lengths[Math.floor((lengths.length-1)*.85)]??30)})
  while(columns>2&&measured(columns).reduce((n,w)=>n+w,0)+gap*(columns-1)>width)columns--
  const preferred=measured(columns),available=width-gap*(columns-1),sum=preferred.reduce((n,w)=>n+w,0)
  const widths=preferred.map(w=>sum>available?w*available/sum:w+(available-sum)/columns)
  for(let offset=0;offset<names.length;offset+=columns){
   doc.setFontSize(9);doc.setFont('helvetica','normal')
   const cells=names.slice(offset,offset+columns).map((name,i)=>doc.splitTextToSize(name,widths[i]-2) as string[])
   const height=Math.max(...cells.map(lines=>lines.length))*4.5+3
   if(y+height>276){doc.addPage();header();text('Clientes da LEGALTEAM (continuação)',10,true)}
   doc.setFontSize(9);doc.setFont('helvetica','normal');doc.setTextColor('#24364b')
   let left=margin
   cells.forEach((lines,i)=>{doc.text(lines,left,y,{lineHeightFactor:1.4});left+=widths[i]+gap})
   y+=height
  }
  y+=3
 }
 text('Base: honorários efectivos em EUR, sem IVA, após descontos e sem despesas debitadas ao cliente.')
 text(`Angariação do cliente: ${report.rates.client}% | Angariação da tarefa: ${report.rates.task}% | Execução: ${report.rates.execution}% | Escritório: ${report.rates.office}%`)
 ensure(39);y+=2
 doc.setFillColor('#edf3f3');doc.roundedRect(margin,y,width,23,2,2,'F');doc.setFontSize(10);doc.text('Honorários no período',margin+4,y+7);doc.text('Horas de execução',margin+97,y+7);doc.setFontSize(16);doc.setFont('helvetica','bold');doc.text(money(map.total),margin+4,y+17);doc.text(time(report.work.reduce((n,r)=>n+r.duration_minutes,0)),margin+97,y+17);y+=29
 const parts=[['client',report.rates.client],['task',report.rates.task],['execution',report.rates.execution],['office',report.rates.office]] as const
 let x=margin;for(const [key,rate] of parts){doc.setFillColor(allocationColors[key]);doc.rect(x,y,width*rate/100,4,'F');x+=width*rate/100}y+=11
 text(`Escritório: ${money(map.office)} | Parcelas por atribuir: ${money(map.unassigned)}`,10,true)
 text(`${report.work.length} registos considerados. Avenças e trabalho não facturável contribuem apenas horas.`)
 if(map.missingPrice)text(`${map.missingPrice} registo(s) sem montante para repartir: as horas estão incluídas e os valores apresentados são parciais.`,10,true)
 ensure(40);text('Distribuição por pessoa',12,true)
 const starts=[15,65,86,111,138,165],ends=[65,86,111,138,165,195]
 const tableHeader=()=>{ensure(15);doc.setFillColor('#17293f');doc.rect(margin,y,width,12,'F');doc.setTextColor('#ffffff');doc.setFontSize(8);doc.setFont('helvetica','bold');['Pessoa','Horas','Cliente','Tarefa','Execução','Total'].forEach((label,i)=>doc.text(label,starts[i]+2,y+7));y+=16}
 tableHeader()
 for(const person of map.people){
  doc.setFontSize(9);doc.setFont('helvetica','normal');const name=doc.splitTextToSize(person.name,46) as string[],height=Math.max(10,name.length*4.5+5)
  if(y+height>271){doc.addPage();header();tableHeader()}
  doc.setTextColor('#24364b');doc.text(name,starts[0]+2,y)
  const numbers=[time(person.minutes),money(person.client),money(person.task),money(person.execution),money(person.total)]
  numbers.forEach((value,i)=>{doc.setFontSize(i===0?8:7.5);doc.text(value,ends[i+1]-2,y,{align:'right'})})
  y+=height;doc.setDrawColor('#d7e0e5');doc.line(margin,y-4,margin+width,y-4)
 }
 y+=3;text(`Total distribuído às pessoas: ${money(map.people.reduce((n,p)=>n+p.total,0))}`,10,true)
 text(`Despesas do escritório: ${money(map.office)} | Por atribuir: ${money(map.unassigned)}`)
 text('As parcelas acumulam-se quando a mesma pessoa intervém em várias funções. O arredondamento é efectuado por registo ao cêntimo.')
 text('Mapa de análise. Não emite notas de honorários nem regista pagamentos.')
 const pages=doc.getNumberOfPages();for(let page=1;page<=pages;page++){doc.setPage(page);doc.setTextColor('#667782');doc.setFontSize(8);doc.setFont('helvetica','normal');doc.text(`LEGALTEAM | ${date(report.start)} - ${date(report.end)}`,margin,287);doc.text(`${page} / ${pages}`,195,287,{align:'right'})}
 return doc
}
export async function saveAllocationPdf(report:AllocationReport){const doc=await createAllocationPdf(report);doc.save(`legalteam-reparticao-${report.start}-${report.end}.pdf`)}
