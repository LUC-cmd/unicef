import { chargerCartes, creerCode, empreinte, lireBorne, ecrireBorne } from './borne.js'

/** La carte numérique d'une jeune fille : un numéro propre à elle, gardé sur son téléphone. La borne n'en reçoit que l'empreinte. */
const CLE = 'fildor.carteperso'
export const QUOTA_PERSO = { serviettes: 4, preservatifs: 4, bon: 1, antalgique: 1 }
export function lireCartePerso() { try { return localStorage.getItem(CLE) || null } catch { return null } }
export function creerCartePerso() {
  let code = lireCartePerso()
  if (!code) {
    code = creerCode()
    try { localStorage.setItem(CLE, code) } catch { /* stockage refusé */ }
  }
  // Dans cette démonstration, la borne et le téléphone partagent le même navigateur : on enregistre l'empreinte.
  const borne = lireBorne()
  if (!borne.cartes[empreinte(code)]) ecrireBorne(chargerCartes(borne, [{ code, quota: { ...QUOTA_PERSO } }]))
  return code
}
