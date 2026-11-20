import nacl from 'tweetnacl'
import { lireFile } from './offline.js'

// QR de passage : quand un enfant passe d'un centre sans réseau à un autre centre sans réseau, le premier centre affiche ses
// visites récentes dans un QR signé par son appareil ; le second le scanne et les lit, sans connexion. Aucun nom n'y figure.
// La signature prouve que le contenu n'a pas été modifié depuis l'appareil qui l'a émis ; elle ne prouve pas, à elle seule, QUI
// est cet appareil : le serveur reliera l'appareil à un agent lors de la synchronisation.

const PREFIXE = 'fildorp1'
const CLE_APPAREIL = 'fildor.appareil.cle'
const MAX_VISITES = 6
const CLE_SOINS = 'fildor.soins'
const CLE_CENTRE = 'fildor.centre.nom'

export const SOINS = { V: 'Vaccin', M: 'Traitement donné', N: 'Conseil nutrition', O: 'Orienté vers le centre de santé' }

/** Les soins donnés lors d'une visite (gardés à part, sur l'appareil, avec la visite en attente). */
export function ecrireSoins(uuid, soins, note) {
  try { const m = JSON.parse(localStorage.getItem(CLE_SOINS)) || {}; m[uuid] = { soins, note: String(note || '').slice(0, 80) }; localStorage.setItem(CLE_SOINS, JSON.stringify(m)) } catch { /* sans stockage */ }
}
const lireSoins = (uuid) => { try { return (JSON.parse(localStorage.getItem(CLE_SOINS)) || {})[uuid] || { soins: [], note: '' } } catch { return { soins: [], note: '' } } }

/** Le nom du centre de cet agent, saisi une fois et gardé sur l'appareil. */
export const lireCentre = () => { try { return localStorage.getItem(CLE_CENTRE) || '' } catch { return '' } }
export const ecrireCentre = (n) => { try { localStorage.setItem(CLE_CENTRE, String(n || '').slice(0, 60)) } catch { /* sans stockage */ } }

const versB64 = (u8) => { let s = ''; u8.forEach((b) => { s += String.fromCharCode(b) }); return btoa(s) }
const deB64 = (b64) => { const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u }
const versUrl = (u8) => versB64(u8).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const deUrl = (s) => { let b = String(s).replace(/-/g, '+').replace(/_/g, '/'); while (b.length % 4) b += '='; return deB64(b) }

/** La paire de clés de cet appareil, créée une fois et gardée sur l'appareil. */
export function cleAppareil() {
  try {
    const c = JSON.parse(localStorage.getItem(CLE_APPAREIL))
    if (c?.pub && c?.sec) return { publique: deB64(c.pub), secrete: deB64(c.sec) }
  } catch { /* nouvelle clé */ }
  const p = nacl.sign.keyPair()
  try { localStorage.setItem(CLE_APPAREIL, JSON.stringify({ pub: versB64(p.publicKey), sec: versB64(p.secretKey) })) } catch { /* sans stockage */ }
  return { publique: p.publicKey, secrete: p.secretKey }
}

/** Un nom court et stable pour reconnaître l'appareil émetteur (« A1B2C3 »). */
export const nomAppareil = (publique) => versUrl(publique).replace(/[-_]/g, '').slice(0, 6).toUpperCase()

/** Les enfants pour lesquels cet appareil garde des visites non envoyées : code → nombre. */
export function enfantsEnAttente(file = lireFile()) {
  const m = new Map()
  ;(file.visites || []).forEach((v) => m.set(v.codeEnfant, (m.get(v.codeEnfant) || 0) + 1))
  return [...m.entries()].map(([code, nombre]) => ({ code, nombre }))
}

