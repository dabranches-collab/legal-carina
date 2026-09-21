import {describe,expect,test} from 'vitest'
import type {FixedFeeLine} from '../clients/fixedFeeAnalytics'
import {mergeFixedFeeAttentionSummaries} from './fixedFeeAttention'

const line=(values:Partial<FixedFeeLine>):FixedFeeLine=>({jobId:'job',entryId:'entry',title:'Visto Gold',clientId:'client',clientName:'Cliente teste',clientType:'individual',mixedClient:false,billingEntityId:'society',billingEntityName:'Sociedade',professionalId:'professional',professionalName:'Responsável',archiveStatus:null,date:'2026-09-21',minutes:30,amount:100,isInvoiced:false,invoiced:0,paid:0,unpaid:0,uninvoiced:100,...values})

describe('resumos de registos a preço fixo',()=>{
 test('soma uma vez o preço repartido e conserva o preço médio por hora',()=>{
  const result=mergeFixedFeeAttentionSummaries({uninvoiced:{minutes:60,amount:145,priced:1,count:1}},[
   line({entryId:'one',minutes:30,amount:66.66,uninvoiced:66.66}),
   line({entryId:'two',minutes:15,amount:33.34,uninvoiced:33.34}),
  ])
  expect(result.uninvoiced).toEqual({minutes:105,amount:245,priced:3,count:3})
  expect(result.uninvoiced.amount*60/result.uninvoiced.minutes).toBe(140)
 })
 test('separa facturado não pago e respeita responsável, sociedade, cliente e ano',()=>{
  const result=mergeFixedFeeAttentionSummaries({},[
   line({isInvoiced:true,invoiced:100,unpaid:75,uninvoiced:0}),
   line({entryId:'other',professionalId:'other'}),
  ],{year:2026,professionalId:'professional',billingEntityId:'society',clientId:'client',clientType:'individual'})
  expect(result.unpaid).toEqual({minutes:30,amount:75,priced:1,count:1})
  expect(result.uninvoiced).toBeUndefined()
 })
 test('não transforma um trabalho sem registos numa linha de registo',()=>{
  expect(mergeFixedFeeAttentionSummaries({},[line({entryId:null,minutes:0})])).toEqual({})
 })
})
