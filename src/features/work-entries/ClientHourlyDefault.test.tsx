import { act,fireEvent,render,screen,waitFor } from '@testing-library/react'
import { beforeEach,expect,test,vi } from 'vitest'
import { CreateWorkEntryModal } from './CreateWorkEntryModal'

const {loadDefaults}=vi.hoisted(()=>({loadDefaults:vi.fn()}))
vi.mock('../../lib/supabase',()=>({supabase:{
  rpc:async()=>({data:{societies:[],responsibles:[{id:'p',display_name:'Profissional sintético'}],clientProfiles:[
    {id:'a',client_id:'a',client_code:'02.1',client_type:'individual',display_name:'Alfa'},
    {id:'b',client_id:'b',client_code:'02.2',client_type:'individual',display_name:'Beta'},
  ]},error:null}),
  from:()=>{
    let id='';const query:any={select:()=>query,eq:(key:string,value:string)=>{if(key==='id')id=value;return query},
      single:()=>loadDefaults(id),maybeSingle:async()=>({data:null,error:null})};
    return query
  },
}}))
beforeEach(()=>{loadDefaults.mockReset()})
async function selectClient(name:string){
 const input=await screen.findByRole('combobox',{name:'Cliente e vertente'})
 fireEvent.change(input,{target:{value:name}})
 fireEvent.click(await screen.findByRole('option',{name:new RegExp(name)}))
}
test('resposta atrasada não substitui um valor escrito pelo utilizador, incluindo vazio',async()=>{
 let resolve!:(value:unknown)=>void
 loadDefaults.mockImplementation(()=>new Promise(done=>{resolve=done}))
 render(<CreateWorkEntryModal onClose={()=>{}} onCreated={()=>{}}/>)
 await selectClient('Alfa')
 const rate=screen.getByRole('spinbutton',{name:/Valor\/hora/})
 fireEvent.change(rate,{target:{value:'90'}})
 fireEvent.change(rate,{target:{value:''}})
 await act(async()=>resolve({data:{default_hourly_rate:125},error:null}))
 expect(rate).toHaveValue(null)
})
test('ignora resposta do cliente anterior e mantém uma predefinição zero',async()=>{
 let resolveAlfa!:(value:unknown)=>void
 loadDefaults.mockImplementation(id=>id==='a'?new Promise(done=>{resolveAlfa=done}):Promise.resolve({data:{default_hourly_rate:0},error:null}))
 render(<CreateWorkEntryModal onClose={()=>{}} onCreated={()=>{}}/>)
 await selectClient('Alfa');await selectClient('Beta')
 const rate=screen.getByRole('spinbutton',{name:/Valor\/hora/})
 await waitFor(()=>expect(rate).toHaveValue(0))
 await act(async()=>resolveAlfa({data:{default_hourly_rate:125},error:null}))
 expect(rate).toHaveValue(0)
})
