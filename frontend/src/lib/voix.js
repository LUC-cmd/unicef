/**
 * Voix en langue locale : une locutrice enregistre chaque message (éwé, kabiyè, mina) et un traducteur saisit le texte.
 * Tout est gardé sur l'appareil (IndexedDB pour le son, localStorage pour le texte). Fil d'Or ne traduit rien lui-même :
 * aucune traduction de santé n'est inventée.
 */
export const LANGUES_LOCALES = ['Éwé', 'Kabiyè', 'Mina']
export const cleMessage = (langue, profil, i) => `${langue}|${profil}|${i}`

const BASE = 'fildor-voix'
function ouvrir() {
  return new Promise((ok, ko) => {
    if (typeof indexedDB === 'undefined') { ko(new Error('Stockage indisponible')); return }
    const r = indexedDB.open(BASE, 1)
    r.onupgradeneeded = () => r.result.createObjectStore('voix', { keyPath: 'cle' })
    r.onsuccess = () => ok(r.result)
    r.onerror = () => ko(r.error)
  })
}
const tx = async (mode, f) => {
  const db = await ouvrir()
  return new Promise((ok, ko) => { const t = db.transaction('voix', mode); const req = f(t.objectStore('voix')); t.oncomplete = () => { db.close(); ok(req?.result) }; t.onerror = () => { db.close(); ko(t.error) } })
}
export const lireVoix = (cle) => tx('readonly', (s) => s.get(cle)).catch(() => undefined)
export const toutesLesVoix = () => tx('readonly', (s) => s.getAll()).catch(() => [])
export async function ecrireVoix(cle, { texte, blob }) {
  const avant = (await lireVoix(cle)) ?? { cle }
  await tx('readwrite', (s) => s.put({ ...avant, ...(texte !== undefined ? { texte } : {}), ...(blob !== undefined ? { blob } : {}) }))
}
export const effacerVoix = (cle) => tx('readwrite', (s) => s.delete(cle))

/** Démarre un enregistrement ; retourne { arreter(): Promise<Blob> }. Coupe seul après 60 secondes. */
export async function enregistrer() {
  const flux = await navigator.mediaDevices.getUserMedia({ audio: true })
  const rec = new MediaRecorder(flux)
  const morceaux = []
  rec.ondataavailable = (e) => { if (e.data.size) morceaux.push(e.data) }
  const fini = new Promise((ok) => { rec.onstop = () => { flux.getTracks().forEach((t) => t.stop()); ok(new Blob(morceaux, { type: rec.mimeType || 'audio/webm' })) } })
  rec.start()
  const minuteur = setTimeout(() => { if (rec.state !== 'inactive') rec.stop() }, 60000)
  return { arreter: () => { clearTimeout(minuteur); if (rec.state !== 'inactive') rec.stop(); return fini } }
}

export function jouer(blob) {
  const url = URL.createObjectURL(blob)
  const a = new Audio(url)
  a.onended = () => URL.revokeObjectURL(url)
  return a.play()
}
