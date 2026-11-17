import { useEffect, useState } from 'react'
import { LIBELLE_REGION, REGIONS_TOGO, fixerRegion, regionDeploiement } from '../lib/region.js'

/** Choix de la région de ce déploiement : l'ouverture animée et l'accueil s'y adaptent. */
export default function SelecteurRegion({ compact = false }) {
  const [r, setR] = useState(regionDeploiement)
  useEffect(() => {
    const maj = () => setR(regionDeploiement())
    window.addEventListener('fildor-region', maj)
    return () => window.removeEventListener('fildor-region', maj)
  }, [])
  const choisir = (v) => { fixerRegion(v); try { sessionStorage.removeItem('fildor.intro') } catch { /* sans stockage */ } }
  return (
    <label className={`selecteur-region${compact ? ' compact' : ''}`}>
      <span>Région de ce déploiement</span>
      <select value={r} onChange={(e) => choisir(e.target.value)}>
        {REGIONS_TOGO.map((x) => <option key={x} value={x}>{LIBELLE_REGION[x]}</option>)}
      </select>
    </label>
  )
}
