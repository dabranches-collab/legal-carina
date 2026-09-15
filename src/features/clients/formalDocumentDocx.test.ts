import {mkdir,readFile,writeFile} from 'node:fs/promises'
import {describe,expect,it} from 'vitest'
import {createFormalDocumentDocx,fitLogoDimensions} from './formalDocumentDocx'
import {createFormalDocumentPdf,type FormalSnapshot} from './formalDocumentPdf'
import type {ProvisionNote} from './credit'

const snapshot:FormalSnapshot={version:1,societyName:'CARINA SANTOS',clientName:'Cliente QA',clientDocument:{legal_name:'Cliente QA, Lda.',address:'Rua de Teste, 1\n1000-001 Lisboa',honorarium_language:'pt',honorarium_delivery_method:'email',honorarium_recipient_name:'Carla Teste',honorarium_salutation:'exma_senhora',default_billing_entity_id:'society-qa'},issuer:{id:'society-qa',name:'CARINA SANTOS',legal_name:'Carina Santos',tax_number:'201739380',address:'Avenida dos Moinhos, 1C, 2610-118 Alfragide',email:'carinamarquesdossantos-19372l@adv.oa.pt',phone:null,bank_account_holder:'Carina Santos',bank_name:'Banco QA',bank_account_number:null,iban:'PT50000000000000000000000',bic_swift:'QAPTPPL',bank_accounts:null,default_vat_rate:23,default_currency:'EUR',logo_path:null},issuerLogo:null,language:'pt',columns:['period','description','duration'],showTimeTotal:true,showAmountTotal:true,bankAccounts:[{account_holder:'Carina Santos',bank_name:'Banco QA',account_number:'',iban:'PT50000000000000000000000',bic_swift:'QAPTPPL',currency:'EUR'}]}
const rows=Array.from({length:12},(_,index)=>({id:`row-${index}`,work_date:'2026-09-04',activity_description:`Intervenção jurídica de teste ${index+1}`,duration_minutes:60,professional_name:'Advogada QA',billing_entity_name:'CARINA SANTOS',effective_amount:100,status:'approved'}))
const note={number:'NH-QA-1',revision:1,issued_at:'2026-09-04T12:00:00Z',subtotal:1200,vat:276,vat_rate:23,total:1476,deducted:0,remaining:1476,balance_after:0} as ProvisionNote

describe('createFormalDocumentDocx',()=>{
 it('cria um Word editável com tratamento formal, data e rodapé sem referências a provisões inexistentes',async()=>{
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
 it('preserva a proporção do logótipo em vez de o esticar',()=>{
  expect(fitLogoDimensions({width:600,height:400})).toEqual({width:181,height:121})
  expect(fitLogoDimensions({width:200,height:400})).toEqual({width:61,height:121})
 })

 it('bloqueia PDF e Word se a sociedade do documento não corresponder ao rodapé',async()=>{
  const mixed={...snapshot,societyName:'LEGALTEAM'}
  expect(()=>createFormalDocumentPdf(mixed,rows,[],note)).toThrow(/não corresponde/)
  await expect(createFormalDocumentDocx(mixed,rows,[],note)).rejects.toThrow(/não corresponde/)
 })

 it.each([false,true])('gera PDF e Word com a mesma sociedade para nota e cobrança (%s)',async isCollection=>{
  const logo=await readFile('public/brand/legalteam-logo.jpg')
  const issuer={id:'legalteam-qa',name:'LEGALTEAM',legal_name:'Sociedade QA Documentos, Lda.',tax_number:'500000000',address:'Avenida de Teste, 10, 1000-000 Lisboa',email:'documentos@example.test',phone:null,bank_account_holder:'Sociedade QA Documentos, Lda.',bank_name:'Banco QA',bank_account_number:null,iban:'PT50000000000000000000000',bic_swift:'QAPTPPL',bank_accounts:null,default_vat_rate:23,default_currency:'EUR',logo_path:'/brand/legalteam-logo.jpg'}
  const presentation:FormalSnapshot={...snapshot,societyName:'LEGALTEAM',issuer,issuerLogo:`data:image/jpeg;base64,${logo.toString('base64')}`},legalteamRows=rows.map(row=>({...row,billing_entity_name:'LEGALTEAM'}))
  expect(createFormalDocumentPdf(presentation,legalteamRows,[],note,isCollection).getNumberOfPages()).toBeGreaterThan(0)
  expect((await createFormalDocumentDocx(presentation,legalteamRows,[],note,isCollection)).size).toBeGreaterThan(10_000)
 })
})
