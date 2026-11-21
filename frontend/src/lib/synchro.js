/**
 * Synchronisation hors réseau : on copie ce qui attend sur l'appareil dans un fichier chiffré (clé USB, Bluetooth,
 * carte mémoire), on le porte là où il y a du réseau, et les données partent. Le fichier est illisible sans le mot de passe choisi.
 */
import { ajouterEnAttente, fileEnAttente } from './reseauClient.js'

const enc = new TextEncoder()
const dec = new TextDecoder()
const VERSION = 1
const MAX = 500
const CHEMIN_OK = /^[a-z0-9_/-]{1,60}$/i

function versB64(u8) { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000)); return btoa(s) }
const deB64 = (b) => Uint8Array.from(atob(b), (c) => c.charCodeAt(0))

async function cleDepuis(motDePasse, sel) {
  const base = await crypto.subtle.importKey('raw', enc.encode(motDePasse), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: sel, iterations: 150000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
}

export async function chiffrerFile(items, motDePasse) {
  if (!motDePasse || motDePasse.length < 6) throw new Error('Choisissez un mot de passe d’au moins 6 caractères.')
  const sel = crypto.getRandomValues(new Uint8Array(16)); const iv = crypto.getRandomValues(new Uint8Array(12))
  const clair = enc.encode(JSON.stringify({ app: 'fildor-synchro', date: Date.now(), items }))
  const chiffre = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await cleDepuis(motDePasse, sel), clair))
  return JSON.stringify({ v: VERSION, sel: versB64(sel), iv: versB64(iv), donnees: versB64(chiffre) })
}

/** Rend les éléments d'un fichier, ou lève une erreur claire. Rien n'est cru sur parole : chaque élément est vérifié. */
export async function dechiffrerFile(texte, motDePasse) {
  let f
  try { f = JSON.parse(texte) } catch { throw new Error('Ce fichier n’est pas un fichier de synchronisation Fil d’Or.') }
  if (f?.v !== VERSION || !f.sel || !f.iv || !f.donnees) throw new Error('Ce fichier n’est pas un fichier de synchronisation Fil d’Or.')
  let obj
  try {
    const clair = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: deB64(f.iv) }, await cleDepuis(motDePasse, deB64(f.sel)), deB64(f.donnees))
    obj = JSON.parse(dec.decode(clair))
  } catch { throw new Error('Mot de passe incorrect, ou fichier abîmé.') }
  if (obj?.app !== 'fildor-synchro' || !Array.isArray(obj.items) || obj.items.length > MAX) throw new Error('Fichier non reconnu.')
  const items = obj.items.filter((x) => x && typeof x.chemin === 'string' && CHEMIN_OK.test(x.chemin) && !x.chemin.includes('..') && x.corps && typeof x.corps === 'object' && !Array.isArray(x.corps))
  return items.map((x) => ({ chemin: x.chemin, corps: x.corps, date: Number(x.date) || Date.now() }))
}

export const exporterFile = (motDePasse) => chiffrerFile(fileEnAttente(), motDePasse)
export async function importerFile(texte, motDePasse) { const items = await dechiffrerFile(texte, motDePasse); return ajouterEnAttente(items) }
