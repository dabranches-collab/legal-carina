import { useEffect, useState } from 'react'

export function PwaUpdateNotice() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    const inspect = () => void navigator.serviceWorker.getRegistration().then((value) => { if (value?.waiting) setRegistration(value) })
    void navigator.serviceWorker.getRegistration().then((value) => {
      if (!value) return
      if (value.waiting) setRegistration(value)
      value.addEventListener('updatefound', inspect)
    })
    navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true })
  }, [])
  if (!registration) return null
  return <aside role="status" className="app-safe-toast fixed z-[70] mx-auto max-w-md rounded-xl border border-border bg-surface p-4 shadow-raised"><p className="font-semibold">Actualização disponível</p><p className="mt-1 text-sm text-text-secondary">Actualize quando for conveniente. O trabalho actual deve estar guardado.</p><button className="mt-3 min-h-11 rounded-lg bg-primary px-4 font-semibold text-surface" onClick={() => registration.waiting?.postMessage({ type:'SKIP_WAITING' })}>Actualizar aplicação</button></aside>
}
