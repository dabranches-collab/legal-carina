import { describe,expect,test } from 'vitest'
import { buildFixedFeeLines,fixedFeeHourlyRate,sumFixedFeeLines,type FixedFeeJob } from './fixedFeeAnalytics'

const job:FixedFeeJob={id:'job',client_id:'client',billing_entity_id:'society',title:'Peça',agreed_amount:1200,currency:'EUR',status:'open',is_invoiced:true,is_paid:false,invoice_date:'2026-09-18',created_at:'2026-09-01T00:00:00Z'}

describe('reconciliação analítica do preço fixo',()=>{
 test('imputa o preço aos responsáveis pelas horas sem duplicar cliente ou sociedade',()=>{
  const lines=buildFixedFeeLines([job],[{id:'a',fixed_fee_job_id:'job',professional_id:'one',work_date:'2026-09-02',duration_minutes:30},{id:'b',fixed_fee_job_id:'job',professional_id:'two',work_date:'2026-09-03',duration_minutes:90}])
  expect(sumFixedFeeLines(lines,line=>line.clientId==='client')).toMatchObject({total:1200,unpaid:1200,minutes:120})
  expect(sumFixedFeeLines(lines,line=>line.billingEntityId==='society').total).toBe(1200)
  expect(sumFixedFeeLines(lines,line=>line.professionalId==='one').total).toBe(300)
  expect(sumFixedFeeLines(lines,line=>line.professionalId==='two').total).toBe(900)
  expect(fixedFeeHourlyRate(sumFixedFeeLines(lines,line=>line.professionalId==='one'))).toBe(600)
  expect(fixedFeeHourlyRate(sumFixedFeeLines(lines,line=>line.professionalId==='two'))).toBe(600)
 })
 test('conserva preço no cliente antes da execução sem o atribuir a responsável',()=>{
  const lines=buildFixedFeeLines([{...job,is_paid:true}],[])
  expect(sumFixedFeeLines(lines,()=>true)).toMatchObject({total:1200,invoiced:1200,paid:1200,unpaid:0,minutes:0})
  expect(lines[0].professionalId).toBeNull()
  expect(fixedFeeHourlyRate(sumFixedFeeLines(lines,()=>true))).toBeNull()
 })
 test('a provisão parcial entra como recebido sem alterar o preço nem a média por hora',()=>{
  const lines=buildFixedFeeLines([{...job,provision_applied:400}],[{id:'a',fixed_fee_job_id:'job',professional_id:'one',work_date:'2026-09-02',duration_minutes:60}])
  expect(sumFixedFeeLines(lines,()=>true)).toMatchObject({total:1200,invoiced:1200,paid:400,unpaid:800,minutes:60})
  expect(fixedFeeHourlyRate(sumFixedFeeLines(lines,()=>true))).toBe(1200)
 })
})
