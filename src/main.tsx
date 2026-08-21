import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

if (import.meta.env.DEV || import.meta.env.VITE_APP_ENV === 'test') {
  const params = new URLSearchParams(window.location.search)
  if (params.get('qa-iphone') === '1') {
    const safeTop = Number(params.get('safe-top'))
    const safeBottom = Number(params.get('safe-bottom') ?? '34')
    const safeLeft = Number(params.get('safe-left') ?? '0')
    const safeRight = Number(params.get('safe-right') ?? '0')
    if (Number.isFinite(safeTop)) document.documentElement.style.setProperty('--qa-safe-top', `${safeTop}px`)
    if (Number.isFinite(safeBottom)) document.documentElement.style.setProperty('--qa-safe-bottom', `${safeBottom}px`)
    if (Number.isFinite(safeLeft)) document.documentElement.style.setProperty('--qa-safe-left', `${safeLeft}px`)
    if (Number.isFinite(safeRight)) document.documentElement.style.setProperty('--qa-safe-right', `${safeRight}px`)
    document.documentElement.dataset.qaIphone = 'true'
    document.documentElement.dataset.qaDisplayMode = params.get('display-mode') === 'browser' ? 'browser' : 'standalone'
    document.documentElement.dataset.qaTheme = params.get('theme') === 'dark' ? 'dark' : 'light'
  }
}

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => void navigator.serviceWorker.register('/sw.js'))
} else if ('serviceWorker' in navigator) {
  void navigator.serviceWorker.getRegistrations().then(registrations => Promise.all(registrations.map(registration => registration.unregister())))
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
