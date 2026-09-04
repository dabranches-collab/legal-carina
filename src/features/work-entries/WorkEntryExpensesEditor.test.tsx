import {render,screen,waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {beforeEach,describe,expect,it,vi} from 'vitest'
import {WorkEntryExpensesEditor} from './WorkEntryExpensesEditor'

const {rpc,from,createSignedUrl,invoke}=vi.hoisted(()=>({rpc:vi.fn(),from:vi.fn(),createSignedUrl:vi.fn(),invoke:vi.fn()}))
vi.mock('../../lib/supabase',()=>({supabase:{rpc,from,functions:{invoke},storage:{from:()=>({createSignedUrl})}}}))

const expenses=[{id:'expense-1',amount:12.34,currency:'EUR',observations:'Certidão sintética',created_at:'2026-08-21T10:00:00Z'}]
const documents=[{id:'document-1',expense_id:'expense-1',original_filename:'recibo-sintetico.pdf',storage_path:'firm/client/expenses/expense/document/recibo.pdf',mime_type:'application/pdf',size_bytes:478}]
const query=(data:unknown)=>{const result={data,error:null};const chain:any={select:()=>chain,eq:()=>chain,in:()=>chain,order:()=>chain,then:(resolve:(value:typeof result)=>void)=>Promise.resolve(result).then(resolve)};return chain}

describe('WorkEntryExpensesEditor',()=>{
 beforeEach(()=>{rpc.mockReset();from.mockReset();createSignedUrl.mockReset();invoke.mockReset();from.mockImplementation((table:string)=>query(table==='work_entry_expenses'?expenses:documents));rpc.mockResolvedValue({data:null,error:null});invoke.mockResolvedValue({data:{documentId:'document-new'},error:null})})

 it('mostra montante, observações e anexos associados ao movimento',async()=>{
  render(<WorkEntryExpensesEditor entryId="work-1" drafts={[]} onDraftsChange={()=>{}}/>)
  expect(await screen.findByText(/12,34\s*€/)).toBeInTheDocument()
  expect(screen.getByText('Certidão sintética')).toBeInTheDocument()
  expect(screen.getByText('1 anexo')).toBeInTheDocument()
  expect(screen.getByRole('button',{name:'recibo-sintetico.pdf'})).toBeInTheDocument()
 })

 it('reserva imediatamente um separador e encaminha-o depois para a ligação privada',async()=>{
  let resolveSigned!:(value:{data:{signedUrl:string};error:null})=>void
  createSignedUrl.mockReturnValue(new Promise(resolve=>{resolveSigned=resolve}))
  const replace=vi.fn(),close=vi.fn(),opened={opener:{} as Window|null,location:{replace},close} as unknown as Window
  const open=vi.spyOn(window,'open').mockReturnValue(opened)
  const user=userEvent.setup();render(<WorkEntryExpensesEditor entryId="work-1" drafts={[]} onDraftsChange={()=>{}}/>)
  await user.click(await screen.findByRole('button',{name:'recibo-sintetico.pdf'}))
  expect(open).toHaveBeenCalledWith('about:blank','_blank');expect(opened.opener).toBeNull();expect(replace).not.toHaveBeenCalled()
  resolveSigned({data:{signedUrl:'https://storage.example.test/private-signed'},error:null})
  await waitFor(()=>expect(replace).toHaveBeenCalledWith('https://storage.example.test/private-signed'))
 })

 it('administrador remove sem motivo e operador envia o motivo pedido',async()=>{
  const user=userEvent.setup(),prompt=vi.spyOn(window,'prompt')
  const {unmount}=render(<WorkEntryExpensesEditor entryId="work-1" drafts={[]} onDraftsChange={()=>{}} requiresReason={false}/>)
  await user.click(await screen.findByRole('button',{name:'Remover'}))
  await waitFor(()=>expect(rpc).toHaveBeenCalledWith('remove_work_entry_expense',{p_expense_id:'expense-1',p_reason:null}))
  expect(prompt).not.toHaveBeenCalled();unmount();rpc.mockClear();prompt.mockReturnValue('tcodexoperador correcção auditada')
  render(<WorkEntryExpensesEditor entryId="work-1" drafts={[]} onDraftsChange={()=>{}} requiresReason/>)
  await user.click(await screen.findByRole('button',{name:'Remover'}))
  await waitFor(()=>expect(rpc).toHaveBeenCalledWith('remove_work_entry_expense',{p_expense_id:'expense-1',p_reason:'tcodexoperador correcção auditada'}))
 })

 it('limpa o selector depois do carregamento para permitir repetir o mesmo ficheiro',async()=>{
  const user=userEvent.setup();render(<WorkEntryExpensesEditor entryId="work-1" drafts={[]} onDraftsChange={()=>{}}/>)
  const input=(await screen.findByLabelText('Adicionar anexos')) as HTMLInputElement
  const pdf=new File([new Uint8Array([0x25,0x50,0x44,0x46,0x2d,0x31])],'recibo.pdf',{type:'application/pdf'})
  await user.upload(input,pdf);await waitFor(()=>expect(invoke).toHaveBeenCalled())
  expect(input.value).toBe('')
 })
})
