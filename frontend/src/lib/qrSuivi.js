import nacl from 'tweetnacl'
import { CLE_QR_PUBLIQUE } from './cleQr.js'

// Lecture du contenu du QR signé du carnet. Le contenu est signé par le serveur (Ed25519) :
// fam = code famille, e[] = un objet par enfant (c = code, s = statut, n = naissance, t = terme,
// ok[] = rendez-vous faits "TYPE@date", p = prochain rendez-vous "TYPE@date"). Aucun nom.

export const PICTO_QR = { V: 'Vaccin', C: 'Consultation prénatale', P: 'Pesée / mesure', N: 'Nutrition' }
export const ICONE_QR = { V: 'vaccin', C: 'enceinte', P: 'balance', N: 'bol' }

/** "V@2026-09-01" → { picto, libelle, date }. Type inconnu : affiché tel quel. */
export function lireEntree(entree) {
  const [type, date] = String(entree || '').split('@')
  return { picto: PICTO_QR[type] || type, icone: ICONE_QR[type] || 'fiche', date: date || '' }
}

/** Met le contenu brut du serveur en forme pour l'affichage. */
export function lireSuivi(contenu) {
  if (!contenu || typeof contenu !== 'object') return null
  return {
    famille: contenu.fam || '',
    genere: contenu.g || '',
    enfants: (contenu.e || []).map((e) => ({
      code: e.c || '',
      statut: e.s || '',
      naissance: e.n || '',
      terme: e.t || '',
      faits: e.ok || [],
      prochain: e.p || '',
    })),
  }
}

const PREFIXE_QR = 'fildor1'

function octets(base64, urlSafe) {
  let b = String(base64 || '')
  if (urlSafe) b = b.replace(/-/g, '+').replace(/_/g, '/')
  while (b.length % 4) b += '='
  const bin = atob(b)
  const sortie = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) sortie[i] = bin.charCodeAt(i)
  return sortie
}

/**
 * Vérifie un QR du carnet SUR L'APPAREIL, sans réseau : la signature Ed25519 est contrôlée avec la clé
 * publique embarquée. Renvoie { valide, erreur, contenu } comme le serveur. `signatureFausse` vaut true
 * quand la signature ne correspond pas : le code a été modifié, ou il a été signé avec une autre clé.
 */
export function verifierJeton(jeton, clePublique = CLE_QR_PUBLIQUE) {
  const parts = String(jeton || '').trim().split('.')
  if (parts.length !== 3 || parts[0] !== PREFIXE_QR) {
    return { valide: false, erreur: "Ce code n'est pas un code de suivi Fil d'Or", contenu: null }
  }
  let contenu
  let signature
  let cle
  try {
    contenu = octets(parts[1], true)
    signature = octets(parts[2], true)
    cle = octets(clePublique, false)
  } catch {
    return { valide: false, erreur: 'Code illisible', contenu: null }
  }
  if (cle.length !== 32 || signature.length !== 64) {
    return { valide: false, erreur: 'Code illisible', contenu: null }
  }
  if (!nacl.sign.detached.verify(contenu, signature, cle)) {
    return {
      valide: false,
      erreur: "Signature invalide : ce code a été modifié ou ne vient pas de Fil d'Or",
      contenu: null,
      signatureFausse: true,
    }
  }
  try {
    const n = JSON.parse(new TextDecoder().decode(contenu))
    if (n?.v !== 1 || !String(n?.fam || '').trim()) return { valide: false, erreur: 'Contenu non reconnu', contenu: null }
    return { valide: true, erreur: null, contenu: n }
  } catch {
    return { valide: false, erreur: 'Contenu non reconnu', contenu: null }
  }
}
