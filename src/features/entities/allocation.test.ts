import { describe,expect,it } from 'vitest'
import { allocateHonoraria,allocationPeriod,validAllocationRates,type AllocationWork } from './allocation'
const entry:AllocationWork={id:'1',client_id:'c1',work_date:'2026-01-01',client_name:'Cliente Sintético',professional_name:'Carina',activity_description:'Análise',duration_minutes:60,effective_amount:100,currency:'EUR',billing_scope:'standard',is_billable:true,is_paid:true,status:'paid',client_referrer:'carina',task_referrer:'hugo',task_referrer_other:null}
describe('repartição de honorários',()=>{
 it('acumula funções e não atribui horas de angariação como trabalho',()=>{const m=allocateHonoraria([entry]);expect(m.total).toBe(10000);expect(m.office).toBe(3000);expect(m.people.find(p=>p.name==='Carina Santos')).toMatchObject({client:1000,execution:5000,total:6000,minutes:60});expect(m.people.find(p=>p.name==='Hugo Mendonça')).toMatchObject({task:1000,minutes:0})})
 it('mantém as parcelas desconhecidas por atribuir sem inventar nomes',()=>{const m=allocateHonoraria([{...entry,client_referrer:null,task_referrer:null}]);expect(m.unassigned).toBe(2000);expect(m.people.reduce((n,p)=>n+p.total,0)+m.office+m.unassigned).toBe(m.total)})
 it('reparte todos os cêntimos exactamente, também em montantes pequenos',()=>{for(let cents=0;cents<301;cents++){const m=allocateHonoraria([{...entry,effective_amount:cents/100}]);expect(m.people.reduce((n,p)=>n+p.total,0)+m.office).toBe(cents)}})
 it('filtra pagos e exclui cancelados; avenças contam apenas horas',()=>{const rows=[entry,{...entry,id:'2',is_paid:false},{...entry,id:'3',status:'cancelled'},{...entry,id:'4',billing_scope:'retainer',effective_amount:null}];const m=allocateHonoraria(rows,true);expect(m.total).toBe(10000);expect(m.retainerMinutes).toBe(60);expect(m.missingPrice).toBe(0)})
 it('permite outro angariador e avisa quando não há preço',()=>{const m=allocateHonoraria([{...entry,task_referrer:'other',task_referrer_other:'Parceiro Sintético'},{...entry,id:'2',effective_amount:null}]);expect(m.people.find(p=>p.name==='Parceiro Sintético')?.task).toBe(1000);expect(m.missingPrice).toBe(1)})
 it('recalcula taxas editadas e preserva cada cêntimo com taxas decimais',()=>{
  const rates={client:12.25,task:7.75,execution:55,office:25}
  for(let cents=1;cents<=301;cents++){const m=allocateHonoraria([{...entry,effective_amount:cents/100}],false,rates);expect(m.people.reduce((n,p)=>n+p.total,0)+m.office).toBe(cents)}
  expect(allocateHonoraria([entry],false,rates).office).toBe(2500)
  expect(validAllocationRates({...rates,office:30})).toBe(false)
  expect(()=>allocateHonoraria([entry],false,{...rates,office:NaN})).toThrow(/100%/)
 })
 it('obtém extremos de todo o período elegível sem depender do ano actual',()=>{
  expect(allocationPeriod([{...entry,work_date:'2023-04-05'},{...entry,work_date:'2027-02-01'},{...entry,work_date:'2020-01-01',status:'cancelled'}])).toEqual({start:'2023-04-05',end:'2027-02-01'})
  expect(allocationPeriod([])).toEqual({start:'',end:''})
 })
})
