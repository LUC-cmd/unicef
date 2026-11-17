// Région où ce déploiement de Fil d'Or est installé. Choisie une fois : par la variable REGION_DEPLOIEMENT du site,
// ou sur l'appareil (le choix de l'appareil passe avant).
export const REGIONS_TOGO = ['Maritime', 'Plateaux', 'Centrale', 'Kara', 'Savanes']
export const LIBELLE_REGION = {
  Maritime: 'Région Maritime', Plateaux: 'Région des Plateaux', Centrale: 'Région Centrale', Kara: 'Région de la Kara', Savanes: 'Région des Savanes',
}
const CLE = 'fildor.region'

export function regionDeploiement() {
  try { const v = localStorage.getItem(CLE); if (REGIONS_TOGO.includes(v)) return v } catch { /* sans stockage */ }
  const c = globalThis.FILDOR_CONFIG?.region
  return REGIONS_TOGO.includes(c) ? c : 'Maritime'
}

export function fixerRegion(r) {
  if (!REGIONS_TOGO.includes(r)) return
  try { localStorage.setItem(CLE, r) } catch { /* sans stockage */ }
  window.dispatchEvent(new Event('fildor-region'))
}
