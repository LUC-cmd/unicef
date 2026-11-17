// Transport des saisies hors réseau par clé USB : on écrit la file d'attente dans un fichier,
// on porte le fichier là où il y a du réseau, on le charge dans Fil d'Or, et il part dans la base.
// Chaque élément garde son identifiant : charger deux fois le même fichier ne crée aucun doublon.

import { lireFile, nombreEnAttente } from './offline.js'

export const FORMAT = 'fildor-cle'
const LISTES = ['visites', 'declarations', 'inscriptions', 'accouchements', 'prenoms']

export async function somme(texte) {
  const octets = new TextEncoder().encode(texte)
  const h = await globalThis.crypto.subtle.digest('SHA-256', octets)
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Contenu du fichier à copier sur la clé. */
export async function construireFichier(agent, file = lireFile(), maintenant = new Date(), zone = '') {
  const complet = zone ? appliquerZone(file, zone) : file
  const donnees = JSON.stringify(Object.fromEntries(LISTES.map((l) => [l, complet[l] ?? []])))
  return JSON.stringify({
    format: FORMAT, version: 1, creeLe: maintenant.toISOString(), agent: agent || '', zone: zone || '',
    nombre: nombreEnAttente(file), somme: await somme(donnees), donnees,
  }, null, 1)
}

export function nomFichier(maintenant = new Date()) {
  const p = (n) => String(n).padStart(2, '0')
  return `fildor-cle-${maintenant.getFullYear()}${p(maintenant.getMonth() + 1)}${p(maintenant.getDate())}-${p(maintenant.getHours())}${p(maintenant.getMinutes())}.json`
}

/** Lit un fichier de clé. Lève une Error au message clair s'il est abîmé ou d'un autre logiciel. */
export async function lireFichier(texte) {
  let c
  try { c = JSON.parse(texte) } catch { throw new Error("Ce fichier n'est pas un fichier Fil d'Or.") }
  if (c?.format !== FORMAT || typeof c.donnees !== 'string') throw new Error("Ce fichier n'est pas un fichier Fil d'Or.")
  if ((await somme(c.donnees)) !== c.somme) throw new Error('Fichier abîmé (copie interrompue ?). Recopiez-le depuis le téléphone.')
  let d
  try { d = JSON.parse(c.donnees) } catch { throw new Error('Fichier abîmé.') }
  const file = {}
  for (const l of LISTES) file[l] = Array.isArray(d[l]) ? d[l] : []
  return { file, agent: c.agent, creeLe: c.creeLe, zone: c.zone || '' }
}

/** Les inscriptions faites sans connaître la zone reçoivent celle indiquée (le serveur en a besoin pour un administrateur). */
export function appliquerZone(file, zone) {
  return { ...file, inscriptions: (file.inscriptions ?? []).map((i) => (i.codeZone ? i : { ...i, codeZone: zone })) }
}

export function aBesoinDeZone(file) {
  return (file.inscriptions ?? []).some((i) => !i.codeZone)
}

export function compter(file) {
  return { visites: file.visites.length, inscriptions: file.inscriptions.length,
    accouchements: file.accouchements.length, declarations: file.declarations.length, prenoms: (file.prenoms ?? []).length }
}

/** Ajoute ce qu'il y a dans le fichier à la file locale, sans doublon. Renvoie la nouvelle file et le nombre d'ajouts. */
export function fusionner(locale, entrante) {
  const cle = { visites: (x) => x.clientUuid, inscriptions: (x) => x.clientUuid,
    declarations: (x) => x.codeEnfant, accouchements: (x) => x.codeEnfant, prenoms: (x) => x.codeEnfant }
  const sortie = {}
  let ajoutes = 0
  for (const l of LISTES) {
    sortie[l] = [...(locale[l] ?? [])]
    const vus = new Set(sortie[l].map(cle[l]))
    for (const x of entrante[l] ?? []) {
      const k = cle[l](x)
      if (k && !vus.has(k)) { sortie[l].push(x); vus.add(k); ajoutes += 1 }
    }
  }
  return { file: sortie, ajoutes }
}
