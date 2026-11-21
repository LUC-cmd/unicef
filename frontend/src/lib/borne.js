import nacl from 'tweetnacl'

/**
 * Borne Fil d'Or : une borne de village qui remet des produits non médicamenteux contre une carte à gratter.
 * La carte porte un code à 8 chiffres. La borne ne garde jamais le code, seulement son empreinte et ce qui reste sur la carte.
 * Aucun nom, aucun âge, aucun lien avec une personne. Prototype de démonstration : à valider avec le ministère de la Santé
 * (quels produits, pour quel âge, avec quelles règles).
 */
export const PRODUITS = {
  serviettes: 'Serviettes hygiéniques',
  preservatifs: 'Préservatifs',
  bon: 'Bon de consultation anonyme',
  antalgique: 'Antalgique simple (selon protocole validé)',
}
export const NB_ESSAIS = 5
export const BLOCAGE_MS = 15 * 60 * 1000

/** Chiffre de contrôle (Luhn) : attrape les fautes de frappe avant toute recherche. */
export function chiffreControle(sept) {
  let somme = 0
  for (let i = 0; i < sept.length; i++) {
    let d = Number(sept[sept.length - 1 - i])
    if (i % 2 === 0) { d *= 2; if (d > 9) d -= 9 }
    somme += d
  }
  return String((10 - (somme % 10)) % 10)
}
export const codeValide = (code) => /^\d{8}$/.test(code) && chiffreControle(code.slice(0, 7)) === code[7]
export const nettoyer = (s) => String(s ?? '').replace(/\D/g, '')
export const formater = (c) => `${c.slice(0, 4)} ${c.slice(4)}`

export function creerCode() {
  const a = new Uint32Array(7); crypto.getRandomValues(a)
  const sept = Array.from(a, (x) => String(x % 10)).join('')
  return sept + chiffreControle(sept)
}
export function empreinte(code) {
  const h = nacl.hash(new TextEncoder().encode(`fildor-borne|${code}`))
  return Array.from(h.slice(0, 16), (b) => b.toString(16).padStart(2, '0')).join('')
}

/** L'agent prépare un lot de cartes : chaque carte a son code et ce qu'elle donne droit de retirer. */
export function genererLot({ nombre, quota }) {
  const vus = new Set()
  const cartes = []
  while (cartes.length < nombre) {
    const code = creerCode()
    if (vus.has(code)) continue
    vus.add(code)
    cartes.push({ serie: `C-${String(cartes.length + 1).padStart(4, '0')}`, code, quota: { ...quota } })
  }
  return cartes
}

export const etatVide = () => ({ stock: { serviettes: 60, preservatifs: 60, bon: 100, antalgique: 40 }, cartes: {}, essais: { n: 0, jusqua: 0 }, journal: [] })

/** La borne reçoit les cartes de l'agent : elle garde l'empreinte et le reste, jamais le code. */
export function chargerCartes(etat, cartes) {
  const suivant = { ...etat, cartes: { ...etat.cartes } }
  for (const c of cartes) suivant.cartes[empreinte(c.code)] = { reste: { ...c.quota } }
  return suivant
}

/** Quelqu'un tape son code et demande des produits. Rien n'est jamais associé à une personne. */
export function utiliserCode(etat, saisie, demande, maintenant = Date.now()) {
  if (etat.essais.jusqua > maintenant) return { etat, ok: false, raison: 'bloque', jusqua: etat.essais.jusqua }
  const code = nettoyer(saisie)
  if (!codeValide(code)) return { etat, ok: false, raison: 'format' }
  const h = empreinte(code)
  const carte = etat.cartes[h]
  if (!carte) {
    const n = etat.essais.n + 1
    const essais = n >= NB_ESSAIS ? { n: 0, jusqua: maintenant + BLOCAGE_MS } : { n, jusqua: 0 }
    return { etat: { ...etat, essais }, ok: false, raison: 'inconnu', essaisRestants: Math.max(0, NB_ESSAIS - n) }
  }
  const remis = {}
  const reste = { ...carte.reste }
  const stock = { ...etat.stock }
  for (const [k, voulu] of Object.entries(demande)) {
    if (!(k in PRODUITS)) continue
    const n = Math.max(0, Math.min(Number(voulu) || 0, reste[k] ?? 0, stock[k] ?? 0))
    if (n > 0) { remis[k] = n; reste[k] -= n; stock[k] -= n }
  }
  if (Object.keys(remis).length === 0) {
    const epuisee = Object.values(carte.reste).every((v) => v <= 0)
    return { etat: { ...etat, essais: { n: 0, jusqua: 0 } }, ok: false, raison: epuisee ? 'carte-vide' : 'rien', reste: carte.reste }
  }
  const jour = new Date(maintenant).toISOString().slice(0, 10)
  return {
    etat: { ...etat, stock, essais: { n: 0, jusqua: 0 }, cartes: { ...etat.cartes, [h]: { reste } }, journal: [...etat.journal, { jour, remis }] },
    ok: true, remis, reste,
  }
}

