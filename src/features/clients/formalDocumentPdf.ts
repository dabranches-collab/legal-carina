import { jsPDF } from 'jspdf'
import {assertIssuerMatchesSociety} from './societyBranding'
import type { ProvisionNote } from './credit'
import { formalCopy, moneyInWords } from './formalDocumentCopy'
import {formalDocumentAmounts,formalDocumentExpenseHeading,formalDocumentMoney,formalDocumentNarrative,formalDocumentTotalLine} from './formalDocumentAmounts'
import {formatDate} from '../../utils/date'
import {documentGreeting,duration,formalDate,issuerFooterLines,monthYear,type HonorariumSalutation} from './formalDocumentShared'
export type Entry={id:string;work_date:string;activity_description:string;duration_minutes:number;professional_name:string;billing_entity_name:string|null;billing_entity_id?:string;effective_amount:number|null;status?:string;is_invoiced?:boolean;is_paid?:boolean}
export type EntryExpense={id:string;work_entry_id:string;amount:number;currency:string;observations:string|null}
export type SearchResult={items:Entry[];total:number;pageSize?:number}
export type PdfColumn='period'|'description'|'duration'
const pdfColumnLabels:Record<PdfColumn,string>={period:'Mês/Ano',description:'Descrição do movimento',duration:'Tempo'}
export type DocumentLanguage='pt'|'en'|'fr'
export type ClientDocumentData={legal_name:string|null;address:string|null;honorarium_language:DocumentLanguage;honorarium_delivery_method:'email'|'post'|'hand';honorarium_recipient_name:string|null;honorarium_salutation?:HonorariumSalutation|null;default_billing_entity_id:string|null}
export type BankAccount={account_holder:string;bank_name:string;account_number:string;iban:string;bic_swift:string;currency:string}
export type IssuerData={id?:string;name:string;legal_name:string|null;tax_number:string|null;address:string|null;email:string|null;phone:string|null;bank_account_holder:string|null;bank_name:string|null;bank_account_number:string|null;iban:string|null;bic_swift:string|null;bank_accounts:BankAccount[]|null;default_vat_rate:number;default_currency:string;logo_path:string|null}
export const documentCopy={
 pt:{honorarium:'Nota de Honorários',collection:'Cobrança',client:'Cliente',columns:pdfColumnLabels,timeTotal:'Tempo total',amountTotal:'Valor total',honorariumFile:'nota-honorarios',collectionFile:'cobranca'},
 en:{honorarium:'Fee Note',collection:'Collection Notice',client:'Client',columns:{period:'Month/Year',description:'Work description',duration:'Time'} as Record<PdfColumn,string>,timeTotal:'Total time',amountTotal:'Total amount',honorariumFile:'fee-note',collectionFile:'collection-notice'},
 fr:{honorarium:"Note d'honoraires",collection:'Relance de paiement',client:'Client',columns:{period:'Mois/Année',description:'Description des prestations',duration:'Temps'} as Record<PdfColumn,string>,timeTotal:'Temps total',amountTotal:'Montant total',honorariumFile:'note-honoraires',collectionFile:'relance-paiement'},
} as const
export const expenseCopy:Record<DocumentLanguage,{heading:string;amount:string;notes:string}>={
 pt:{heading:'Despesas suportadas',amount:'Montante',notes:'Observações'},
 en:{heading:'Expenses incurred',amount:'Amount',notes:'Notes'},
 fr:{heading:'Frais engagés',amount:'Montant',notes:'Observations'},
}

export const filePart=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-|-$/g,'').toLowerCase()||'cliente'
export const fileDate=(value:Date)=>formatDate(value,'')
export const downloadPdf=(doc:jsPDF,fileName:string)=>{const url=URL.createObjectURL(doc.output('blob')),link=document.createElement('a');link.href=url;link.download=fileName;link.style.display='none';document.body.appendChild(link);link.click();link.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000)}

