/**
 * Client du réseau Fil d'Or (service assistant). Marche aussi sans réseau : ce qui ne part pas est gardé
 * sur l'appareil et renvoyé dès que la connexion revient.
 */
import { orienter as orienterLocal, creerAlerte as alerteLocale, ALPHABET_CODE } from './parcours.js'

const BASE = '/assistant/reseau'
const CLE_SESSION = 'fildor.reseau.session'
const CLE_SORTIE = 'fildor.reseau.sortie'

export class ErreurReseau extends Error {
  constructor(message, statut) { super(message); this.statut = statut }
}

async function appel(methode, chemin, corps, jeton, delai = 7000) {
  const ctrl = new AbortController()
  const minuteur = setTimeout(() => ctrl.abort(), delai)
  try {
    const r = await fetch(`${BASE}/${chemin}`, {
      method: methode, signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', ...(jeton ? { Authorization: `Bearer ${jeton}` } : {}) },
      body: corps === undefined ? undefined : JSON.stringify(corps),
    })
    let donnees = null
    try { donnees = await r.json() } catch { donnees = null }
    if (!r.ok) throw new ErreurReseau(donnees?.detail || 'Le service ne répond pas.', r.status)
    return donnees
  } catch (e) {
    if (e instanceof ErreurReseau) throw e
    throw new ErreurReseau('Pas de réseau pour le moment.', 0)
  } finally { clearTimeout(minuteur) }
}
export const reseau = {
  get: (chemin, jeton) => appel('GET', chemin, undefined, jeton),
  post: (chemin, corps, jeton) => appel('POST', chemin, corps ?? {}, jeton),
  patch: (chemin, corps, jeton) => appel('PATCH', chemin, corps ?? {}, jeton),
}

/* ---------- session d'un espace professionnel (onglet) ---------- */
export function lireSessionReseau() { try { return JSON.parse(sessionStorage.getItem(CLE_SESSION) || 'null') } catch { return null } }
export function ecrireSessionReseau(s) { try { if (s) sessionStorage.setItem(CLE_SESSION, JSON.stringify(s)); else sessionStorage.removeItem(CLE_SESSION) } catch { /* refusé */ } }

/* ---------- envoyer, ou garder jusqu'au retour du réseau ---------- */
const lireSortie = () => { try { return JSON.parse(localStorage.getItem(CLE_SORTIE) || '[]') } catch { return [] } }
const ecrireSortie = (l) => { try { localStorage.setItem(CLE_SORTIE, JSON.stringify(l.slice(-200))) } catch { /* plein */ } }
export const nombreEnAttente = () => lireSortie().length

/** Identifiant d'envoi : le service ignore un second envoi portant le même identifiant (pas de doublon après une coupure). */
export function idEnvoi() {
  const a = new Uint32Array(4); crypto.getRandomValues(a)
  return 'e' + Array.from(a, (x) => x.toString(36)).join('')
}
const AVEC_ID = ['alertes', 'visites', 'references']

export async function envoyerOuGarder(chemin, corps) {
  if (AVEC_ID.includes(chemin) && !corps.idClient) corps = { ...corps, idClient: idEnvoi() }
  try { return { ok: true, donnees: await reseau.post(chemin, corps, lireSessionReseau()?.jeton) } } catch (e) {
    if (e.statut && e.statut !== 0) return { ok: false, refuse: true, erreur: e.message }
    ecrireSortie([...lireSortie(), { chemin, corps, date: Date.now() }])
    return { ok: false, gardee: true }
  }
}
export async function synchroniser() {
  const restes = []
  let envoyes = 0
  for (const x of lireSortie()) {
    try { await reseau.post(x.chemin, x.corps, lireSessionReseau()?.jeton); envoyes++ } catch (e) { if (!e.statut) restes.push(x) /* les refus définitifs sont abandonnés */ }
  }
  ecrireSortie(restes)
  return envoyes
}
if (typeof window !== 'undefined') window.addEventListener('online', () => { synchroniser() })

/* ---------- orientation : l'assistant du service, sinon les mêmes règles sur l'appareil ---------- */
export async function orienterAvecAssistant({ cas, signes, village, texte }) {
  try {
    const r = await reseau.post('orienter', { cas, signes, village, texte })
    return { ...r, source: 'assistant' }
  } catch {
    return { ...orienterLocal({ cas, signes, village }), source: 'appareil' }
  }
}

/** Prévenir un centre. Sans réseau, l'alerte est gardée et partira dès que possible (et reste visible ici). */
export async function prevenirCentre({ centreId, cas, niveau, signes, depuis }) {
  const r = await envoyerOuGarder('alertes', { centreId, cas, niveau, signes, depuis })
  if (!r.ok) alerteLocale({ centreId, cas, niveau, signes, depuis })
  return r
}

/* ---------- questions anonymes : le code est choisi sur l'appareil, donc disponible même sans réseau ---------- */
export function codeAleatoire() {
  const a = new Uint32Array(8); crypto.getRandomValues(a)
  return Array.from(a, (x) => ALPHABET_CODE[x % ALPHABET_CODE.length]).join('')
}
