import {describe,expect,it} from 'vitest'
import {documentGreeting,formalDate,issuerFooterLines} from './formalDocumentShared'
import type {IssuerData} from './formalDocumentPdf'

const issuer={name:'CARINA SANTOS',legal_name:'Carina Santos, Advogada',tax_number:'201739380',address:'Avenida dos Moinhos, 1C, 2610-118 Alfragide',email:null,phone:null,bank_account_holder:null,bank_name:null,bank_account_number:null,iban:null,bic_swift:null,bank_accounts:null,default_vat_rate:23,default_currency:'EUR',logo_path:'carina.png'} as IssuerData

describe('apresentação formal dos documentos',()=>{
 it('escreve a data portuguesa com o mês por extenso',()=>{
  expect(formalDate(new Date(2026,8,15),'pt')).toBe('Alfragide, 15 de Setembro de 2026')
 })
 it('inicia o mês com maiúscula também nas outras línguas das notas e cobranças',()=>{
  expect(formalDate(new Date(2026,8,15),'en')).toBe('Alfragide, 15 September 2026')
  expect(formalDate(new Date(2026,8,15),'fr')).toBe('Alfragide, 15 Septembre 2026')
 })
 it('usa no rodapé da Carina Santos o texto integral da imagem fornecida',()=>{
  expect(issuerFooterLines(issuer,'pt')).toEqual([
   'CP 19372L · NIF 201739380',
   'Avenida dos Moinhos, 1C, 2610-118 Alfragide',
   'carinamarquesdossantos-19372l@adv.oa.pt',
  ])
 })
 it('aplica o tratamento formal escolhido com a pontuação portuguesa correcta',()=>{
  expect(documentGreeting('exmo_senhor','pt','')).toBe('Exmo. Senhor,')
  expect(documentGreeting('exma_senhora','pt','')).toBe('Exma. Senhora,')
  expect(documentGreeting('exmos_senhores','pt','')).toBe('Exmos. Senhores,')
  expect(documentGreeting('exmas_senhoras','pt','')).toBe('Exmas. Senhoras,')
 })
})
