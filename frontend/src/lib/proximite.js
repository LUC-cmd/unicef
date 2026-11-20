import { distanceKm, lienItineraire } from './geo.js'

/** Trie des lieux (avec lat, lng) du plus proche au plus loin, à vol d'oiseau. */
export const trierParDistance = (moi, lieux) => lieux.map((l) => ({ ...l, km: Math.round(distanceKm(moi.lat, moi.lng, l.lat, l.lng) * 10) / 10 })).sort((a, b) => a.km - b.km)
export const itineraireVers = (l) => lienItineraire(l.lat, l.lng)
/** Demande la position une fois, sur ce téléphone ; elle n'est ni gardée ni envoyée. */
export function positionActuelle() {
  return new Promise((ok, ko) => {
    if (!navigator.geolocation) return ko(new Error('Ce téléphone ne donne pas sa position. Choisis ton village.'))
    navigator.geolocation.getCurrentPosition((p) => ok({ lat: p.coords.latitude, lng: p.coords.longitude }), () => ko(new Error('Position refusée ou indisponible. Choisis ton village.')), { timeout: 10000, maximumAge: 60000 })
  })
}
