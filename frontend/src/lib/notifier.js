// Notification de l'appareil quand l'application est ouverte (prête pour un envoi depuis le serveur : voir sw.js).
export async function afficherNotification(titre, corps, url = '/') {
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted') return
    const reg = await navigator.serviceWorker?.getRegistration()
    if (reg) return reg.showNotification(titre, { body: corps, icon: '/icone-192.png', badge: '/icone-192.png', tag: 'fildor-creche', data: { url } })
    new Notification(titre, { body: corps, icon: '/icone-192.png' })
  } catch { /* notification refusée par l'appareil */ }
}
