import {beforeEach,describe,expect,it,vi} from 'vitest'
import {saveExpenseDrafts,uploadCreatedExpenseFiles} from './workEntryExpenses'

const {rpc,invoke}=vi.hoisted(()=>({rpc:vi.fn(),invoke:vi.fn()}))
vi.mock('../../lib/supabase',()=>({supabase:{rpc,functions:{invoke}}}))

describe('despesas dos movimentos',()=>{
 beforeEach(()=>{rpc.mockReset();invoke.mockReset();rpc.mockResolvedValueOnce({data:'expense-1',error:null}).mockResolvedValueOnce({data:'expense-2',error:null});invoke.mockResolvedValue({data:{documentId:'document-1'},error:null})})
 it('guarda várias despesas separadas e nunca altera campos de facturação',async()=>{
  const failures=await saveExpenseDrafts('work-1',[{key:'a',amount:'12,50',observations:'Certidão',files:[]},{key:'b',amount:'7.25',observations:'Portes',files:[]}])
  expect(failures).toEqual([])
  expect(rpc).toHaveBeenNthCalledWith(1,'create_work_entry_expense',{p_work_entry_id:'work-1',p_amount:12.5,p_observations:'Certidão'})
  expect(rpc).toHaveBeenNthCalledWith(2,'create_work_entry_expense',{p_work_entry_id:'work-1',p_amount:7.25,p_observations:'Portes'})
  expect(rpc.mock.calls.flat().join(' ')).not.toMatch(/invoice|effective_amount|billing|paid/i)
 })
 it('associa um documento validado à despesa criada',async()=>{
  const pdf=new File([new Uint8Array([0x25,0x50,0x44,0x46,0x2d,0x31])],'recibo.pdf',{type:'application/pdf'})
  const failures=await saveExpenseDrafts('work-1',[{key:'a',amount:'10',observations:'Taxa',files:[pdf]}])
  expect(failures).toEqual([])
  expect(invoke).toHaveBeenCalledWith('expense-documents',{body:expect.any(FormData)})
  const body=invoke.mock.calls[0][1].body as FormData
  expect(body.get('expenseId')).toBe('expense-1')
  expect((body.get('file') as File).name).toBe('recibo.pdf')
 })
 it('rejeita anexos cujo conteúdo não corresponde ao formato',async()=>{
  const fake=new File(['não é PDF'],'recibo.pdf',{type:'application/pdf'})
  const failures=await saveExpenseDrafts('work-1',[{key:'a',amount:'10',observations:'Taxa',files:[fake]}])
  expect(failures.join(' ')).toContain('formato inválido')
  expect(invoke).not.toHaveBeenCalled()
 })
 it('recusa despesas sem montante positivo antes de chamar o servidor',async()=>{
  const failures=await saveExpenseDrafts('work-1',[{key:'zero',amount:'0',observations:'Inválida',files:[]}])
  expect(failures.join(' ')).toContain('montante inválido')
  expect(rpc).not.toHaveBeenCalled()
 })
 it('liga cada anexo à despesa correspondente devolvida pela criação atómica',async()=>{
  const first=new File([new Uint8Array([0x25,0x50,0x44,0x46,0x2d,0x31])],'primeiro.pdf',{type:'application/pdf'}),second=new File([new Uint8Array([0x25,0x50,0x44,0x46,0x2d,0x31])],'segundo.pdf',{type:'application/pdf'})
  const failures=await uploadCreatedExpenseFiles({workEntryId:'work-new',expenses:[{key:'b',id:'expense-b'},{key:'a',id:'expense-a'}]},[{key:'a',amount:'1',observations:'A',files:[first]},{key:'b',amount:'2',observations:'B',files:[second]}])
  expect(failures).toEqual([])
  expect((invoke.mock.calls[0][1].body as FormData).get('expenseId')).toBe('expense-b')
  expect(((invoke.mock.calls[0][1].body as FormData).get('file') as File).name).toBe('segundo.pdf')
  expect((invoke.mock.calls[1][1].body as FormData).get('expenseId')).toBe('expense-a')
 })
})
