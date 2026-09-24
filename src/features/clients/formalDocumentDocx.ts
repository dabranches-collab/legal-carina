import {AlignmentType,BorderStyle,Document,Footer,ImageRun,Packer,Paragraph,ShadingType,Table,TableCell,TableLayoutType,TableRow,TextRun,VerticalAlign,WidthType,type IParagraphOptions} from 'docx'
import type { ProvisionNote } from './credit'
import { formalCopy, moneyInWords } from './formalDocumentCopy'
import {formalDocumentAmounts,formalDocumentExpenseHeading,formalDocumentMoney,formalDocumentNarrative,formalDocumentTotalLine} from './formalDocumentAmounts'
import {documentCopy,expenseCopy,type Entry,type EntryExpense,type FormalSnapshot,type PdfColumn} from './formalDocumentPdf'
import {documentGreeting,duration,formalDate,issuerFooterLines,monthYear} from './formalDocumentShared'
import {assertIssuerMatchesSociety} from './societyBranding'

const border={style:BorderStyle.SINGLE,size:1,color:'777777'}
const borders={top:border,bottom:border,left:border,right:border,insideHorizontal:border,insideVertical:border}
const cell=(children:Paragraph[],width:number,shading?:string)=>new TableCell({children,width:{size:width,type:WidthType.DXA},verticalAlign:VerticalAlign.CENTER,shading:shading?{fill:shading,type:ShadingType.CLEAR}:undefined,margins:{top:80,bottom:80,left:100,right:100}})
const text=(value:string,bold=false,size=20)=>new TextRun({text:value,bold,size,font:'Arial'})
const para=(value:string,bold=false,options:IParagraphOptions={})=>new Paragraph({...options,children:[text(value,bold)]})
const imageBytes=(data:string)=>Uint8Array.from(atob(data.slice(data.indexOf(',')+1)),character=>character.charCodeAt(0))
const imageDimensions=(data:Uint8Array,type:'png'|'jpg')=>{
 if(type==='png'&&data.length>=24)return {width:new DataView(data.buffer,data.byteOffset,data.byteLength).getUint32(16),height:new DataView(data.buffer,data.byteOffset,data.byteLength).getUint32(20)}
 if(type==='jpg')for(let offset=2;offset+8<data.length;){if(data[offset]!==0xff){offset++;continue}const marker=data[offset+1],length=(data[offset+2]<<8)+data[offset+3];if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker))return {width:(data[offset+7]<<8)+data[offset+8],height:(data[offset+5]<<8)+data[offset+6]};if(length<2)break;offset+=2+length}
 return null
}
export const fitLogoDimensions=(dimensions:{width:number;height:number}|null)=>{if(!dimensions||dimensions.width<=0||dimensions.height<=0)return {width:181,height:121};const scale=Math.min(181/dimensions.width,121/dimensions.height);return {width:Math.max(1,Math.round(dimensions.width*scale)),height:Math.max(1,Math.round(dimensions.height*scale))}}

