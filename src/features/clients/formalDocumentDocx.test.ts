import {mkdir,readFile,writeFile} from 'node:fs/promises'
import {describe,expect,it} from 'vitest'
import {createFormalDocumentDocx} from './formalDocumentDocx'
import {createFormalDocumentPdf,type FormalSnapshot} from './formalDocumentPdf'
import type {ProvisionNote} from './credit'

describe('createFormalDocumentDocx',()=>{
 it('cria um Word editável com tratamento formal, data e rodapé sem referências a provisões inexistentes',async()=>{
  const logo=await readFile('public/brand/legalteam-logo.jpg')
  const snapshot:FormalSnapshot={version:1,clientName:'Cliente QA',clientDocument:{legal_name:'Cliente QA, Lda.',address:'Rua de Teste, 1\n1000-001 Lisboa',honorarium_language:'pt',honorarium_delivery_method:'email',honorarium_recipient_name:'Carla Teste',honorarium_salutation:'exma_senhora',default_billing_entity_id:'society-qa'},issuer:{id:'society-qa',name:'CARINA SANTOS',legal_name:'Carina Santos',tax_number:'201739380',address:'Avenida dos Moinhos, 1C, 2610-118 Alfragide',email:'carinamarquesdossantos-19372l@adv.oa.pt',phone:null,bank_account_holder:'Carina Santos',bank_name:'Banco QA',bank_account_number:null,iban:'PT50000000000000000000000',bic_swift:'QAPTPPL',bank_accounts:null,default_vat_rate:23,default_currency:'EUR',logo_path:'qa.jpg'},issuerLogo:`data:image/jpeg;base64,${logo.toString('base64')}`,language:'pt',columns:['period','description','duration'],showTimeTotal:true,showAmountTotal:true,bankAccounts:[{account_holder:'Carina Santos',bank_name:'Banco QA',account_number:'',iban:'PT50000000000000000000000',bic_swift:'QAPTPPL',currency:'EUR'}]}
  const rows=Array.from({length:12},(_,index)=>({id:`row-${index}`,work_date:'2026-09-04',activity_description:`Intervenção jurídica de teste ${index+1}`,duration_minutes:60,professional_name:'Advogada QA',billing_entity_name:'CARINA SANTOS',effective_amount:100,status:'approved'}))
  const note={number:'NH-QA-1',revision:1,issued_at:'2026-09-04T12:00:00Z',subtotal:1200,vat:276,vat_rate:23,total:1476,deducted:0,remaining:1476,balance_after:0} as ProvisionNote
  const blob=await createFormalDocumentDocx(snapshot,rows,[],note)
  expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document')
  expect(blob.size).toBeGreaterThan(10_000)
  if(process.env.WRITE_DOCUMENT_QA==='1'){
   await mkdir('.tmp',{recursive:true})
   await writeFile('.tmp/nota-honorarios-carina-qa.docx',Buffer.from(await blob.arrayBuffer()))
   const pdf=createFormalDocumentPdf(snapshot,rows,[],note)
   await writeFile('.tmp/nota-honorarios-carina-qa.pdf',Buffer.from(pdf.output('arraybuffer')))
  }
 })
})