/** Ce que l'agent récupère à chaque passage : des totaux par jour. Aucune carte, aucune personne. */
export function resumeJournal(etat) {
  const par = {}
  for (const { jour, remis } of etat.journal) {
    par[jour] ??= {}
    for (const [k, n] of Object.entries(remis)) par[jour][k] = (par[jour][k] ?? 0) + n
  }
  return par
}
export const stockBas = (etat) => Object.entries(etat.stock).filter(([, n]) => n <= 10).map(([k]) => k)

export const CLE = 'fildor.borne'
export function lireBorne() { try { const v = JSON.parse(localStorage.getItem(CLE) ?? 'null'); return v ?? etatVide() } catch { return etatVide() } }
export function ecrireBorne(e) { try { localStorage.setItem(CLE, JSON.stringify(e)) } catch { /* stockage refusé */ } }

/** Numéro complet à partir de 7 chiffres : on ajoute le chiffre de contrôle. */
export const codeDepuis = (sept) => sept + chiffreControle(sept)

/** Cartes de démonstration, fictives, toujours présentes pour essayer la borne. Le contenu de chaque carte est propre à elle. */
export const CARTES_DEMO = [
  { serie: 'DEMO-A', code: codeDepuis('4827163'), quota: { serviettes: 4, preservatifs: 4, bon: 1, antalgique: 0 }, qui: 'Carte remise par une agente de santé' },
  { serie: 'DEMO-B', code: codeDepuis('7391052'), quota: { serviettes: 2, preservatifs: 0, bon: 1, antalgique: 2 }, qui: 'Carte remise par l’école, sans préservatifs' },
]
export const lienQrCarte = (code) => `FILDOR-CARTE:${code}`

/** Ajoute les cartes de démonstration à la borne si elles n'y sont pas encore (sans toucher à ce qui a déjà été retiré). */
export function assurerDemo(etat) {
  const manque = CARTES_DEMO.filter((c) => !etat.cartes[empreinte(c.code)])
  return manque.length ? chargerCartes(etat, manque) : etat
}

/** Recharger une carte déjà utilisée : le même numéro continue de marcher, on ajoute des droits. Seule l'empreinte est touchée. */
export function rechargerCarte(etat, saisie, ajout) {
  const code = nettoyer(saisie)
  if (!codeValide(code)) return { etat, ok: false, raison: 'format' }
  const h = empreinte(code)
  const carte = etat.cartes[h]
  if (!carte) return { etat, ok: false, raison: 'inconnu' }
  const reste = { ...carte.reste }
  for (const [k, n] of Object.entries(ajout)) if (k in PRODUITS) reste[k] = (reste[k] ?? 0) + Math.max(0, Number(n) || 0)
  return { etat: { ...etat, cartes: { ...etat.cartes, [h]: { reste } } }, ok: true, reste }
}

/** Réponses anonymes aux questions de la borne : jamais de carte, jamais d'heure précise, seulement la langue et le jour. */
export function noterSondage(etat, langue, reponses, maintenant = Date.now()) {
  const jour = new Date(maintenant).toISOString().slice(0, 10)
  return { ...etat, sondage: [...(etat.sondage ?? []), { jour, langue, ...reponses }] }
}
export function resumeSondage(etat) {
  const s = etat.sondage ?? []
  const compte = (cle) => s.reduce((a, r) => (r[cle] ? { ...a, [r[cle]]: (a[r[cle]] ?? 0) + 1 } : a), {})
  const langues = s.reduce((a, r) => ({ ...a, [r.langue]: (a[r.langue] ?? 0) + 1 }), {})
  return { total: s.length, probleme: compte('probleme'), ailleurs: compte('ailleurs'), utile: compte('utile'), langues }
}
