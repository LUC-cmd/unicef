// Mode démonstration hors serveur : quand la famille de démonstration est ouverte en secours (le serveur ne répond pas ou
// refuse le code de démonstration), toutes les actions de l'espace famille sont traitées ici, avec des données fictives.
// Rien n'est envoyé au serveur ; l'état vit en mémoire le temps de la visite.
import { MESSAGES_SECOURS, PROCHES_SECOURS, PROFIL_SECOURS } from './secoursFamille.js'

const ZONES = [
  { code: 'GOLFE', nom: 'Golfe (Lomé)' }, { code: 'AGOE', nom: 'Agoè-Nyivé' }, { code: 'ZIO', nom: 'Zio (Tsévié)' },
  { code: 'KARA', nom: 'Kara' }, { code: 'SOKODE', nom: 'Sokodé' }, { code: 'ATAKPAME', nom: 'Atakpamé' },
]

const etat = {
  profil: JSON.parse(JSON.stringify(PROFIL_SECOURS)),
  messages: JSON.parse(JSON.stringify(MESSAGES_SECOURS)),
  reservations: [],
  naissances: [],
  suite: 100,
}

export function modeDemo(url) {
  if (!/^\/api\/public\/(famille|sms|creches|ecoute\/zones)/.test(url)) return false
  try { return !!JSON.parse(localStorage.getItem('fildor.famille.compte'))?.secours } catch { return false }
}

const copie = (x) => JSON.parse(JSON.stringify(x))
const pause = (v) => new Promise((r) => setTimeout(() => r(v), 250))

export async function demoAppeler(methode, url, corps = {}) {
  const u = url.split('?')[0]
  if (u === '/api/public/ecoute/zones') return pause(copie(ZONES))
  if (u === '/api/public/famille/connexion') return pause(copie(etat.profil))
  if (u === '/api/public/famille/code-secret') return pause({ ok: true })
  if (u === '/api/public/sms') return pause({ messages: copie(etat.messages) })
  const ok = u.match(/^\/api\/public\/sms\/(\d+)\/ok$/)
  if (ok) { etat.messages = etat.messages.map((m) => (String(m.id) === ok[1] ? { ...m, statut: 'ACQUITTE' } : m)); return pause({ ok: true }) }
  if (u === '/api/public/famille/enfants-declares') { etat.profil.enfantsDeclares = corps.nombre; return pause(copie(etat.profil)) }
  if (u === '/api/public/famille/demenagement') {
    const z = ZONES.find((x) => x.code === corps.codeZone) || ZONES[0]
    etat.profil.zoneCode = z.code; etat.profil.zone = z.nom
    return pause(copie(etat.profil))
  }
  if (u === '/api/public/famille/creches/proches') return pause(copie(PROCHES_SECOURS))
  if (u === '/api/public/famille/creches') {
    const enfants = etat.profil.enfants.filter((e) => e.statut === 'ENFANT' && e.ageMois >= 12).map((e) => ({ codeEnfant: e.codeEnfant, ageMois: e.ageMois }))
    return pause({ enfants, reservations: copie(etat.reservations) })
  }
  const res = u.match(/^\/api\/public\/creches\/([^/]+)\/reserver$/)
  if (res) {
    const c = PROCHES_SECOURS.find((p) => p.creche.code === res[1])?.creche
    etat.reservations.push({ id: ++etat.suite, nomCreche: c?.nom || 'Crèche (fictive)', codeEnfant: corps.codeEnfant, dateJour: corps.dateJour, formule: corps.formule, heureArrivee: corps.heureArrivee, heureDepart: corps.heureDepart, note: corps.note || '', statut: 'DEMANDEE' })
    return pause({ message: 'Demande envoyée à la crèche (démonstration). Elle vous répondra pour confirmer.' })
  }
  const ann = u.match(/^\/api\/public\/creches\/reservations\/(\d+)\/annuler$/)
  if (ann) { etat.reservations = etat.reservations.filter((r) => String(r.id) !== ann[1]); return pause({ ok: true }) }
  if (u === '/api/public/famille/naissances') return pause(copie(etat.naissances))
  if (u === '/api/public/famille/naissance') {
    etat.naissances.push({ id: ++etat.suite, codeEnfant: corps.codeEnfant, dateNaissance: corps.dateNaissance, statut: 'A_VERIFIER', envoyeLe: new Date().toISOString() })
    return pause({ ok: true, message: 'Déclaration envoyée à votre agent de santé (démonstration).' })
  }
  return pause({ ok: true })
}
