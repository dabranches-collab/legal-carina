import { expect,test } from 'vitest'
import { buildDebtors } from './debtorSummary'

const clients=[
 {id:'a',display_name:'Alfa',client_code:'01.0001'},
 {id:'b',display_name:'Beta',client_code:'01.0002'},
 {id:'c',display_name:'Gama',client_code:'01.0003'},
]
const entry=(id:string,client_id:string,amount:number|null,date:string)=>({id,client_id,client_code:`01.000${client_id==='a'?1:client_id==='b'?2:3}`,effective_amount:amount,work_date:date,invoice_date:'2026-09-10',duration_minutes:90})

test('inclui todas as fases em aberto e ordena pelo total conhecido',()=>{
 const rows=buildDebtors(
  [entry('a1','a',150,'2026-02-01'),entry('b1','b',300,'2026-03-01')],
  [entry('a2','a',900,'2026-01-01'),entry('c1','c',1000,'2026-01-01')],
  [{client_id:'a',period_start:'2026-01-01',invoice_date:'2026-01-10',amount:200,currency:'EUR',status:'invoiced'}],clients)
 expect(rows.map(row=>row.id)).toEqual(['a','c','b'])
 expect(rows[0]).toMatchObject({unpaidAmount:150,retainerAmount:200,uninvoicedAmount:900,uninvoicedMinutes:90,oldestDate:'2026-01-01',oldestKind:'trabalho'})
})

test('conserva clientes com montantes ocultos sem inventar dívida nem ordenar como valor conhecido',()=>{
 const rows=buildDebtors([entry('a1','a',null,'2026-01-01'),entry('b1','b',50,'2026-02-01')],[],[],clients)
 expect(rows.map(row=>row.id)).toEqual(['b','a'])
 expect(rows[1]).toMatchObject({unpaidAmount:null,unpaidPartial:true,unpaidCount:1})
})

test('recusa somar moedas diferentes e não apresenta um total enganador',()=>{
 expect(()=>buildDebtors([],[],[{client_id:'a',period_start:'2026-01-01',invoice_date:'2026-01-10',amount:100,currency:'USD',status:'invoiced'}],clients)).toThrow(/moeda diferente/)
})
