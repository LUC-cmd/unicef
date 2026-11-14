// Appels au serveur. Les identifiants (HTTP Basic) restent en mémoire de l'onglet (sessionStorage), jamais en dur.

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

async function appeler(methode, url, corps, extraEntetes = {}) {
  let reponse
  try {
    reponse = await fetch(url, {
      method: methode,
      headers: { 'Content-Type': 'application/json', ...enteteAuth(), ...extraEntetes },
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

export const api = {
  get: (url) => appeler('GET', url),
  post: (url, corps) => appeler('POST', url, corps ?? {}),
  put: (url, corps) => appeler('PUT', url, corps ?? {}),
  del: (url) => appeler('DELETE', url),

  async connexion(username, motDePasse) {
    const jeton = btoa(unescape(encodeURIComponent(`${username}:${motDePasse}`)))
    const moi = await appeler('GET', '/api/auth/me', undefined, { Authorization: `Basic ${jeton}` })
    const session = { jeton, ...moi }
    ecrireSession(session)
    return session
  },
  deconnexion: () => ecrireSession(null),
}
