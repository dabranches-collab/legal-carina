import {describe,expect,test} from 'vitest'
import {buildFixedFeeLines,type FixedFeeJob} from '../clients/fixedFeeAnalytics'
import {mergeFixedFeeMetrics,mergeFixedFeeSeries} from './fixedFeeDashboard'

const job:FixedFeeJob={id:'job',client_id:'client',billing_entity_id:'society',title:'Peça sintética',agreed_amount:1200,currency:'EUR',vat_rate:23,status:'open',is_invoiced:false,is_paid:false,invoice_date:null,created_at:'2026-09-01T00:00:00Z'}
const work=[{id:'a',fixed_fee_job_id:'job',professional_id:'one',work_date:'2026-09-02',duration_minutes:30},{id:'b',fixed_fee_job_id:'job',professional_id:'two',work_date:'2026-09-03',duration_minutes:90}]
const metrics={minutes:120,total:0,invoiced:0,paid:0,pending:0,averageRate:0,uninvoicedCount:2,unpaidCount:0,missingPrice:2}

describe('integração do preço fixo no resumo de entidades',()=>{
 test('soma o preço uma vez e mantém as horas dos registos sem os contar como sem preço',()=>{
  const result=mergeFixedFeeMetrics(metrics,buildFixedFeeLines([job],work))
  expect(result).toMatchObject({minutes:120,total:1200,invoiced:0,paid:0,pending:0,averageRate:600,uninvoicedCount:1,unpaidCount:0,missingPrice:0})
 })
 test('uma provisão parcial com IVA conta só a base recebida e o remanescente facturado',()=>{
  const result=mergeFixedFeeMetrics(metrics,buildFixedFeeLines([{...job,is_invoiced:true,invoice_date:'2026-09-04',provision_applied:400}],work))
  expect(result).toMatchObject({total:1200,invoiced:1200,paid:325.2,pending:874.8,uninvoicedCount:0,unpaidCount:1,missingPrice:0})
 })
 test('o trabalho sem horas aumenta o valor sem criar horas ou falsos alertas',()=>{
  const result=mergeFixedFeeMetrics({...metrics,minutes:0,uninvoicedCount:0,missingPrice:0},buildFixedFeeLines([job],[]))
  expect(result).toMatchObject({total:1200,minutes:0,averageRate:null,uninvoicedCount:1,missingPrice:0})
 })
 test('mantém ocultos os valores financeiros quando o RPC não concede acesso',()=>{
  const hidden={...metrics,movements:3,total:null,invoiced:null,paid:null,pending:null,averageRate:null}
  expect(mergeFixedFeeMetrics(hidden,buildFixedFeeLines([job],work))).toEqual(hidden)
 })
 test('mostra o valor quando todos os movimentos são registos deste trabalho',()=>{
  const onlyFixed={...metrics,movements:2,total:null,invoiced:null,paid:null,pending:null,averageRate:null}
  expect(mergeFixedFeeMetrics(onlyFixed,buildFixedFeeLines([job],work))).toMatchObject({total:1200,invoiced:0,paid:0,averageRate:600,missingPrice:0})
 })
 test('inclui as parcelas nos gráficos anuais e na sociedade por responsável',()=>{
  const lines=buildFixedFeeLines([{...job,billing_entity_name:'Sociedade'}],work.map((row,index)=>({...row,professional_name:index?'Responsável B':'Responsável A'})))
  expect(mergeFixedFeeSeries([{label:2026,value:100,societies:{'Responsável A':100}}],lines,'annual','professional')).toEqual([
   {label:2026,value:1300,societies:{'Responsável A':400,'Responsável B':900}},
  ])
 })
 test('mantém doze meses e inclui trabalho sem registos no mês da criação',()=>{
  const lines=buildFixedFeeLines([job],[])
  const series=mergeFixedFeeSeries([],lines,'monthly',null)
  expect(series).toHaveLength(12)
  expect(series.at(-1)).toEqual({label:'2026-09',value:1200})
 })
})
