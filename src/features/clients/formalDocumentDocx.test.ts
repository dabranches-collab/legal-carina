import {mkdir,readFile,writeFile} from 'node:fs/promises'
import {inflateRawSync} from 'node:zlib'
import {describe,expect,it} from 'vitest'
import {createFormalDocumentDocx,fitLogoDimensions} from './formalDocumentDocx'
import {createFormalDocumentPdf,type FormalSnapshot} from './formalDocumentPdf'
import {formalDocumentAmounts,formalDocumentMoney,formalDocumentTotalLine} from './formalDocumentAmounts'
import type {ProvisionNote} from './credit'

const snapshot:FormalSnapshot={version:1,societyName:'SOCIEDADE QA',clientName:'Cliente QA',clientDocument:{legal_name:'Cliente QA, Lda.',address:'Rua de Teste, 1\n1000-001 Lisboa',honorarium_language:'pt',honorarium_delivery_method:'email',honorarium_recipient_name:'Carla Teste',honorarium_salutation:'exma_senhora',default_billing_entity_id:'society-qa'},issuer:{id:'society-qa',name:'SOCIEDADE QA',legal_name:'Sociedade de Teste, Lda.',tax_number:'500000000',address:'Rua de Teste, 10, 1000-001 Lisboa',email:'documentos@example.test',phone:null,bank_account_holder:'Sociedade de Teste, Lda.',bank_name:'Banco QA',bank_account_number:null,iban:'PT50000000000000000000000',bic_swift:'QAPTPPL',bank_accounts:null,default_vat_rate:23,default_currency:'EUR',logo_path:null},issuerLogo:null,language:'pt',columns:['period','description','duration'],showTimeTotal:true,showAmountTotal:true,bankAccounts:[{account_holder:'Sociedade de Teste, Lda.',bank_name:'Banco QA',account_number:'',iban:'PT50000000000000000000000',bic_swift:'QAPTPPL',currency:'EUR'}]}
const rows=Array.from({length:12},(_,index)=>({id:`row-${index}`,work_date:'2026-09-04',activity_description:`Intervenção jurídica de teste ${index+1}`,duration_minutes:60,professional_name:'Advogada QA',billing_entity_name:'SOCIEDADE QA',effective_amount:100,status:'approved'}))
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
 it('apresenta 15 registos e 3 despesas num rascunho demonstrativo, com descrições justificadas',async()=>{
  const activities=[
   'Consulta inicial e levantamento dos elementos necessários',
   'Análise dos documentos de identificação e representação',
   'Reunião para definição da estratégia e dos prazos',
   'Pesquisa de legislação e jurisprudência aplicável',
   'Preparação do mandato e da documentação de suporte',
   'Revisão das declarações e dos comprovativos recebidos',
   'Elaboração da primeira versão do requerimento',
   'Conferência do requerimento com os documentos anexos',
   'Contacto com a entidade competente para esclarecimentos',
   'Submissão do requerimento e confirmação da recepção',
   'Acompanhamento do processo e verificação dos prazos',
   'Preparação da resposta ao pedido de elementos adicionais',
   'Revisão da resposta e organização dos anexos finais',
   'Reunião de actualização com o cliente sobre o processo',
   'Conferência final e comunicação das próximas diligências',
  ]
  const demoRows=activities.map((activity,index)=>({...rows[0],id:`demo-work-${index+1}`,work_date:`2026-${String(1+Math.floor(index/2)).padStart(2,'0')}-15`,activity_description:`${activity}. Foram analisados os elementos disponíveis e registadas as diligências necessárias para a fase seguinte do assunto.`,duration_minutes:30+15*(index%4),effective_amount:200}))
  const demoExpenses=[
   {id:'demo-expense-1',work_entry_id:demoRows[2].id,amount:120,currency:'EUR',observations:'Custas de apresentação e tramitação do requerimento, pelo valor total suportado.'},
   {id:'demo-expense-2',work_entry_id:demoRows[7].id,amount:95,currency:'EUR',observations:'Certidões e cópias necessárias à instrução do processo, pelo valor total suportado.'},
   {id:'demo-expense-3',work_entry_id:demoRows[12].id,amount:85,currency:'EUR',observations:'Deslocação relacionada com a diligência, pelo valor total acordado com o cliente.'},
  ]
  const amounts=formalDocumentAmounts(demoRows,demoExpenses,null,23)
  expect(amounts).toMatchObject({subtotal:3000,vat:690,expenseTotal:300,total:3990})
  const demoNote={...note,number:'RASCUNHO',subtotal:amounts.subtotal,vat:amounts.vat,total:amounts.total,remaining:amounts.total,document_options:{expenses_included:true,expenses:demoExpenses}}
  const pdf=createFormalDocumentPdf(snapshot,demoRows,demoExpenses,demoNote)
  expect(pdf.getNumberOfPages()).toBeGreaterThanOrEqual(2)
  const word=await wordXml(await createFormalDocumentDocx(snapshot,demoRows,demoExpenses,demoNote))
  expect(word).toContain('€3.990,00')
  expect((word.match(/w:val="both"/g)??[]).length).toBeGreaterThanOrEqual(16)
  for(const activity of activities)expect(word).toContain(activity)
  for(const expense of demoExpenses)expect(word).toContain(expense.observations)
  if(process.env.WRITE_DOCUMENT_QA==='1'){
   await mkdir('output/pdf',{recursive:true})
   await writeFile('output/pdf/nota-honorarios-demo-15-registos-3-despesas.pdf',Buffer.from(pdf.output('arraybuffer')))
  }
 })
 it('soma despesas apenas nas novas notas e mantém as versões antigas com o total guardado',async()=>{
  const expenses=[{id:'expense-1',work_entry_id:'row-0',amount:399,currency:'EUR',observations:'Custas e certidões'}]
  const amountRows=[{...rows[0],effective_amount:6600,activity_description:'Análise detalhada da documentação apresentada, preparação de requerimento e conferência com o cliente sobre os passos seguintes do processo.'}]
  const amounts=formalDocumentAmounts(amountRows,expenses,null,23)
  expect(amounts).toMatchObject({subtotal:6600,vat:1518,expenseTotal:399,total:8517})
  expect(formalDocumentTotalLine('pt',amounts,value=>formalDocumentMoney(value,'pt','EUR'))).toContain('€6.600,00 + IVA + Despesas = €8.517,00')
  const newNote={...note,subtotal:6600,vat:1518,total:8517,document_options:{expenses_included:true,expenses}}
  if(process.env.WRITE_DOCUMENT_QA==='1'){
   await mkdir('output/pdf',{recursive:true})
   await writeFile('output/pdf/nota-honorarios-rascunho-sintetico.pdf',Buffer.from(createFormalDocumentPdf(snapshot,amountRows,expenses,{...newNote,number:'RASCUNHO'}).output('arraybuffer')))
  }
  const word=await wordXml(await createFormalDocumentDocx(snapshot,amountRows,expenses,newNote))
  expect(word).toContain('€8.517,00')
  expect(word).toContain('Custas e certidões')
  expect(word).not.toContain('09-2026 · Análise detalhada')
  expect(word).toContain('w:val="both"')
  const oldNote={...note,subtotal:6600,vat:1518,total:8118,document_options:{expenses}}
  expect(formalDocumentAmounts(amountRows,expenses,oldNote,23)).toMatchObject({expenseTotal:0,total:8118})
 })
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
