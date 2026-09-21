import { cleanup,render,screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach,expect,test,vi } from 'vitest'
import { PwaUpdateNotice } from './PwaUpdateNotice'
import { changesSince } from './releaseNotes'
import installedNotes from 'virtual:release-notes'

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
 const nextVersion=installedNotes.version.replace(/\d+$/,(patch:string)=>String(Number(patch)+1))
 const service=new EventTarget(),waiting={postMessage:vi.fn((message:{type:string})=>{
  if(message.type==='GET_RELEASE_NOTES')queueMicrotask(()=>{
   const event=new MessageEvent('message',{data:{type:'RELEASE_NOTES',release:{version:nextVersion,changes:['Correcção sintética dos saldos','Melhoria sintética da navegação'],releases:[
    {version:installedNotes.version,changes:installedNotes.changes},
    {version:nextVersion,changes:['Correcção sintética dos saldos','Melhoria sintética da navegação']},
   ]}}})
   Object.defineProperty(event,'source',{value:waiting});service.dispatchEvent(event)
  })
 })}
 const registration=Object.assign(new EventTarget(),{waiting,update:vi.fn().mockResolvedValue(undefined)})
 Object.defineProperty(navigator,'serviceWorker',{configurable:true,value:Object.assign(service,{ready:Promise.resolve(registration)})})
 render(<PwaUpdateNotice/>);
 expect(await screen.findByText(`Actualização disponível · ${nextVersion}`)).toBeInTheDocument()
 expect(screen.getByText('Correcção sintética dos saldos')).toBeInTheDocument()
 expect(screen.getByText('Melhoria sintética da navegação')).toBeInTheDocument()
 expect(waiting.postMessage).not.toHaveBeenCalledWith({type:'SKIP_WAITING'})
 await userEvent.click(screen.getByRole('button',{name:'Actualizar aplicação'}))
 expect(localStorage.getItem('carina-release-notes-from')).toBe(installedNotes.version)
 expect(waiting.postMessage).toHaveBeenCalledWith({type:'SKIP_WAITING'})
})

test('usa a versão do worker activo quando o HTML já é novo e descarta a origem antiga',async()=>{
 localStorage.setItem('carina-release-notes-seen','0.10.2')
 localStorage.setItem('carina-release-notes-from','0.10.2')
 const service=new EventTarget(),waiting={postMessage:vi.fn((message:{type:string})=>{
  if(message.type==='GET_RELEASE_NOTES')queueMicrotask(()=>{
   const event=new MessageEvent('message',{data:{type:'RELEASE_NOTES',release:installedNotes}})
   Object.defineProperty(event,'source',{value:waiting});service.dispatchEvent(event)
  })
 })}
 const activeWorker={postMessage:vi.fn((message:{type:string})=>{
  if(message.type==='GET_RELEASE_NOTES')queueMicrotask(()=>{
   const event=new MessageEvent('message',{data:{type:'RELEASE_NOTES',release:{version:'0.10.20',changes:[]}}})
   Object.defineProperty(event,'source',{value:activeWorker});service.dispatchEvent(event)
  })
 })}
 const registration=Object.assign(new EventTarget(),{waiting,update:vi.fn().mockResolvedValue(undefined)})
 Object.defineProperty(navigator,'serviceWorker',{configurable:true,value:Object.assign(service,{ready:Promise.resolve(registration),controller:activeWorker})})
 render(<PwaUpdateNotice/>);
 expect(await screen.findByText(`Actualização disponível · ${installedNotes.version}`)).toBeInTheDocument()
 expect(await screen.findByText('O que muda desde 0.10.20:')).toBeInTheDocument()
 for(const change of installedNotes.changes)expect(screen.getByText(change)).toBeInTheDocument()
 expect(screen.getByText(installedNotes.releases[1].changes[0])).toBeInTheDocument()
 expect(screen.getByText(installedNotes.releases[2].changes[0])).toBeInTheDocument()
 expect(screen.queryByText(installedNotes.releases.find((release:{version:string})=>release.version==='0.10.20')!.changes[0])).not.toBeInTheDocument()
 await userEvent.click(screen.getByRole('button',{name:'Actualizar aplicação'}))
 expect(localStorage.getItem('carina-release-notes-from')).toBe('0.10.20')
 expect(waiting.postMessage).toHaveBeenCalledWith({type:'SKIP_WAITING'})
})
