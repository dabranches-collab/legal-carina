import { useEffect, useState } from 'react'

export function PwaUpdateNotice() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    let currentRegistration: ServiceWorkerRegistration | null = null
    const inspect = () => {
      if (currentRegistration?.waiting) setRegistration(currentRegistration)
    }
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
    const reload = () => window.location.reload()
    navigator.serviceWorker.addEventListener('controllerchange', reload, { once: true })
    return () => {
      document.removeEventListener('visibilitychange', checkForUpdate)
      window.removeEventListener('focus', checkForUpdate)
      window.clearInterval(interval)
      navigator.serviceWorker.removeEventListener('controllerchange', reload)
      currentRegistration?.removeEventListener('updatefound', watchInstallingWorker)
    }
  }, [])
  if (!registration) return null
  return <aside role="status" className="app-safe-toast fixed z-[70] mx-auto max-w-md rounded-xl border border-border bg-surface p-4 shadow-raised"><p className="font-semibold">Actualização disponível</p><p className="mt-1 text-sm text-text-secondary">Actualize quando for conveniente. O trabalho actual deve estar guardado.</p><button className="mt-3 min-h-11 rounded-lg bg-primary px-4 font-semibold text-surface" onClick={() => registration.waiting?.postMessage({ type:'SKIP_WAITING' })}>Actualizar aplicação</button></aside>
}
