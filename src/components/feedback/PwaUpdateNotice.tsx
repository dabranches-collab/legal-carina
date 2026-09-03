import { useEffect, useState } from 'react'
import installedNotes from '../../../public/release-notes.json'

export function PwaUpdateNotice() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)
  const [release,setRelease]=useState<{version:string;changes:string[]}|null>(null)
  const [showInstalled,setShowInstalled]=useState(()=>{try{return localStorage.getItem('carina-release-notes-seen')!==installedNotes.version}catch{return true}})
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    let active=true
    let currentRegistration: ServiceWorkerRegistration | null = null
    const inspect = () => {
      if (active&&currentRegistration?.waiting){setRegistration(currentRegistration);currentRegistration.waiting.postMessage({type:'GET_RELEASE_NOTES'})}
    }
    const receiveNotes=(event:MessageEvent)=>{
      const value=event.data?.release
      if(event.source===currentRegistration?.waiting&&event.data?.type==='RELEASE_NOTES'&&value&&typeof value.version==='string'&&Array.isArray(value.changes)&&value.changes.every((item:unknown)=>typeof item==='string'))setRelease({version:value.version,changes:value.changes})
    }
    navigator.serviceWorker.addEventListener('message',receiveNotes)
    const watchInstallingWorker = () => {
      const worker = currentRegistration?.installing
      if (!worker) return
      worker.addEventListener('statechange', inspect)
    }
    const checkForUpdate = () => {
      if (document.visibilityState === 'visible') void currentRegistration?.update().then(inspect).catch(()=>undefined)
    }
    void navigator.serviceWorker.ready.then((value) => {
      if(!active)return
      currentRegistration = value
      inspect()
      value.addEventListener('updatefound', watchInstallingWorker)
      void value.update().then(inspect).catch(()=>undefined)
    })
    document.addEventListener('visibilitychange', checkForUpdate)
    window.addEventListener('focus', checkForUpdate)
    const interval = window.setInterval(checkForUpdate, 15 * 60 * 1000)
    return () => {
      active=false
      document.removeEventListener('visibilitychange', checkForUpdate)
      window.removeEventListener('focus', checkForUpdate)
      window.clearInterval(interval)
      navigator.serviceWorker.removeEventListener('message',receiveNotes)
      currentRegistration?.removeEventListener('updatefound', watchInstallingWorker)
    }
  }, [])
  if (!registration) return showInstalled?<aside role="status" aria-label="Alterações da versão instalada" className="app-safe-toast fixed z-[70] mx-auto max-h-[70dvh] max-w-md overflow-y-auto rounded-xl border border-border bg-surface p-4 shadow-raised"><p className="font-semibold">Aplicação actualizada · {installedNotes.version}</p><p className="mt-2 text-sm font-semibold">O que mudou:</p><ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{installedNotes.changes.map((change,index)=><li key={index}>{change}</li>)}</ul><button type="button" className="mt-3 min-h-11 rounded-lg bg-primary px-4 font-semibold text-surface" onClick={()=>{setShowInstalled(false);try{localStorage.setItem('carina-release-notes-seen',installedNotes.version)}catch{/* Apenas confirmação local. */}}}>Fechar alterações</button></aside>:null
  return <aside role="status" className="app-safe-toast fixed z-[70] mx-auto max-h-[70dvh] max-w-md overflow-y-auto rounded-xl border border-border bg-surface p-4 shadow-raised"><p className="font-semibold">Actualização disponível{release?` · ${release.version}`:''}</p>{release&&<><p className="mt-2 text-sm font-semibold">O que mudou:</p><ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{release.changes.map((change,index)=><li key={index}>{change}</li>)}</ul></>}<p className="mt-2 text-sm text-text-secondary">Actualize quando for conveniente. O trabalho actual deve estar guardado.</p><button className="mt-3 min-h-11 rounded-lg bg-primary px-4 font-semibold text-surface" onClick={() => {
    navigator.serviceWorker.addEventListener('controllerchange',()=>window.location.reload(),{once:true})
    registration.waiting?.postMessage({ type:'SKIP_WAITING' })
  }}>Actualizar aplicação</button></aside>
}