export type FormalSnapshot={version:1;societyName?:string;clientName:string;clientDocument:ClientDocumentData|null;issuer:IssuerData|null;issuerLogo:string|null;language:DocumentLanguage;columns:PdfColumn[];showTimeTotal:boolean;showAmountTotal:boolean;bankAccounts:BankAccount[]}
export function createFormalDocumentPdf(snapshot:FormalSnapshot,pdfRows:Entry[],pdfExpenses:EntryExpense[],provisionNote:ProvisionNote|null,isCollection=false){
 const {clientName,clientDocument,issuer,issuerLogo,language:documentLanguage,columns:pdfColumns,showTimeTotal,showAmountTotal,bankAccounts:chosenBankAccounts}=snapshot
 if(snapshot.societyName)assertIssuerMatchesSociety(issuer,snapshot.societyName)
 const copy=documentCopy[documentLanguage],expenseLabelsCopy=expenseCopy[documentLanguage],documentTitle=isCollection?copy.collection:copy.honorarium,eligibleLabel=isCollection?'facturados e não pagos':'do cliente'
 const totalMinutes=pdfRows.reduce((sum,row)=>sum+row.duration_minutes,0),documentVatRate=provisionNote?.vat_rate??issuer?.default_vat_rate??23,chosenExpenses=pdfExpenses
 const amounts=formalDocumentAmounts(pdfRows,pdfExpenses,provisionNote,documentVatRate,isCollection),totalAmount=amounts.subtotal
   const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'}),margin=15,pageWidth=210,contentWidth=pageWidth-margin*2,contentBottom=272
   const fixedWidths:Record<PdfColumn,number>={period:25,description:0,duration:23}
   const nonDescriptionWidth=pdfColumns.filter(column=>column!=='description').reduce((sum,column)=>sum+fixedWidths[column],0)
   const columnWidths=pdfColumns.map(column=>column==='description'?Math.max(45,contentWidth-nonDescriptionWidth):fixedWidths[column])
   const rowValue=(row:Entry,column:PdfColumn)=>column==='period'?monthYear(row.work_date):column==='description'?row.activity_description:duration(row.duration_minutes)
   let y=18
   const locale=documentLanguage==='pt'?'pt-PT':documentLanguage==='fr'?'fr-FR':'en-GB',issueDate=provisionNote?new Date(provisionNote.issued_at):new Date()
   const currency=issuer?.default_currency||'EUR',formatMoney=(value:number)=>formalDocumentMoney(value,documentLanguage,currency),appliedProvision=Number(provisionNote?.deducted??0)>0?provisionNote:null
   const formal=formalCopy[documentLanguage]
   const tableHeading=()=>{doc.setFontSize(8);doc.setFillColor(235,241,246);doc.rect(margin,y,contentWidth,7,'F');let x=margin;pdfColumns.forEach((column,index)=>{const align=column==='period'||column==='duration'?'center':'left';doc.text(copy.columns[column],align==='center'?x+columnWidths[index]/2:x+2,y+4.8,{align});x+=columnWidths[index]});y+=7}
   const writeBankDetails=()=>{if(!issuer)return;doc.setFontSize(9);for(const [accountIndex,account] of chosenBankAccounts.entries()){if(chosenBankAccounts.length>1){doc.setFont('helvetica','bold');doc.text(`${formal.bank} ${accountIndex+1}`,margin+18,y);y+=4.2}const bankRows=[[formal.account,account.account_holder],[formal.bank,account.bank_name],[formal.number,account.account_number],[formal.iban,account.iban],[formal.swift,account.bic_swift]].filter((row):row is [string,string]=>Boolean(row[1]));for(const [label,value] of bankRows){doc.setFont('helvetica','bold');doc.text(label,margin+18,y);doc.setFont('helvetica','normal');doc.text(value,margin+62,y);y+=4.2}y+=2}}
   const addLogo=(top:number,maxWidth=30,maxHeight=22)=>{if(!issuerLogo)return 0;const image=doc.getImageProperties(issuerLogo),scale=Math.min(maxWidth/image.width,maxHeight/image.height),width=image.width*scale,height=image.height*scale;doc.addImage(issuerLogo,image.fileType,margin,top,width,height,undefined,'FAST');return height}
   const heading=()=>{const top=issuerLogo?Math.max(7,y-7):y,logoHeight=addLogo(top,48,32);doc.setFont('helvetica','bold');doc.setFontSize(15);if(!issuerLogo)doc.text((issuer?.name||documentTitle).toLocaleUpperCase(locale),pageWidth/2,y,{align:'center'});let recipientY=y+(issuerLogo?2:10);doc.setFontSize(10);const recipient=clientDocument?.honorarium_recipient_name||clientDocument?.legal_name||clientName;doc.text(recipient,margin+contentWidth*.52,recipientY);recipientY+=5;doc.setFont('helvetica','normal');for(const line of String(clientDocument?.address||'').split(/\r?\n/).filter(Boolean)){doc.text(line,margin+contentWidth*.52,recipientY);recipientY+=4.5}y=Math.max(recipientY+5,top+logoHeight+4);doc.setFont('helvetica','bold');doc.text(formal.delivery[clientDocument?.honorarium_delivery_method||'email'],margin,y);doc.setFont('helvetica','normal');doc.text(formalDate(issueDate,documentLanguage),margin+contentWidth*.52,y);y+=10;doc.setFont('helvetica','bold');doc.text(isCollection?formal.collectionSubject:formal.subject,margin,y);if(provisionNote?.number==='RASCUNHO'){doc.setTextColor(165,36,36);doc.text('RASCUNHO — SEM EMISSÃO',pageWidth-margin,y,{align:'right'});doc.setTextColor(0,0,0)}y+=10;doc.text(documentGreeting(clientDocument?.honorarium_salutation,documentLanguage,formal.greeting),margin,y);y+=8;doc.setFont('helvetica','normal');const intro=isCollection?formal.collectionIntro(formatMoney(totalAmount),moneyInWords(totalAmount,documentLanguage)):formalDocumentNarrative(documentLanguage,amounts,provisionNote,formatMoney);const introLines=doc.splitTextToSize(intro,contentWidth) as string[];doc.text(introLines,margin,y,{align:'justify',maxWidth:contentWidth});y+=introLines.length*4.2+4;if(!appliedProvision||appliedProvision.remaining>0)writeBankDetails();doc.setFont('helvetica','bold');doc.text(formal.work,margin,y);y+=5;tableHeading()}
   const continuationHeading=()=>{y=15;const logoTop=8,logoHeight=addLogo(logoTop,28.8,21.6);doc.setFont('helvetica','bold');doc.setFontSize(11);if(!issuerLogo)doc.text((issuer?.name||documentTitle).toLocaleUpperCase(locale),pageWidth/2,y,{align:'center'});y=issuerLogo?logoTop+logoHeight+5:y+8}
   const newContentPage=()=>{doc.addPage();continuationHeading();doc.setFont('helvetica','normal');doc.setFontSize(9)}
   const ensureSpace=(height:number)=>{if(y+height>contentBottom)newContentPage()}
   const nextPage=(height:number)=>{if(y+height<=contentBottom)return;newContentPage();tableHeading();doc.setFont('helvetica','normal');doc.setFontSize(9)}
   heading();doc.setFont('helvetica','normal');doc.setFontSize(9)
   for(const row of pdfRows){
    const descriptionIndex=pdfColumns.indexOf('description'),descriptionWidth=descriptionIndex>=0?columnWidths[descriptionIndex]-4:0,lines=descriptionIndex>=0?doc.splitTextToSize(row.activity_description,descriptionWidth) as string[]:['']
    let offset=0
    do{nextPage(6);const capacity=Math.max(1,Math.floor((contentBottom-y-2)/4)),part=lines.slice(offset,offset+capacity),height=Math.max(6,part.length*4+2);doc.rect(margin,y,contentWidth,height);let x=margin
     pdfColumns.forEach((column,index)=>{const align=column==='period'||column==='duration'?'center':'left',value=column==='description'?part:column==='duration'&&offset>0?'':rowValue(row,column);doc.text(value,align==='center'?x+columnWidths[index]/2:x+2,y+4.2,{align:column==='description'?'justify':align,maxWidth:column==='description'?columnWidths[index]-4:undefined});x+=columnWidths[index]});y+=height;offset+=Math.max(1,part.length)
    }while(offset<lines.length)
   }
   if(showTimeTotal||showAmountTotal){nextPage(9);doc.setFont('helvetica','bold');doc.rect(margin,y,contentWidth,8);const totals=[showTimeTotal?`${copy.timeTotal}: ${duration(totalMinutes)}`:'',showAmountTotal?`${copy.amountTotal}: ${formatMoney(totalAmount)}`:''].filter(Boolean).join('   ·   ');doc.text(totals,pageWidth-margin-2,y+5.3,{align:'right'});y+=11}
   if(!isCollection&&chosenExpenses.length){
    y+=4
    const expenseWidths=[42,contentWidth-42],expenseLabels=[expenseLabelsCopy.amount,expenseLabelsCopy.notes]
    const expenseHeading=()=>{doc.setFont('helvetica','bold');doc.setFontSize(10);doc.text(formalDocumentExpenseHeading(documentLanguage,amounts.expensesIncluded),margin,y);y+=6;doc.setFontSize(8);doc.setFillColor(235,241,246);doc.rect(margin,y,contentWidth,8,'F');doc.text(expenseLabels[0],margin+expenseWidths[0]/2,y+5.3,{align:'center'});doc.text(expenseLabels[1],margin+expenseWidths[0]+2,y+5.3);y+=8}
    const expensePage=(height:number)=>{if(y+height<=contentBottom)return;newContentPage();expenseHeading()}
    ensureSpace(20);expenseHeading();doc.setFont('helvetica','normal');doc.setFontSize(8)
    for(const expense of pdfExpenses){
     const noteLines=doc.splitTextToSize(expense.observations||'—',expenseWidths[1]-4) as string[]
     let offset=0
     do{expensePage(8);const capacity=Math.max(1,Math.floor((contentBottom-y-3)/4)),part=noteLines.slice(offset,offset+capacity),height=Math.max(8,part.length*4+3);doc.rect(margin,y,contentWidth,height);if(offset===0)doc.text(formatMoney(expense.amount),margin+expenseWidths[0]/2,y+5,{align:'center'});doc.text(part,margin+expenseWidths[0]+2,y+5,{align:'justify',maxWidth:expenseWidths[1]-4});y+=height;offset+=Math.max(1,part.length)}while(offset<noteLines.length)
    }
    y+=6
   }
   if(!isCollection){doc.setFont('helvetica','bold');doc.setFontSize(10);const totalLines=doc.splitTextToSize(formalDocumentTotalLine(documentLanguage,amounts,formatMoney),contentWidth-8) as string[],boxHeight=totalLines.length*4.7+8;ensureSpace(boxHeight+7);doc.setFillColor(248,245,242);doc.rect(margin,y,contentWidth,boxHeight,'F');doc.text(totalLines,margin+4,y+6);y+=boxHeight+7}
   ensureSpace(20);doc.setFont('helvetica','normal');for(const line of formal.closing){doc.text(line,margin,y);y+=8}if(issuer){const footer=issuerFooterLines(issuer,documentLanguage);for(let page=1;page<=doc.getNumberOfPages();page++){doc.setPage(page);doc.setFont('helvetica','normal');doc.setFontSize(7);doc.setFillColor(164,92,63);doc.rect(margin,276,contentWidth,.35,'F');footer.forEach((line,index)=>doc.text(line,pageWidth/2,280.5+index*3.5,{align:'center',maxWidth:contentWidth}))}}doc.setProperties({title:`${documentTitle} - ${clientName}`,subject:documentLanguage==='pt'?`Movimentos ${eligibleLabel} seleccionados`:documentLanguage==='fr'?'Prestations sélectionnées':'Selected work entries'});return doc
}