/** Fabrique le texte du QR de passage d'un enfant, à partir des visites en attente sur cet appareil. */
export function creerPassage(codeEnfant, file = lireFile(), identite = {}, maintenant = new Date()) {
  const visites = (file.visites || []).filter((v) => v.codeEnfant === codeEnfant).slice(-MAX_VISITES)
  if (visites.length === 0) return null
  const { publique, secrete } = cleAppareil()
  const contenu = {
    v: 1, c: codeEnfant, g: maintenant.toISOString(), k: versB64(publique),
    o: { c: String(identite.centre || '').slice(0, 60), a: String(identite.agent || '').slice(0, 60), r: String(identite.region || '').slice(0, 40) },
    w: visites.map((x) => { const s = lireSoins(x.clientUuid); return [String(x.clientUuid || '').slice(0, 8), x.dateVisite || '', x.poidsG ?? null, x.muacMm ?? null, x.signesDanger ? 1 : 0, s.soins, s.note] }),
  }
  const octets = new TextEncoder().encode(JSON.stringify(contenu))
  return `${PREFIXE}.${versUrl(octets)}.${versUrl(nacl.sign.detached(octets, secrete))}`
}

export const estPassage = (texte) => String(texte || '').trim().startsWith(`${PREFIXE}.`)

/** Lit et vérifie un QR de passage. Renvoie { valide, erreur?, enfant, genere, appareil, visites }. */
export function lirePassage(texte) {
  try {
    const [pre, charge, signature] = String(texte).trim().split('.')
    if (pre !== PREFIXE || !charge || !signature) return { valide: false, erreur: 'Ce n’est pas un QR de passage.' }
    const octets = deUrl(charge)
    const contenu = JSON.parse(new TextDecoder().decode(octets))
    const publique = deB64(contenu.k)
    if (!nacl.sign.detached.verify(octets, deUrl(signature), publique)) return { valide: false, erreur: 'Le contenu a été modifié : la signature ne correspond pas.' }
    return {
      valide: true, enfant: contenu.c, genere: contenu.g, appareil: nomAppareil(publique),
      centre: contenu.o?.c || '', agent: contenu.o?.a || '', region: contenu.o?.r || '',
      visites: (contenu.w || []).map(([id, date, poidsG, muacMm, danger, soins, note]) => ({ id, date, poidsG, muacMm, danger: danger === 1, soins: Array.isArray(soins) ? soins : [], note: note || '' })),
    }
  } catch {
    return { valide: false, erreur: 'Code illisible. Scannez-le de nouveau.' }
  }
}

/** Le résumé à recopier à la main sur le carnet papier : toujours lisible, même sans téléphone. */
export function resumePourCarnet(codeEnfant, file = lireFile(), identite = {}) {
  const visites = (file.visites || []).filter((v) => v.codeEnfant === codeEnfant).slice(-MAX_VISITES)
  const lignes = visites.map((x) => {
    const s = lireSoins(x.clientUuid)
    const morceaux = [x.dateVisite || '', x.poidsG != null ? `poids ${x.poidsG} g` : '', x.muacMm != null ? `bras ${x.muacMm} mm` : '', x.signesDanger ? 'SIGNE DE DANGER' : '', s.soins.map((k) => SOINS[k] || k).join(', '), s.note].filter(Boolean)
    return morceaux.join(' ; ')
  })
  return [`Enfant ${codeEnfant}`, `${identite.centre || 'Centre'}${identite.agent ? `, agent ${identite.agent}` : ''}`, ...lignes].join('\n')
}

/** Image du QR avec le centre, l'agent et la date écrits dessous : à photographier, envoyer ou imprimer. Renvoie une adresse d'image (PNG). */
export async function imagePassage(codeEnfant, valeur, identite = {}) {
  const qr = await import('qrcode')
  const url = await (qr.default || qr).toDataURL(valeur, { width: 640, margin: 2, errorCorrectionLevel: 'M', color: { dark: '#16325c', light: '#ffffff' } })
  const img = await new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = url })
  const c = document.createElement('canvas'); c.width = 720; c.height = 900
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height)
  g.drawImage(img, 40, 40, 640, 640)
  g.fillStyle = '#12304f'; g.textAlign = 'center'
  g.font = 'bold 34px sans-serif'; g.fillText(`Passage de l’enfant ${codeEnfant}`, 360, 735)
  g.font = '30px sans-serif'; g.fillText(identite.centre || 'Centre non nommé', 360, 785)
  if (identite.agent) g.fillText(`Agent : ${identite.agent}`, 360, 828)
  g.font = '24px sans-serif'; g.fillStyle = '#5b6b78'; g.fillText(`${new Date().toLocaleDateString('fr-FR')} · à scanner avec Fil d’Or`, 360, 872)
  return c.toDataURL('image/png')
}
