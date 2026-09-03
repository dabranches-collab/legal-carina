import { useEffect, useState } from 'react'

export function PwaUpdateNotice() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)
  const [release,setRelease]=useState<{version:string;changes:string[]}|null>(null)
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    let currentRegistration: ServiceWorkerRegistration | null = null
    const inspect = () => {
      if (currentRegistration?.waiting){setRegistration(currentRegistration);currentRegistration.waiting.postMessage({type:'GET_RELEASE_NOTES'})}
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
      if (document.visibilityState === 'visible') void currentRegistration?.update().then(inspect)
    }
    void navigator.serviceWorker.ready.then((value) => {
      currentRegistration = value
      inspect()
      value.addEventListener('updatefound', watchInstallingWorker)
      void value.update().then(inspect)
    })
    document.addEventListener('visibilitychange', checkForUpdate)
    window.addEventListener('focus', checkForUpdate)
    const interval = window.setInterval(checkForUpdate, 15 * 60 * 1000)
    return () => {
      document.removeEventListener('visibilitychange', checkForUpdate)
      window.removeEventListener('focus', checkForUpdate)
      window.clearInterval(interval)
      navigator.serviceWorker.removeEventListener('message',receiveNotes)
      currentRegistration?.removeEventListener('updatefound', watchInstallingWorker)
    }
  }, [])
  if (!registration) return null
  return <aside role="status" className="app-safe-toast fixed z-[70] mx-auto max-h-[70dvh] max-w-md overflow-y-auto rounded-xl border border-border bg-surface p-4 shadow-raised"><p className="font-semibold">Actualização disponível{release?` · ${release.version}`:''}</p>{release&&<><p className="mt-2 text-sm font-semibold">O que mudou:</p><ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{release.changes.map((change,index)=><li key={index}>{change}</li>)}</ul></>}<p className="mt-2 text-sm text-text-secondary">Actualize quando for conveniente. O trabalho actual deve estar guardado.</p><button className="mt-3 min-h-11 rounded-lg bg-primary px-4 font-semibold text-surface" onClick={() => {
    navigator.serviceWorker.addEventListener('controllerchange',()=>window.location.reload(),{once:true})
    registration.waiting?.postMessage({ type:'SKIP_WAITING' })
  }}>Actualizar aplicação</button></aside>
}
