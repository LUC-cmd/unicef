/* Met en cache le site déjà visité, pour que les jeux continuent sans réseau.
   Les appels /api et /assistant ne sont jamais mis en cache. */
const CACHE = 'fildor-coque-1'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(['/', '/index.html', '/jeux', '/favicon.svg']))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cles) => Promise.all(cles.filter((c) => c !== CACHE).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (event.request.method !== 'GET') return
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/assistant')) return

  event.respondWith(
    fetch(event.request)
      .then((reponse) => {
        if (reponse.ok) {
          const copie = reponse.clone()
          caches.open(CACHE).then((cache) => cache.put(event.request, copie))
        }
        return reponse
      })
      .catch(() => caches.match(event.request).then((enCache) => enCache || caches.match('/index.html'))),
  )
})
