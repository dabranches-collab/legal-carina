import { expect,it } from 'vitest'
import { creditHistoryData } from './creditHistoryExport'
import { calculateCreditUsage,type CreditWork } from './creditUsage'
import type { CreditAccount,CreditMovement } from './credit'
const account={id:'a',client_id:'c',billing_entity_id:'b',client_name:'Cliente Sintético',society_name:'Sociedade Sintética',currency:'EUR',received:1600,consumed:0,balance:1600,noted_work_ids:[]} as CreditAccount
const payment={id:'p',kind:'payment',amount:1600,movement_date:'2026-01-01',recorded_at:'2026-02-01',reference:'Saldo inicial',reversed:false,reverses_id:null,note:null,note_id:null} as CreditMovement
const movements=[{...payment,id:'old',reversed:true},{...payment,id:'reverse',kind:'reversal',amount:-1600,reverses_id:'old'} as CreditMovement,payment]
const work={id:'w',client_id:'c',billing_entity_id:'b',currency:'EUR',work_date:'2026-01-02',activity_description:'Serviço sintético',duration_minutes:60,effective_amount:100,billing_scope:'standard',is_billable:true,is_paid:false,is_invoiced:false,status:'approved'} as CreditWork
const usage=calculateCreditUsage({account,movements},[work],23,'2026-02-01')
it('exporta só a provisão válida e o consumo, com resumo coerente',()=>{const data=creditHistoryData(account,usage,movements,'values');expect(data.rows).toHaveLength(2);expect(data.rows[0][3]).toBe(1600);expect(data.rows[1].slice(4)).toEqual([100,23,123,1477]);expect(data.summary).toContainEqual(['Saldo disponível',1477])})
it('o modo de tempos omite preços e saldo por serviço mas mantém resumo final',()=>{const data=creditHistoryData(account,usage,movements,'time');expect(data.header).toHaveLength(3);expect(data.rows[1]).toEqual(['02/01/2026','Serviço sintético',60]);expect(data.summary).toContainEqual(['Saldo disponível',1477])})