export async function createFormalDocumentDocx(snapshot:FormalSnapshot,rows:Entry[],expenses:EntryExpense[],note:ProvisionNote|null,isCollection=false){
 const {clientName,clientDocument,issuer,issuerLogo,language,columns,showTimeTotal,showAmountTotal,bankAccounts}=snapshot
 if(snapshot.societyName)assertIssuerMatchesSociety(issuer,snapshot.societyName)
 const copy=documentCopy[language],expenseLabels=expenseCopy[language],formal=formalCopy[language],title=isCollection?copy.collection:copy.honorarium
 const locale=language==='pt'?'pt-PT':language==='fr'?'fr-FR':'en-GB',currency=issuer?.default_currency||'EUR',issueDate=note?new Date(note.issued_at):new Date()
 const vatRate=note?.vat_rate??issuer?.default_vat_rate??23,amounts=formalDocumentAmounts(rows,expenses,note,vatRate,isCollection),subtotal=amounts.subtotal
 const money=(value:number)=>formalDocumentMoney(value,language,currency),hasProvision=Number(note?.deducted??0)>0
 const recipient=clientDocument?.honorarium_recipient_name||clientDocument?.legal_name||clientName
 const logoType=issuerLogo?.startsWith('data:image/png')?'png':'jpg',logoBytes=issuerLogo?imageBytes(issuerLogo):null,logoTransformation=logoBytes?fitLogoDimensions(imageDimensions(logoBytes,logoType)):null
 const headerLeft=issuerLogo&&logoBytes&&logoTransformation?[new Paragraph({children:[new ImageRun({type:logoType,data:logoBytes,transformation:logoTransformation})]})]:[para((issuer?.name||title).toLocaleUpperCase(locale),true)]
 const headerRight=[para(recipient,true,{alignment:AlignmentType.LEFT}),...String(clientDocument?.address||'').split(/\r?\n/).filter(Boolean).map(line=>para(line))]
 const noBorder={style:BorderStyle.NONE,size:0,color:'FFFFFF'}
 const children:(Paragraph|Table)[]=[
  new Table({layout:TableLayoutType.FIXED,width:{size:100,type:WidthType.PERCENTAGE},columnWidths:[4500,4500],borders:{top:noBorder,bottom:noBorder,left:noBorder,right:noBorder,insideHorizontal:noBorder,insideVertical:noBorder},rows:[new TableRow({children:[cell(headerLeft,4500),cell(headerRight,4500)]})]}),
  new Paragraph({spacing:{before:160,after:260},children:[text(formal.delivery[clientDocument?.honorarium_delivery_method||'email'],true),text(`\t${formalDate(issueDate,language)}`)],tabStops:[{type:'right',position:9000}]}),
  para(isCollection?formal.collectionSubject:formal.subject,true,{spacing:{after:260}}),para(documentGreeting(clientDocument?.honorarium_salutation,language,formal.greeting),true,{spacing:{after:180}}),
 ]
 if(note?.number==='RASCUNHO')children.push(para('RASCUNHO — SEM EMISSÃO',true,{spacing:{after:120}}))
 const intro=isCollection?formal.collectionIntro(money(subtotal),moneyInWords(subtotal,language)):formalDocumentNarrative(language,amounts,note,money)
 children.push(para(intro,false,{alignment:AlignmentType.JUSTIFIED,spacing:{after:180}}))
 if(!hasProvision||Number(note?.remaining??amounts.total)>0)for(const [index,account] of bankAccounts.entries()){
  if(bankAccounts.length>1)children.push(para(`${formal.bank} ${index+1}`,true))
  for(const [label,value] of [[formal.account,account.account_holder],[formal.bank,account.bank_name],[formal.number,account.account_number],[formal.iban,account.iban],[formal.swift,account.bic_swift]])if(value)children.push(new Paragraph({indent:{left:600},children:[text(`${label}: `,true),text(value)]}))
 }
 children.push(para(formal.work,true,{spacing:{before:180,after:100}}))
 const widths:Record<PdfColumn,number>={period:1400,description:6100,duration:1400}
 const rowValue=(row:Entry,column:PdfColumn)=>column==='period'?monthYear(row.work_date):column==='description'?row.activity_description:duration(row.duration_minutes)
 children.push(new Table({layout:TableLayoutType.FIXED,width:{size:100,type:WidthType.PERCENTAGE},borders,rows:[new TableRow({tableHeader:true,children:columns.map(column=>cell([para(copy.columns[column],true,{alignment:column==='description'?AlignmentType.LEFT:AlignmentType.CENTER})],widths[column],'EBF1F6'))}),...rows.map(row=>new TableRow({cantSplit:true,children:columns.map(column=>cell([para(rowValue(row,column),false,{alignment:column==='description'?AlignmentType.JUSTIFIED:AlignmentType.CENTER})],widths[column]))}))]}))
 const totalMinutes=rows.reduce((sum,row)=>sum+row.duration_minutes,0),totals=[showTimeTotal?`${copy.timeTotal}: ${duration(totalMinutes)}`:'',showAmountTotal?`${copy.amountTotal}: ${money(subtotal)}`:''].filter(Boolean).join(' · ')
 if(totals)children.push(para(totals,true,{alignment:AlignmentType.RIGHT,spacing:{before:100,after:180}}))
 if(!isCollection&&expenses.length){children.push(para(formalDocumentExpenseHeading(language,amounts.expensesIncluded),true,{spacing:{before:180,after:100}}));children.push(new Table({layout:TableLayoutType.FIXED,width:{size:100,type:WidthType.PERCENTAGE},borders,rows:[new TableRow({tableHeader:true,children:[cell([para(expenseLabels.amount,true)],2100,'EBF1F6'),cell([para(expenseLabels.notes,true)],6900,'EBF1F6')]}),...expenses.map(expense=>new TableRow({cantSplit:true,children:[cell([para(money(expense.amount))],2100),cell([para(expense.observations||'—',false,{alignment:AlignmentType.JUSTIFIED})],6900)]}))]}))}
 if(!isCollection)children.push(para(formalDocumentTotalLine(language,amounts,money),true,{spacing:{before:220,after:180},shading:{fill:'F8F5F2',type:ShadingType.CLEAR}}))
 for(const line of formal.closing)children.push(para(line,false,{spacing:{before:180}}))
 const footerLines=issuer?issuerFooterLines(issuer,language):[]
 const document=new Document({title:`${title} - ${clientName}`,subject:language==='pt'?'Documento editável':'Editable document',sections:[{properties:{page:{margin:{top:850,right:850,bottom:1100,left:850}}},footers:{default:new Footer({children:footerLines.map((line,index)=>new Paragraph({alignment:AlignmentType.CENTER,border:index===0?{top:{style:BorderStyle.SINGLE,size:4,color:'A45C3F',space:5}}:undefined,spacing:{before:index===0?80:0},children:[text(line,false,14)]}))})},children}]})
 return Packer.toBlob(document)
}

export function downloadDocx(blob:Blob,fileName:string){const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=fileName;link.style.display='none';document.body.appendChild(link);link.click();link.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000)}
