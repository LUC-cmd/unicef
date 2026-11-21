import { useEffect, useState } from 'react'
import { lireSessionReseau } from './reseauClient.js'

/**
 * Espace fermé : tant qu'une personne est connectée (agent, centre, école, famille…), elle reste dans son espace.
 * Elle ne revient sur le site public que si elle le demande (« Quitter l'espace »), sans être déconnectée.
 */
const CLE = 'fildor.dehors'
const PREFIXES_JAVA = /^\/(agent|mairie|structure|carte|admin|carnet)(\/|$)/
const VERS_FAMILLE = { '/jeux': '/famille/jeux', '/assistant': '/famille/assistant', '/grossesse': '/famille/grossesse', '/acte': '/famille/acte' }

export const lireDehors = () => { try { return sessionStorage.getItem(CLE) === '1' } catch { return false } }
export function ecrireDehors(v) {
  try { if (v) sessionStorage.setItem(CLE, '1'); else sessionStorage.removeItem(CLE) } catch { /* refusé */ }
  window.dispatchEvent(new Event('fildor-dehors'))
}

export function useDehors() {
  const [d, setD] = useState(lireDehors)
  useEffect(() => {
    const maj = () => setD(lireDehors())
    window.addEventListener('fildor-dehors', maj)
    return () => window.removeEventListener('fildor-dehors', maj)
  }, [])
  return d
}

export function useSessionReseau() {
  const [s, setS] = useState(lireSessionReseau)
  useEffect(() => {
    const maj = () => setS(lireSessionReseau())
    window.addEventListener('fildor-reseau', maj)
    return () => window.removeEventListener('fildor-reseau', maj)
  }, [])
  return s
}

/** L'espace de la personne connectée : { base, estDans(chemin) } ou null si personne n'est connecté. */
export function espaceDe({ session, reseauSession, compteFamille, accueilRole }) {
  if (session) return { base: accueilRole[session.role] ?? '/', estDans: (c) => PREFIXES_JAVA.test(c) }
  if (reseauSession) return { base: '/reseau', estDans: (c) => /^\/reseau(\/|$)/.test(c) }
  if (compteFamille) return { base: '/famille', estDans: (c) => /^\/famille(\/|$)/.test(c), vers: (c) => VERS_FAMILLE[c] }
  return null
}

/** Le même identifiant de personne tant qu'elle reste connectée : un changement = nouvelle connexion. */
export const identiteConnectee = ({ session, reseauSession, compteFamille }) =>
  session ? `j:${session.username ?? session.role}` : reseauSession ? `r:${reseauSession.identifiant}` : compteFamille ? `f:${compteFamille.codeFamille}` : ''

export function useNouvelleConnexion(identite) {
  useEffect(() => {
    // Une vraie nouvelle connexion (identité différente de la précédente dans cet onglet) rouvre l'espace ; un simple rechargement non.
    try {
      const avant = sessionStorage.getItem('fildor.identite') || ''
      if (identite && identite !== avant) ecrireDehors(false)
      if (identite) sessionStorage.setItem('fildor.identite', identite); else sessionStorage.removeItem('fildor.identite')
    } catch { if (identite) ecrireDehors(false) }
  }, [identite])
}
