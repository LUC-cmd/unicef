import { ajouterJours, ecrireEspace, lireEspace } from './adolescente.js'
import { creerCartePerso, lireCartePerso } from './cartePerso.js'

/** Compte « jeune fille » de démonstration : un pseudo, aucun nom. Tout reste sur ce téléphone. */
const CLE = 'fildor.fille'
// Session de l'onglet seulement : un lien ouvert plus tard n'enferme pas dans l'espace jeune fille.
export const lireFille = () => { try { return JSON.parse(sessionStorage.getItem(CLE) || 'null') } catch { return null } }
const signaler = () => { try { window.dispatchEvent(new Event('fildor-fille')) } catch { /* ignoré */ } }
export const sortirFille = () => { try { sessionStorage.removeItem(CLE); localStorage.removeItem(CLE); sessionStorage.removeItem(CLE_OK) } catch { /* refusé */ } signaler() }

/** Surnom modifiable : le compte reste anonyme, seul le surnom affiché change. */
export function modifierPseudo(pseudo) {
  const f = lireFille(); if (!f) return
  const p = String(pseudo || '').trim().slice(0, 24)
  if (p.length < 2 || /[@\d]{6,}|https?:/i.test(p)) throw new Error('Choisis un surnom de 2 à 24 lettres, sans numéro ni adresse.')
  try { sessionStorage.setItem(CLE, JSON.stringify({ ...f, pseudo: p })) } catch { /* refusé */ }
  signaler()
}

/** Code secret facultatif (4 à 6 chiffres) pour ouvrir l'espace ; seule son empreinte reste sur le téléphone. */
const CLE_PIN = 'fildor.fille.pin'
const CLE_OK = 'fildor.fille.ok'
async function empreinte(pin) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('fildor:' + pin)); return Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, '0')).join('') }
export const aUnPin = () => { try { return Boolean(localStorage.getItem(CLE_PIN)) } catch { return false } }
export const verrouille = () => { try { return aUnPin() && sessionStorage.getItem(CLE_OK) !== '1' } catch { return false } }
export async function definirPin(pin) {
  if (!/^\d{4,6}$/.test(pin)) throw new Error('Le code secret fait 4 à 6 chiffres.')
  localStorage.setItem(CLE_PIN, await empreinte(pin)); sessionStorage.setItem(CLE_OK, '1'); signaler()
}
export function retirerPin() { try { localStorage.removeItem(CLE_PIN); sessionStorage.removeItem(CLE_OK) } catch { /* refusé */ } signaler() }
export async function verifierPin(pin) {
  const ok = (await empreinte(pin)) === localStorage.getItem(CLE_PIN)
  if (ok) { try { sessionStorage.setItem(CLE_OK, '1') } catch { /* refusé */ } signaler() }
  return ok
}

/** Messages que cette fille a écrits dans l'espace de partage (identifiants seulement, sur ce téléphone). */
const CLE_MES = 'fildor.fille.mesPartages'
const CLE_VUS = 'fildor.fille.vus'
export const lireMesPartages = () => { try { return JSON.parse(localStorage.getItem(CLE_MES) || '[]') } catch { return [] } }
export function noterMonPartage(id) { try { localStorage.setItem(CLE_MES, JSON.stringify([id, ...lireMesPartages()].slice(0, 30))) } catch { /* refusé */ } }
export const lireVus = () => { try { return JSON.parse(localStorage.getItem(CLE_VUS) || '{}') } catch { return {} } }
export function noterVus(suivi) { try { localStorage.setItem(CLE_VUS, JSON.stringify(Object.fromEntries(Object.entries(suivi).map(([k, v]) => [k, v.commentaires])))) } catch { /* refusé */ } signaler() }
export function entrerFille() {
  const code = creerCartePerso()
  const e = lireEspace()
  // Données fictives pour que le tableau de bord soit déjà rempli : quatre débuts de règles, 29 jours d'écart environ.
  if (!e.historique?.length) {
    const auj = new Date().toISOString().slice(0, 10)
    const dernier = ajouterJours(auj, -11)
    ecrireEspace({ ...e, debut: dernier, duree: 29, historique: [ajouterJours(dernier, -87), ajouterJours(dernier, -58), ajouterJours(dernier, -29), dernier] })
  }
  const f = { pseudo: `FILLE-${code.slice(0, 4)}`, depuis: new Date().toISOString().slice(0, 10) }
  try { sessionStorage.setItem(CLE, JSON.stringify(f)); localStorage.removeItem(CLE) } catch { /* refusé */ }
  signaler()
  return f
}
export { lireCartePerso }
