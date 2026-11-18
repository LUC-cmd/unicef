// Localisation : trouver les structures proches et guider la famille vers elles, sans jamais enregistrer
// une position. La position du navigateur sert une fois, sur cet appareil : rien n'est envoyé au serveur.
// Un lien d'itinéraire ouvre l'application de cartes du téléphone (Google Maps ou OpenStreetMap).

export function distanceKm(lat1, lon1, lat2, lon2) {
  if ([lat1, lon1, lat2, lon2].some((v) => v == null || Number.isNaN(Number(v)))) return null
  const r = 6371.0
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return 2 * r * Math.asin(Math.sqrt(a))
}

export function formaterKm(km) {
  if (km == null) return ''
  return km < 1 ? `à ${Math.round(km * 1000)} m` : `à environ ${km < 10 ? km.toFixed(1) : Math.round(km)} km`
}

/** Lien « suivre la route » : destination seulement, le téléphone calcule l'itinéraire réel. */
export function lienItineraire(lat, lon) {
  if (lat == null || lon == null) return null
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`
}

/** Lien carte (OpenStreetMap) : marche sur tout téléphone, même sans application Google. */
export function lienCarte(lat, lon) {
  if (lat == null || lon == null) return null
  const m = Math.max(1e-6, 0.012)
  return `https://www.openstreetmap.org/#map=15/${lat}/${lon}`
}

/** Demande la position une fois (l'utilisateur doit accepter). Ne jamais la stocker ni l'envoyer. */
export function positionUneFois() {
  return new Promise((resoudre) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return resoudre(null)
    navigator.geolocation.getCurrentPosition(
      (p) => resoudre({ lat: p.coords.latitude, lon: p.coords.longitude }),
      () => resoudre(null),
      { timeout: 8000, maximumAge: 60000 },
    )
  })
}
