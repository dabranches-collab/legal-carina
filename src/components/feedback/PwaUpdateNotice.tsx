import { useEffect, useState } from 'react'
import installedNotes from 'virtual:release-notes'
import { changesSince,type ReleaseNotes } from './releaseNotes'

export function PwaUpdateNotice() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)
  const [release,setRelease]=useState<ReleaseNotes|null>(null)
  const [activeVersion,setActiveVersion]=useState<string|null>(null)
  const [activeChecked,setActiveChecked]=useState(false)
  const [installedFrom]=useState(()=>{try{return localStorage.getItem('carina-release-notes-from')||localStorage.getItem('carina-release-notes-seen')}catch{return null}})
  const [showInstalled,setShowInstalled]=useState(()=>{try{return localStorage.getItem('carina-release-notes-seen')!==installedNotes.version}catch{return true}})
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    let active=true
    let currentRegistration: ServiceWorkerRegistration | null = null
    let activeWorker: ServiceWorker | null = null
    let activeTimeout: number | undefined
    const inspect = () => {
      if (active&&currentRegistration?.waiting){setRegistration(currentRegistration);currentRegistration.waiting.postMessage({type:'GET_RELEASE_NOTES'})}
    }
    const receiveNotes=(event:MessageEvent)=>{
      const value=event.data?.release
      if(event.data?.type!=='RELEASE_NOTES'||!value||typeof value.version!=='string')return
      if(event.source===activeWorker){setActiveVersion(value.version);setActiveChecked(true);if(activeTimeout)window.clearTimeout(activeTimeout)}
      if(event.source===currentRegistration?.waiting&&Array.isArray(value.changes)&&value.changes.every((item:unknown)=>typeof item==='string'))setRelease(value as ReleaseNotes)
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
      activeWorker=navigator.serviceWorker.controller??value.active
      if(activeWorker){activeWorker.postMessage({type:'GET_RELEASE_NOTES'});activeTimeout=window.setTimeout(()=>setActiveChecked(true),2000)}
      else setActiveChecked(true)
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
      if(activeTimeout)window.clearTimeout(activeTimeout)
      navigator.serviceWorker.removeEventListener('message',receiveNotes)
      currentRegistration?.removeEventListener('updatefound', watchInstallingWorker)
    }
  }, [])
  const installedChanges=changesSince(installedNotes,installedFrom)
  if (!registration) return showInstalled&&installedChanges.length?<aside role="status" aria-label="Alterações da versão instalada" className="app-safe-toast fixed z-[70] mx-auto max-h-[70dvh] max-w-md overflow-y-auto rounded-xl border border-border bg-surface p-4 shadow-raised"><p className="font-semibold">Aplicação actualizada · {installedNotes.version}</p><p className="mt-2 text-sm font-semibold">{installedFrom?`O que mudou desde ${installedFrom}:`:'O que mudou:'}</p><ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{installedChanges.map((change,index)=><li key={index}>{change}</li>)}</ul><button type="button" className="mt-3 min-h-11 rounded-lg bg-primary px-4 font-semibold text-surface" onClick={()=>{setShowInstalled(false);try{localStorage.setItem('carina-release-notes-seen',installedNotes.version);localStorage.removeItem('carina-release-notes-from')}catch{/* Apenas confirmação local. */}}}>Fechar alterações</button></aside>:null
  // O HTML pode já ser novo enquanto o service worker da mesma versão aguarda activação.
  const fromVersion=activeVersion??(release?.version===installedNotes.version?null:installedNotes.version)
  const availableChanges=release&&activeChecked&&fromVersion?changesSince(release,fromVersion):[]
  return <aside role="status" className="app-safe-toast fixed z-[70] mx-auto max-h-[70dvh] max-w-md overflow-y-auto rounded-xl border border-border bg-surface p-4 shadow-raised"><p className="font-semibold">Actualização disponível{release?` · ${release.version}`:''}</p>{release&&activeChecked&&fromVersion&&<><p className="mt-2 text-sm font-semibold">O que muda desde {fromVersion}:</p><ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{availableChanges.map((change,index)=><li key={index}>{change}</li>)}</ul></>}{release&&activeChecked&&!fromVersion&&<p className="mt-2 text-sm">Não foi possível confirmar a versão instalada neste equipamento.</p>}{release&&!activeChecked&&<p className="mt-2 text-sm">A obter alterações…</p>}<p className="mt-2 text-sm text-text-secondary">Actualize quando for conveniente. O trabalho actual deve estar guardado.</p><button className="mt-3 min-h-11 rounded-lg bg-primary px-4 font-semibold text-surface" disabled={!release||!activeChecked} onClick={() => {
    try{localStorage.setItem('carina-release-notes-from',fromVersion??release?.version??installedNotes.version)}catch{/* Apenas registo local da versão de origem. */}
    navigator.serviceWorker.addEventListener('controllerchange',()=>window.location.reload(),{once:true})
    registration.waiting?.postMessage({ type:'SKIP_WAITING' })
  }}>Actualizar aplicação</button></aside>
}
