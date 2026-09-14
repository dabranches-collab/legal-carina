const CACHE = 'carina-legal-shell-__APP_VERSION__'
const RELEASE_NOTES = /*__RELEASE_NOTES__*/ null
const SHELL = ['/', '/manifest.webmanifest', '/app-icon.svg', '/app-icon-192.png', '/app-icon-512.png', '/favicon.svg']
self.addEventListener('install', (event) => event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL))))
self.addEventListener('activate', (event) => event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim())))
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return
  event.respondWith(fetch(event.request).then((response) => {
    if (response.ok) void caches.open(CACHE).then((cache) => cache.put(event.request, response.clone()))
    return response
  }).catch(() => caches.match(event.request).then((cached) => cached || caches.match('/'))))
})
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') void self.skipWaiting()
  if (event.data?.type === 'GET_RELEASE_NOTES') event.source?.postMessage({type:'RELEASE_NOTES',release:RELEASE_NOTES})
})
