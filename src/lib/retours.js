// Retours visibles : chaque action (enregistrer, valider, envoyer…) annonce son résultat.
// api.js émet ces évènements ; components/Retours.jsx les affiche.

const ETIQUETTES = [
  [/\/acte-pret/, 'Acte marqué prêt'],
  [/\/acte-retire/, 'Acte marqué retiré'],
  [/\/valider/, 'Déclaration validée'],
  [/\/rejeter/, 'Déclaration rejetée'],
  [/\/repondre/, 'Réponse envoyée à la famille'],
  [/\/structure\/moi/, 'Informations enregistrées'],
  [/\/poids-naissance/, 'Poids de naissance enregistré'],
  [/\/accouchement/, 'Naissance enregistrée'],
  [/\/retrait-consentement/, 'Consentement retiré'],
  [/\/proches/, 'Proche ajouté'],
  [/\/agent\/demandes/, 'Demande envoyée à la structure'],
  [/\/agent\/familles/, 'Famille enregistrée'],
  [/\/agent\/sync/, 'Synchronisation terminée'],
  [/\/admin\/cycle/, 'Jour suivant simulé'],
  [/\/public\/demandes/, 'Demande envoyée'],
  [/\/public\/appel-manque/, 'Appel manqué enregistré'],
  [/\/public\/jeu\/fait/, 'Bravo, jeu noté comme fait'],
  [/\/sms\/.*\/ok/, 'Message marqué lu'],
]

// Seules les actions qui modifient quelque chose annoncent un succès (pas les simples consultations).
const LECTURES = [/\/public\/(sms|jeu|structures|profil|voix|preuve)$/]

export function etiquette(url) {
  const u = url.split('?')[0]
  for (const [re, t] of ETIQUETTES) if (re.test(u)) return t
  return null
}

export function estLecture(url) {
  const u = url.split('?')[0]
  return LECTURES.some((re) => re.test(u))
}

let compteur = 0
export function annoncer(type, texte) {
  if (!texte) return
  window.dispatchEvent(new CustomEvent('fildor:retour', { detail: { id: ++compteur, type, texte } }))
}

let enCours = 0
export function occupe(delta) {
  enCours = Math.max(0, enCours + delta)
  window.dispatchEvent(new CustomEvent('fildor:occupe', { detail: enCours }))
}
