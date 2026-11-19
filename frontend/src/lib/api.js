// Appels au serveur. Les identifiants (HTTP Basic) restent en mémoire de l'onglet (sessionStorage), jamais en dur.

import { annoncer, estLecture, etiquette, occupe } from './retours.js'

const CLE_SESSION = 'fildor.session'

export function lireSession() {
  try {
    return JSON.parse(sessionStorage.getItem(CLE_SESSION) || 'null')
  } catch {
    return null
  }
}

export function ecrireSession(session) {
  if (session) sessionStorage.setItem(CLE_SESSION, JSON.stringify(session))
  else sessionStorage.removeItem(CLE_SESSION)
}

function enteteAuth() {
  const s = lireSession()
  return s?.jeton ? { Authorization: `Basic ${s.jeton}` } : {}
}

export class ErreurApi extends Error {
  constructor(message, statut) {
    super(message)
    this.statut = statut
  }
}

// Code secret de la famille connectée : envoyé avec les appels de son espace, jamais ailleurs.
let secretFamille = ''
try { secretFamille = JSON.parse(localStorage.getItem('fildor.famille.compte'))?.secret || '' } catch { secretFamille = '' }
export const definirSecretFamille = (s) => { secretFamille = s || '' }

async function appeler(methode, url, corps, extraEntetes = {}) {
  let reponse
  try {
    reponse = await fetch(url, {
      method: methode,
      headers: { 'Content-Type': 'application/json', ...enteteAuth(), ...(secretFamille && url.startsWith('/api/public/') ? { 'X-Fildor-Secret': secretFamille } : {}), ...extraEntetes },
      body: corps === undefined ? undefined : JSON.stringify(corps),
      signal: AbortSignal.timeout(8000),
    })
  } catch {
    throw new ErreurApi('Pas de réseau. Réessayez quand le réseau revient.', 0)
  }
  let donnees = null
  const texte = await reponse.text()
  if (texte) {
    try {
      donnees = JSON.parse(texte)
    } catch {
      donnees = null
    }
  }
  if (!reponse.ok) {
    throw new ErreurApi(donnees?.erreur || `Erreur ${reponse.status}`, reponse.status)
  }
  return donnees
}

// Enveloppe : barre de progression + notification de succès ou d'échec pour chaque action.
async function suivre(methode, url, corps) {
  const modifie = methode !== 'GET' && !estLecture(url)
  occupe(1)
  try {
    const r = await appeler(methode, url, corps)
    if (modifie) annoncer('succes', (r && typeof r.message === 'string' && r.message) || etiquette(url) || 'Enregistré')
    return r
  } catch (e) {
    if (methode !== 'GET') {
      annoncer(e.statut === 0 ? 'info' : 'erreur', e.statut === 0 ? 'Pas de réseau : action non envoyée. Réessayez ou utilisez le mode hors réseau.' : e.message)
    }
    throw e
  } finally {
    occupe(-1)
  }
}

export const api = {
  get: (url) => suivre('GET', url),
  post: (url, corps) => suivre('POST', url, corps ?? {}),
  put: (url, corps) => suivre('PUT', url, corps ?? {}),
  del: (url) => suivre('DELETE', url),

  async connexion(username, motDePasse) {
    const jeton = btoa(unescape(encodeURIComponent(`${username}:${motDePasse}`)))
    const moi = await appeler('GET', '/api/auth/me', undefined, { Authorization: `Basic ${jeton}` })
    const session = { jeton, ...moi }
    ecrireSession(session)
    return session
  },
  deconnexion: () => ecrireSession(null),
}
