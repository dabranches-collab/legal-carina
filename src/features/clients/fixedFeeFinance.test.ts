import {describe,expect,test} from 'vitest'
import {fixedFeeFinancialPosition} from './fixedFeeFinance'

describe('posição financeira de um trabalho a preço fixo',()=>{
 test('a provisão recebida antes da factura reduz o saldo sem reduzir o preço a facturar',()=>{
  expect(fixedFeeFinancialPosition({agreedAmount:1200,isInvoiced:false,isPaid:false,provisionApplied:400})).toEqual({
   agreed:1200,invoiced:0,toInvoice:1200,received:400,toReceive:800,invoicedOutstanding:0,receivedBeforeInvoice:400,
  })
 })
 test('após facturar, só o remanescente entra em facturado por receber',()=>{
  expect(fixedFeeFinancialPosition({agreedAmount:1200,isInvoiced:true,isPaid:false,provisionApplied:400})).toMatchObject({invoiced:1200,received:400,toReceive:800,invoicedOutstanding:800})
 })
 test('o pagamento integral não duplica uma provisão já aplicada',()=>{
  expect(fixedFeeFinancialPosition({agreedAmount:1200,isInvoiced:true,isPaid:true,provisionApplied:400})).toMatchObject({received:1200,toReceive:0,invoicedOutstanding:0})
 })
 test('recusa um abatimento acima do preço',()=>{
  expect(()=>fixedFeeFinancialPosition({agreedAmount:50,isInvoiced:true,isPaid:false,provisionApplied:50.01})).toThrow(/excede/)
 })
})
