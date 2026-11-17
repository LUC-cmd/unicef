// Fil d'Or hors réseau : l'application s'ouvre même sans connexion. Les données, elles, passent par la file
// d'attente de l'appareil (localStorage) ; l'API n'est jamais mise en cache ici.
const VERSION = 'fildor-v3'
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

// Notifications : prêt pour un envoi depuis le serveur (Web Push) ; l'application les affiche aussi elle-même quand elle est ouverte.
self.addEventListener('push', (e) => {
  let d = {}
  try { d = e.data ? e.data.json() : {} } catch { d = { body: e.data && e.data.text() } }
  e.waitUntil(self.registration.showNotification(d.title || "Fil d'Or", { body: d.body || 'Vous avez un nouveau message.', icon: '/icone-192.png', badge: '/icone-192.png', tag: 'fildor', data: { url: d.url || '/famille' } }))
})
self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const url = (e.notification.data && e.notification.data.url) || '/famille'
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then((l) => { for (const c of l) { if ('focus' in c) { c.navigate(url); return c.focus() } } return self.clients.openWindow(url) }))
})
