import {mkdir,readFile,writeFile} from 'node:fs/promises'
import {inflateRawSync} from 'node:zlib'
import {describe,expect,it} from 'vitest'
import {createFormalDocumentDocx,fitLogoDimensions} from './formalDocumentDocx'
import {createFormalDocumentPdf,type FormalSnapshot} from './formalDocumentPdf'
import type {ProvisionNote} from './credit'

const snapshot:FormalSnapshot={version:1,societyName:'CARINA SANTOS',clientName:'Cliente QA',clientDocument:{legal_name:'Cliente QA, Lda.',address:'Rua de Teste, 1\n1000-001 Lisboa',honorarium_language:'pt',honorarium_delivery_method:'email',honorarium_recipient_name:'Carla Teste',honorarium_salutation:'exma_senhora',default_billing_entity_id:'society-qa'},issuer:{id:'society-qa',name:'CARINA SANTOS',legal_name:'Carina Santos',tax_number:'201739380',address:'Avenida dos Moinhos, 1C, 2610-118 Alfragide',email:'carinamarquesdossantos-19372l@adv.oa.pt',phone:null,bank_account_holder:'Carina Santos',bank_name:'Banco QA',bank_account_number:null,iban:'PT50000000000000000000000',bic_swift:'QAPTPPL',bank_accounts:null,default_vat_rate:23,default_currency:'EUR',logo_path:null},issuerLogo:null,language:'pt',columns:['period','description','duration'],showTimeTotal:true,showAmountTotal:true,bankAccounts:[{account_holder:'Carina Santos',bank_name:'Banco QA',account_number:'',iban:'PT50000000000000000000000',bic_swift:'QAPTPPL',currency:'EUR'}]}
const rows=Array.from({length:12},(_,index)=>({id:`row-${index}`,work_date:'2026-09-04',activity_description:`Intervenção jurídica de teste ${index+1}`,duration_minutes:60,professional_name:'Advogada QA',billing_entity_name:'CARINA SANTOS',effective_amount:100,status:'approved'}))
const note={number:'NH-QA-1',revision:1,issued_at:'2026-09-04T12:00:00Z',subtotal:1200,vat:276,vat_rate:23,total:1476,deducted:0,remaining:1476,balance_after:0} as ProvisionNote

async function wordXml(blob:Blob){
 const bytes=Buffer.from(await blob.arrayBuffer())
 for(let offset=0;offset+46<bytes.length;offset++){
  if(bytes.readUInt32LE(offset)!==0x02014b50)continue
  const nameLength=bytes.readUInt16LE(offset+28),extraLength=bytes.readUInt16LE(offset+30),commentLength=bytes.readUInt16LE(offset+32)
  const name=bytes.subarray(offset+46,offset+46+nameLength).toString('utf8')
  if(name==='word/document.xml'){
   const method=bytes.readUInt16LE(offset+10),size=bytes.readUInt32LE(offset+20),local=bytes.readUInt32LE(offset+42)
   const dataStart=local+30+bytes.readUInt16LE(local+26)+bytes.readUInt16LE(local+28)
   const data=bytes.subarray(dataStart,dataStart+size)
   return(method===8?inflateRawSync(data):data).toString('utf8')
  }
  offset+=45+nameLength+extraLength+commentLength
 }
 throw new Error('Conteúdo Word não encontrado.')
}

describe('createFormalDocumentDocx',()=>{
 it.each([['pt','Melhores cumprimentos','Sem mais de momento,'],['en','Kind regards,','Yours faithfully,']] as const)('omite o resumo final e usa o fecho %s no PDF e no Word',async(language,closing,oldClosing)=>{
  const presentation={...snapshot,language},financialNote={...note,document_options:{direct_payment:{amount:3566}},deducted:1968,remaining:0,balance_after:0} as ProvisionNote
  const pdf=createFormalDocumentPdf(presentation,rows,[],financialNote).output()
  const word=await wordXml(await createFormalDocumentDocx(presentation,rows,[],financialNote))
  for(const output of [pdf,word]){
   expect(output).toContain(closing)
   expect(output).not.toContain(oldClosing)
   expect(output).not.toContain(language==='pt'?'Nota: NH-QA-1':'Note: NH-QA-1')
   expect(output).not.toContain(language==='pt'?'Pagamento directo recebido':'Direct payment received')
   expect(output).not.toContain(language==='pt'?'Saldo de provisão após esta nota':'Advance balance after this note')
  }
 })
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
