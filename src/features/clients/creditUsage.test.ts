import {describe,it,expect} from 'vitest'
import {calculateCreditUsage,type CreditWork} from './creditUsage'
import type {CreditDetail,CreditMovement} from './credit'
const deposit=(date:string,reversed=false)=>({kind:'payment',movement_date:date,reversed}) as CreditMovement
const detail:CreditDetail={account:{id:'a',client_id:'c',client_name:'Cliente',billing_entity_id:'b',society_name:'Sociedade',currency:'EUR',received:1000,consumed:0,balance:1000},movements:[deposit('2026-07-10')]}
const row:CreditWork={id:'w',client_id:'c',billing_entity_id:'b',currency:'EUR',work_date:'2026-07-10',activity_description:'Consulta',duration_minutes:60,effective_amount:100,billing_scope:'standard',is_billable:true,is_paid:false,is_invoiced:false,status:'draft'}
describe('saldo após os registos',()=>{
 it('conta desde o dia do depósito, incluindo o próprio dia, e ignora datas futuras e contas diferentes',()=>{
  const usage=calculateCreditUsage(detail,[row,{...row,id:'before',work_date:'2026-07-09'},{...row,id:'future',work_date:'2027-01-01'},{...row,id:'other',billing_entity_id:'other'}],23,'2026-09-02')
  expect(usage.balance).toBe(877);expect(usage.rows.map(r=>r.id)).toEqual(['w'])
 })
 it('recalcula após correcções de valor e distingue provisão esgotada de excesso',()=>{
  expect(calculateCreditUsage(detail,[{...row,effective_amount:200}],23,'2026-09-02').balance).toBe(754)
  expect(calculateCreditUsage(detail,[{...row,effective_amount:1000}],23,'2026-09-02')).toMatchObject({balance:0,consumed:1000,excess:230})
 })
 it('não desconta outra vez registos de notas já contabilizadas',()=>{
  const noted={...detail,account:{...detail.account,balance:877,consumed:123,noted_work_ids:['w']}}
  expect(calculateCreditUsage(noted,[row],23,'2026-09-02')).toMatchObject({balance:877,consumed:123,total:0})
 })
 it('usa a data efectiva do depósito válido e conserva o início nos reforços',()=>{
  const corrected={...detail,movements:[deposit('2026-01-01',true),deposit('2026-07-10'),deposit('2026-08-01')]}
  expect(calculateCreditUsage(corrected,[row],0,'2026-09-02')).toMatchObject({startsOn:'2026-07-10',balance:900})
  expect(calculateCreditUsage({...detail,movements:[deposit('2026-07-10',true)]},[row],0,'2026-09-02').rows).toHaveLength(0)
 })
 it('sinaliza preço em falta e exclui serviços pagos, avenças e anulados',()=>{
  const usage=calculateCreditUsage(detail,[{...row,effective_amount:null},{...row,id:'paid',is_paid:true},{...row,id:'retainer',billing_scope:'retainer'},{...row,id:'cancelled',status:'cancelled'}],0,'2026-09-02')
  expect(usage.missingPrice).toBe(1);expect(usage.rows).toHaveLength(1)
 })
})
