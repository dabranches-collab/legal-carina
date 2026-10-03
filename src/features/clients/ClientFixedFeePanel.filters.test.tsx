import{render,screen,within}from'@testing-library/react'
import userEvent from'@testing-library/user-event'
import{expect,it,vi}from'vitest'
import{ClientFixedFeePanel}from'./ClientFixedFeePanel'
const{rpc,from}=vi.hoisted(()=>({rpc:vi.fn().mockResolvedValue({data:[],error:null}),from:vi.fn()}))
vi.mock('../../lib/supabase',()=>({supabase:{from,rpc}}))
vi.mock('../work-entries/EditWorkEntryModal',()=>({EditWorkEntryModal:()=>null}))
vi.mock('./FixedFeeNoteActions',()=>({FixedFeeNoteActions:()=>null}))
it('Limpar deixa zero trabalhos e Todos restaura sem modificar dados',async()=>{
 const jobs=[{id:'synthetic',firm_id:'firm',client_id:'client',billing_entity_id:null,title:'Assunto sintético',description:null,agreed_amount:100,currency:'EUR',vat_rate:null,status:'open',is_invoiced:false,invoice_date:null,is_paid:false}]
 from.mockImplementation((table:string)=>{const result={data:table==='fixed_fee_jobs'?jobs:[],error:null};const chain:any={select:()=>chain,eq:()=>chain,order:()=>Promise.resolve(result)};return chain})
 const user=userEvent.setup()
 render(<ClientFixedFeePanel firmId="firm" clientId="client" readOnly onRequestEdit={()=>{}}/>)
 expect(await screen.findByText('Assunto sintético')).toBeInTheDocument()
 const scope=within(screen.getByRole('combobox').parentElement!)
 await user.click(scope.getByRole('button',{name:'Limpar'}))
 expect(screen.getByRole('combobox')).toHaveValue('none')
 expect(screen.queryByText('Assunto sintético')).not.toBeInTheDocument()
 await user.click(scope.getByRole('button',{name:'Todos'}))
 expect(screen.getByText('Assunto sintético')).toBeInTheDocument()
 expect(rpc).toHaveBeenCalledTimes(1)
 expect(rpc).toHaveBeenCalledWith('get_fixed_fee_provision_totals')
})
