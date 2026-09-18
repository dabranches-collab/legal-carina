import {describe,expect,test} from 'vitest'
import {fixedFeeFinancialPosition} from './fixedFeeFinance'

describe('posição financeira de um trabalho a preço fixo',()=>{
 test('a provisão recebida antes da factura reduz o saldo sem reduzir o preço a facturar',()=>{
  expect(fixedFeeFinancialPosition({agreedAmount:1200,isInvoiced:false,isPaid:false,provisionApplied:400,vatRate:23})).toEqual({
   agreed:1200,invoiced:0,toInvoice:1200,received:325.2,toReceive:874.8,invoicedOutstanding:0,receivedBeforeInvoice:325.2,
   vat:276,totalWithVat:1476,provisionAppliedGross:400,receivedGross:400,toReceiveGross:1076,
  })
 })
 test('após facturar, só o remanescente entra em facturado por receber',()=>{
  expect(fixedFeeFinancialPosition({agreedAmount:1200,isInvoiced:true,isPaid:false,provisionApplied:400,vatRate:23})).toMatchObject({invoiced:1200,received:325.2,toReceive:874.8,invoicedOutstanding:874.8,toReceiveGross:1076})
 })
 test('o pagamento integral não duplica uma provisão já aplicada',()=>{
  expect(fixedFeeFinancialPosition({agreedAmount:1200,isInvoiced:true,isPaid:true,provisionApplied:400,vatRate:23})).toMatchObject({received:1200,receivedGross:1476,toReceive:0,invoicedOutstanding:0,toReceiveGross:0})
 })
 test('recusa um abatimento acima do preço',()=>{
  expect(()=>fixedFeeFinancialPosition({agreedAmount:50,isInvoiced:true,isPaid:false,provisionApplied:61.51,vatRate:23})).toThrow(/excede/)
 })
 test('exige taxa de IVA antes de converter dinheiro da provisão em honorários',()=>{
  expect(()=>fixedFeeFinancialPosition({agreedAmount:50,isInvoiced:false,isPaid:false,provisionApplied:10})).toThrow(/taxa de IVA/)
 })
})
