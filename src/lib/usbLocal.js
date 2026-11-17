// Dialogue avec le logiciel Windows pour les clés USB (le site seul ne peut pas lire les lecteurs de l'ordinateur).
import { useCallback, useEffect, useState } from 'react'

export const dansLogiciel = () => Boolean(globalThis.FILDOR_CONFIG?.logiciel)
const ENTETE = { 'X-Fildor': '1' }

async function appel(url, options = {}) {
  const r = await fetch(url, { ...options, headers: { ...ENTETE, ...(options.headers ?? {}) }, signal: AbortSignal.timeout(15000) })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(j.erreur || `Erreur ${r.status}`)
  return j
}

export const listerCles = () => appel('/local/cles').then((j) => j.cles)
export const lireSurCle = (id, nom) => appel(`/local/cles/lire?id=${encodeURIComponent(id)}&nom=${encodeURIComponent(nom)}`).then((j) => j.contenu)
export const ecrireSurCle = (id, nom, contenu) => appel('/local/cles/ecrire', { method: 'POST', body: JSON.stringify({ id, nom, contenu }) })

/** Les clés branchées, rafraîchies toutes les 2,5 secondes tant que l'écran est ouvert. null = pas dans le logiciel. */
export function useCles() {
  const actif = dansLogiciel()
  const [cles, setCles] = useState(actif ? [] : null)
  const [erreur, setErreur] = useState('')
  const rafraichir = useCallback(async () => {
    if (!actif) return
    try { setCles(await listerCles()); setErreur('') } catch (e) { setErreur(e.message) }
  }, [actif])
  useEffect(() => {
    if (!actif) return undefined
    rafraichir()
    const t = setInterval(rafraichir, 2500)
    return () => clearInterval(t)
  }, [actif, rafraichir])
  return { cles, erreur, rafraichir }
}

export const taille = (o) => (o >= 1e9 ? `${(o / 1e9).toFixed(1).replace('.', ',')} Go` : o >= 1e6 ? `${Math.round(o / 1e6)} Mo` : `${Math.max(1, Math.round(o / 1e3))} Ko`)
