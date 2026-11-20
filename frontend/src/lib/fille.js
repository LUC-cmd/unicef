import { ajouterJours, ecrireEspace, lireEspace } from './adolescente.js'
import { creerCartePerso, lireCartePerso } from './cartePerso.js'

/** Compte « jeune fille » de démonstration : un pseudo, aucun nom. Tout reste sur ce téléphone. */
const CLE = 'fildor.fille'
export const lireFille = () => { try { return JSON.parse(localStorage.getItem(CLE) || 'null') } catch { return null } }
export const sortirFille = () => { try { localStorage.removeItem(CLE) } catch { /* refusé */ } }
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
  try { localStorage.setItem(CLE, JSON.stringify(f)) } catch { /* refusé */ }
  return f
}
export { lireCartePerso }
