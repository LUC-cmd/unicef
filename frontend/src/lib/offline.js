// File d'attente hors ligne de l'agent. Chaque élément porte un identifiant créé sur le téléphone :
// si la synchronisation est rejouée, le serveur n'enregistre rien deux fois.

const CLE = 'fildor.file'

function stockage() {
  try {
    return globalThis.localStorage
  } catch {
    return null
  }
}

export function lireFile() {
  const s = stockage()
  if (!s) return { visites: [], declarations: [], inscriptions: [], accouchements: [] }
  try {
    const f = JSON.parse(s.getItem(CLE) || 'null')
    return {
      visites: f?.visites ?? [],
      declarations: f?.declarations ?? [],
      inscriptions: f?.inscriptions ?? [],
      accouchements: f?.accouchements ?? [],
    }
  } catch {
    return { visites: [], declarations: [], inscriptions: [], accouchements: [] }
  }
}

function ecrire(file) {
  const s = stockage()
  if (s) s.setItem(CLE, JSON.stringify(file))
  return file
}

export function nouvelUuid() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  // Repli pour les anciens navigateurs
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

export function ajouterVisite(v) {
  const f = lireFile()
  f.visites.push({ clientUuid: nouvelUuid(), signesDanger: false, rendezVousRealises: [], ...v })
  return ecrire(f)
}

export function ajouterDeclaration(d) {
  const f = lireFile()
  // Une seule déclaration en attente par enfant
  if (!f.declarations.some((x) => x.codeEnfant === d.codeEnfant)) f.declarations.push(d)
  return ecrire(f)
}

/** Inscription d'une famille faite hors ligne : le serveur attribue les codes à la synchronisation. */
export function ajouterInscription(req) {
  const f = lireFile()
  const clientUuid = req.clientUuid || nouvelUuid()
  if (!f.inscriptions.some((x) => x.clientUuid === clientUuid)) f.inscriptions.push({ ...req, clientUuid })
  ecrire(f)
  return clientUuid
}

/** La grossesse d'un enfant suivi a abouti : une seule naissance en attente par enfant. */
export function ajouterAccouchement(a) {
  const f = lireFile()
  if (!f.accouchements.some((x) => x.codeEnfant === a.codeEnfant)) f.accouchements.push(a)
  return ecrire(f)
}

export function nombreEnAttente(file = lireFile()) {
  return file.visites.length + file.declarations.length + file.inscriptions.length + file.accouchements.length
}

export function vider() {
  return ecrire({ visites: [], declarations: [], inscriptions: [], accouchements: [] })
}
