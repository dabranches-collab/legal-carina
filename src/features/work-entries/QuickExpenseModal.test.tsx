import {render,screen,waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {beforeEach,expect,it,vi} from 'vitest'

const {rpc,uploadExpenseFiles,getWorkEntryOptions}=vi.hoisted(()=>({rpc:vi.fn(),uploadExpenseFiles:vi.fn(),getWorkEntryOptions:vi.fn()}))
vi.mock('../../lib/supabase',()=>({
 supabase:{
  rpc,
  from:(table:string)=>({
   select:()=>({
    eq:()=>({
     maybeSingle:async()=>({data:{primary_billing_entity_id:null},error:null}),
     order:()=>({limit:async()=>({data:table==='work_entries'?[{id:'entry-1',work_date:'2026-09-29',activity_description:'Consulta'}]:[],error:null})}),
    }),
   }),
  }),
 },
}))
vi.mock('./workEntryCompatibility',()=>({getWorkEntryOptions}))
vi.mock('./workEntryExpenses',()=>({uploadExpenseFiles}))

import {QuickExpenseModal} from './QuickExpenseModal'

beforeEach(()=>{
 rpc.mockReset();uploadExpenseFiles.mockReset();getWorkEntryOptions.mockReset()
 getWorkEntryOptions.mockResolvedValue({data:{clientProfiles:[{id:'profile-1',client_id:'client-1',client_type:'individual',client_code:'02-01',display_name:'Cliente Sintético'}],responsibles:[{id:'resp-1',display_name:'Responsável Sintético'}],societies:[],processes:[]},error:null})
 uploadExpenseFiles.mockResolvedValue([])
})

it('associa uma despesa e um comprovativo a um registo existente',async()=>{
 const user=userEvent.setup(),onCreated=vi.fn()
 rpc.mockResolvedValue({data:'expense-1',error:null})
 render(<QuickExpenseModal onClose={vi.fn()} onCreated={onCreated}/> )
 await user.selectOptions(await screen.findByRole('combobox',{name:'Cliente e vertente'}),'profile-1')
 await user.selectOptions(await screen.findByLabelText('Registo deste cliente'),'entry-1')
 await user.type(screen.getByLabelText('Montante (€)'),'12.50')
 const document=new File(['test'],'comprovativo.pdf',{type:'application/pdf'})
 await user.upload(screen.getByLabelText(/Escolher a partir de ficheiro/),document)
 await user.click(screen.getByRole('button',{name:'Guardar despesa'}))
 await waitFor(()=>expect(onCreated).toHaveBeenCalledOnce())
 expect(rpc).toHaveBeenCalledWith('create_work_entry_expense',{p_work_entry_id:'entry-1',p_amount:12.5,p_observations:null})
 await waitFor(()=>expect(uploadExpenseFiles).toHaveBeenCalledWith('expense-1',[document]))
 expect(screen.getByText('Despesa guardada.')).toBeInTheDocument()
})

it('cria um registo mínimo com a despesa na mesma operação',async()=>{
 const user=userEvent.setup(),onCreated=vi.fn()
 rpc.mockImplementation(async (_name,args)=>({data:{workEntryId:'entry-2',expenses:[{key:args.p_expenses[0].key,id:'expense-2'}]},error:null}))
 render(<QuickExpenseModal onClose={vi.fn()} onCreated={onCreated}/> )
 await user.selectOptions(await screen.findByRole('combobox',{name:'Cliente e vertente'}),'profile-1')
 await user.click(screen.getByLabelText('Criar novo'))
 await user.selectOptions(screen.getByLabelText('Responsável'),'resp-1')
 await user.type(screen.getByLabelText('Actividade'),'Deslocação')
 await user.type(screen.getByLabelText('Duração (minutos)'),'15')
 await user.type(screen.getByLabelText('Montante (€)'),'8')
 await user.click(screen.getByRole('button',{name:'Guardar despesa'}))
 await waitFor(()=>expect(onCreated).toHaveBeenCalledOnce())
 expect(rpc).toHaveBeenCalledWith('create_work_entry_with_allocation',expect.objectContaining({p_client_profile_id:'profile-1',p_professional_id:'resp-1',p_activity_description:'Deslocação',p_duration_minutes:15,p_expenses:[expect.objectContaining({amount:8})]}))
})
