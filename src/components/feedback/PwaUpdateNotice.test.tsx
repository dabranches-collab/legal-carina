import { cleanup,render,screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach,expect,test,vi } from 'vitest'
import { PwaUpdateNotice } from './PwaUpdateNotice'
import { changesSince } from './releaseNotes'
import installedNotes from '../../../public/release-notes.json'

const original=Object.getOwnPropertyDescriptor(navigator,'serviceWorker')
afterEach(()=>{cleanup();localStorage.clear();if(original)Object.defineProperty(navigator,'serviceWorker',original);else Reflect.deleteProperty(navigator,'serviceWorker')})

test('mostra alterações depois de actualizar e conserva a confirmação até à próxima versão',async()=>{
 render(<PwaUpdateNotice/>);
 expect(screen.getByText(`Aplicação actualizada · ${installedNotes.version}`)).toBeInTheDocument()
 expect(screen.getByText(installedNotes.changes[0])).toBeInTheDocument()
 await userEvent.click(screen.getByRole('button',{name:'Fechar alterações'}))
 cleanup();render(<PwaUpdateNotice/>);
 expect(screen.queryByRole('status')).not.toBeInTheDocument()
 localStorage.setItem('carina-release-notes-seen','0.7.1');cleanup();render(<PwaUpdateNotice/>);
 expect(screen.getByText(`Aplicação actualizada · ${installedNotes.version}`)).toBeInTheDocument()
})
test('selecciona apenas as alterações posteriores à versão instalada',()=>{
 const release={version:'0.10.2',changes:['Alteração 0.10.2'],releases:[
  {version:'0.10.0',changes:['Alteração 0.10.0']},
  {version:'0.10.1',changes:['Alteração 0.10.1']},
  {version:'0.10.2',changes:['Alteração 0.10.2']},
 ]}
 expect(changesSince(release,'0.10.0')).toEqual(['Alteração 0.10.1','Alteração 0.10.2'])
 expect(changesSince(release,'0.10.1')).toEqual(['Alteração 0.10.2'])
})
test('o aviso identifica a versão em espera e as suas alterações antes de actualizar',async()=>{
 const service=new EventTarget(),waiting={postMessage:vi.fn((message:{type:string})=>{
  if(message.type==='GET_RELEASE_NOTES')queueMicrotask(()=>{
   const event=new MessageEvent('message',{data:{type:'RELEASE_NOTES',release:{version:'0.10.3',changes:['Correcção sintética dos saldos','Melhoria sintética da navegação'],releases:[
    {version:'0.10.2',changes:installedNotes.changes},
    {version:'0.10.3',changes:['Correcção sintética dos saldos','Melhoria sintética da navegação']},
   ]}}})
   Object.defineProperty(event,'source',{value:waiting});service.dispatchEvent(event)
  })
 })}
 const registration=Object.assign(new EventTarget(),{waiting,update:vi.fn().mockResolvedValue(undefined)})
 Object.defineProperty(navigator,'serviceWorker',{configurable:true,value:Object.assign(service,{ready:Promise.resolve(registration)})})
 render(<PwaUpdateNotice/>);
 expect(await screen.findByText('Actualização disponível · 0.10.3')).toBeInTheDocument()
 expect(screen.getByText('Correcção sintética dos saldos')).toBeInTheDocument()
 expect(screen.getByText('Melhoria sintética da navegação')).toBeInTheDocument()
 expect(waiting.postMessage).not.toHaveBeenCalledWith({type:'SKIP_WAITING'})
 await userEvent.click(screen.getByRole('button',{name:'Actualizar aplicação'}))
 expect(localStorage.getItem('carina-release-notes-from')).toBe(installedNotes.version)
 expect(waiting.postMessage).toHaveBeenCalledWith({type:'SKIP_WAITING'})
})
