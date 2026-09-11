import { expect,test,vi } from 'vitest'
import { readIdBatches } from './readBatches'

test('limita endereços, concorrência e lê todas as páginas de despesas sem duplicar IDs',async()=>{
 const ids=Array.from({length:7235},(_,i)=>String(i));let active=0,peak=0
 const read=vi.fn(async(batch:string[],from:number)=>{
  expect(batch.length).toBeLessThanOrEqual(80);active++;peak=Math.max(peak,active)
  await Promise.resolve();active--
  return {data:batch[0]==='0'?(from===0?Array.from({length:1000},(_,i)=>({id:`expense-${i}`})):[{id:'last-expense'}]):batch.map(id=>({id})),error:null}
 })
 const rows=await readIdBatches([...ids,'0'],read)
 expect(rows.length).toBe(7235-80+1001);expect(peak).toBeLessThanOrEqual(3)
 expect(rows).toContainEqual({id:'last-expense'});expect(rows.at(-1)).toEqual({id:'7234'})
})
