import { render,screen,waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach,describe,expect,test,vi } from 'vitest'
import { CreateWorkEntryModal } from './CreateWorkEntryModal'
import { EditWorkEntryModal } from './EditWorkEntryModal'
import { BulkWorkEntryModal } from './BulkWorkEntryModal'

const rpc=vi.fn()
vi.mock('../../lib/supabase',()=>({supabase:{rpc:(...args:unknown[])=>rpc(...args)}}))

const options={societies:[{id:'soc-1',name:'Carina Santos'}],clientProfiles:[{id:'profile-1',client_id:'client-1',client_type:'company',client_code:'C-1',display_name:'Cliente Teste'}],responsibles:[{id:'resp-1',display_name:'Carina'}],processes:[{id:'matter-1',client_id:'client-1',matter_code:'P-1',title:'Processo Teste'}]}

beforeEach(()=>{rpc.mockReset();rpc.mockImplementation(async(name:string)=>name==='get_work_entry_form_options'?{data:options,error:null}:name==='get_work_entry_for_edit'?{data:{id:'entry-1',work_date:'2026-08-16',client_profile_id:'profile-1',matter_id:'matter-1',professional_id:'resp-1',activity_description:'Actividade original',observations:null},error:null}:{data:1,error:null})})

describe('movimentos controlados',()=>{
 test('cria um movimento enviando apenas dados operacionais',async()=>{const user=userEvent.setup(),onCreated=vi.fn();render(<CreateWorkEntryModal onClose={vi.fn()} onCreated={onCreated}/>);await screen.findByText(/Cliente Teste/);await user.selectOptions(screen.getByLabelText('Cliente e vertente'),'profile-1');await user.selectOptions(screen.getByLabelText('Responsável'),'resp-1');await user.selectOptions(screen.getByLabelText('Sociedade'),'soc-1');await user.type(screen.getByLabelText('Minutos'),'30');await user.type(screen.getByLabelText('Actividade'),'Reunião');await user.click(screen.getByRole('button',{name:'Guardar movimento'}));await waitFor(()=>expect(onCreated).toHaveBeenCalled());expect(rpc).toHaveBeenCalledWith('create_work_entry',expect.objectContaining({p_duration_minutes:30,p_client_profile_id:'profile-1',p_activity_description:'Reunião'}))})
 test('edita os dados operacionais sem voltar a carregar o formulário ao guardar',async()=>{const user=userEvent.setup(),onSaved=vi.fn();render(<EditWorkEntryModal entryId="entry-1" onClose={vi.fn()} onSaved={onSaved}/>);const activity=await screen.findByDisplayValue('Actividade original');await user.clear(activity);await user.type(activity,'Actividade revista');await user.click(screen.getByRole('button',{name:'Guardar'}));await waitFor(()=>expect(onSaved).toHaveBeenCalled());expect(rpc.mock.calls.filter(([name])=>name==='get_work_entry_form_options')).toHaveLength(1);expect(rpc).toHaveBeenCalledWith('update_work_entry_details',expect.objectContaining({p_work_entry_id:'entry-1',p_activity_description:'Actividade revista'}))})
 test('exige confirmação e motivo numa alteração em massa',async()=>{const user=userEvent.setup(),onApplied=vi.fn();render(<BulkWorkEntryModal ids={['entry-1','entry-2']} currentTotal={200} onClose={vi.fn()} onApplied={onApplied}/>);await screen.findByRole('option',{name:'Carina'});await user.selectOptions(screen.getByLabelText('Novo valor'),'resp-1');await user.type(screen.getByLabelText('Motivo obrigatório'),'Distribuição de trabalho');await user.click(screen.getByText(/Confirmo a quantidade/));await user.click(screen.getByRole('button',{name:'Aplicar alteração'}));await waitFor(()=>expect(onApplied).toHaveBeenCalledWith(1));expect(rpc).toHaveBeenCalledWith('bulk_update_work_entries',{p_work_entry_ids:['entry-1','entry-2'],p_action:'responsible',p_value:'resp-1',p_reason:'Distribuição de trabalho'})})
})
