import { cleanup,render,screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach,expect,test,vi } from 'vitest'
import { PwaUpdateNotice } from './PwaUpdateNotice'

const original=Object.getOwnPropertyDescriptor(navigator,'serviceWorker')
afterEach(()=>{cleanup();if(original)Object.defineProperty(navigator,'serviceWorker',original);else Reflect.deleteProperty(navigator,'serviceWorker')})
test('o aviso identifica a versão em espera e as suas alterações antes de actualizar',async()=>{
 const service=new EventTarget(),waiting={postMessage:vi.fn((message:{type:string})=>{
  if(message.type==='GET_RELEASE_NOTES')queueMicrotask(()=>{
   const event=new MessageEvent('message',{data:{type:'RELEASE_NOTES',release:{version:'0.8.1',changes:['Correcção sintética dos saldos','Melhoria sintética da navegação']}}})
   Object.defineProperty(event,'source',{value:waiting});service.dispatchEvent(event)
  })
 })}
 const registration=Object.assign(new EventTarget(),{waiting,update:vi.fn().mockResolvedValue(undefined)})
 Object.defineProperty(navigator,'serviceWorker',{configurable:true,value:Object.assign(service,{ready:Promise.resolve(registration)})})
 render(<PwaUpdateNotice/>);
 expect(await screen.findByText('Actualização disponível · 0.8.1')).toBeInTheDocument()
 expect(screen.getByText('Correcção sintética dos saldos')).toBeInTheDocument()
 expect(screen.getByText('Melhoria sintética da navegação')).toBeInTheDocument()
 expect(waiting.postMessage).not.toHaveBeenCalledWith({type:'SKIP_WAITING'})
 await userEvent.click(screen.getByRole('button',{name:'Actualizar aplicação'}))
 expect(waiting.postMessage).toHaveBeenCalledWith({type:'SKIP_WAITING'})
})
