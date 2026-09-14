import {beforeEach,describe,expect,it,vi} from 'vitest'
import {createProvisionNotePdf} from './creditPdf'
import type {CreditAccount,ProvisionNote} from './credit'
const {texts}=vi.hoisted(()=>({texts:[] as string[]}))
vi.mock('jspdf',()=>({jsPDF:class{setFont(){}setFontSize(){}text(text:string|string[]){texts.push(...Array.isArray(text)?text:[text])}splitTextToSize(text:string){return [text]}addPage(){}getNumberOfPages(){return 1}setPage(){}}}))
const account={client_name:'Cliente Sintético',society_name:'Sociedade Sintética',currency:'EUR'} as CreditAccount
const note={number:'NH-QA',issued_at:'2026-09-07',subtotal:100,vat_rate:23,vat:23,total:123,deducted:0,remaining:123,balance_after:0,items:[{id:'work',work_date:'2026-09-01',duration_minutes:60,effective_amount:100,activity_description:'Análise documental'}]} as ProvisionNote
beforeEach(()=>{texts.length=0})
describe('cópias históricas traduzidas',()=>{
 it('usa as traduções guardadas sem regressar às descrições originais',()=>{
  createProvisionNotePdf(account,{...note,document_options:{language:'en',translation:{language:'en',items:[{id:'work',kind:'work',text:'Document review'}]},expenses:[{id:'expense',work_entry_id:'work',amount:5,currency:'EUR',observations:'Registered post'}]}},true)
  const text=texts.join(' ');expect(text).toContain('Fee Note');expect(text).toContain('VOIDED');expect(text).toContain('Document review');expect(text).toContain('Registered post');expect(text).toContain('VAT');expect(text).not.toContain('Análise documental');expect(text).not.toContain('Provisão descontada')
 })
 it('identifica cópias antigas sem traduções em vez de as apresentar como traduzidas',()=>{
  createProvisionNotePdf(account,{...note,document_options:{language:'en'}})
  expect(texts.join(' ')).toContain('Historical original');expect(texts.join(' ')).toContain('Análise documental')
 })
})
