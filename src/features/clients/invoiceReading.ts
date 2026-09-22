import {GlobalWorkerOptions,getDocument} from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import {validateClientDocument} from './documentValidation'

GlobalWorkerOptions.workerSrc=pdfWorkerUrl

export const invoiceFileLimit=20*1024*1024

export type InvoiceReading={
  mimeType:string
  pageCount:number
  text:string
  needsVisualRecognition:boolean
}

export function validateInvoiceFile(file:File,bytes:Uint8Array){
  if(file.size<=0)return 'O ficheiro está vazio.'
  if(file.size>invoiceFileLimit)return 'A factura deve ter no máximo 20 MB.'
  const mimeType=validateClientDocument(file.name,bytes)
  if(!mimeType||!['application/pdf','image/jpeg','image/png'].includes(mimeType))return 'Use uma factura em PDF, JPG ou PNG, sem conteúdo activo.'
  return mimeType
}

const pageText=async(page:Awaited<ReturnType<Awaited<ReturnType<typeof getDocument>['promise']>['getPage']>>)=>{
  const content=await page.getTextContent()
  return content.items.map(item=>'str' in item?item.str:'').join(' ').replace(/\s+/g,' ').trim()
}

export async function readInvoiceFile(file:File):Promise<InvoiceReading>{
  const bytes=new Uint8Array(await file.arrayBuffer()),validated=validateInvoiceFile(file,bytes)
  if(validated.startsWith('O ')||validated.startsWith('A ')||validated.startsWith('Use '))throw new Error(validated)
  if(validated!=='application/pdf')return{mimeType:validated,pageCount:1,text:'',needsVisualRecognition:true}
  const document=await getDocument({data:bytes.slice().buffer}).promise
  const pages:string[]=[]
  for(let index=1;index<=document.numPages;index++)pages.push(await pageText(await document.getPage(index)))
  const text=pages.filter(Boolean).join('\n\n')
  return{mimeType:validated,pageCount:document.numPages,text,needsVisualRecognition:text.trim().length===0}
}
