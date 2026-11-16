// Fil d'Or hors réseau : l'application s'ouvre même sans connexion. Les données, elles, passent par la file
// d'attente de l'appareil (localStorage) ; l'API n'est jamais mise en cache ici.
const VERSION = 'fildor-v2'
const COQUE = ['/', '/index.html', '/favicon.svg', '/manifest.webmanifest']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(COQUE)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((cles) => Promise.all(cles.filter((c) => c !== VERSION).map((c) => caches.delete(c))))
    .then(() => self.clients.claim()))
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  const url = new URL(req.url)
  if (req.method !== 'GET' || url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/assistant/') || url.pathname.startsWith('/telechargements/')) return

  // Pages : réseau d'abord, sinon la copie gardée. Fichiers du site : copie d'abord, mise à jour en arrière-plan.
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((r) => {
      const copie = r.clone(); caches.open(VERSION).then((c) => c.put('/index.html', copie)); return r
    }).catch(() => caches.match('/index.html')))
    return
  }
  e.respondWith(caches.match(req).then((trouve) => {
    const reseau = fetch(req).then((r) => {
      if (r.ok) { const copie = r.clone(); caches.open(VERSION).then((c) => c.put(req, copie)) }
      return r
    }).catch(() => trouve)
    return trouve || reseau
  }))
})
