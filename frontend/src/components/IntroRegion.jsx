import { useCallback, useEffect, useRef, useState } from 'react'

const ETAPES = ['Adolescence', 'Grossesse', 'Naissance', 'Petite enfance', 'Éveil', 'Préscolaire']

/**
 * Ouverture du site : le logo, puis un fil d'or qui relie les six étapes du parcours de l'enfant.
 * Courte (environ trois secondes), claire, et on peut la passer d'un clic. Respecte « réduire les animations ».
 */
export default function IntroRegion({ onFin }) {
  const reduit = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const [sortie, setSortie] = useState(false)
  const minuteurs = useRef([])

  const finir = useCallback(() => {
    minuteurs.current.forEach(clearTimeout)
    setSortie(true)
    minuteurs.current = [setTimeout(onFin, 450)]
  }, [onFin])

  useEffect(() => {
    minuteurs.current = [setTimeout(finir, reduit ? 900 : 3400)]
    const touche = (e) => { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') finir() }
    window.addEventListener('keydown', touche)
    return () => { minuteurs.current.forEach(clearTimeout); window.removeEventListener('keydown', touche) }
  }, [finir, reduit])

  return (
    <div className={`intro-fil${sortie ? ' sortie' : ''}`} role="dialog" aria-label="Fil d'Or, Hack4Children Togo 2026">
      <div className="intro-centre">
        <div className="intro-logo">
          <svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="56" /></svg>
          <img src="/logo-rond.png" alt="Fil d'Or" width="96" height="96" />
        </div>
        <h1>Fil d'Or</h1>
        <p className="intro-ligne">Un enfant, un parcours</p>
        <ol className="intro-etapes" aria-label="Les six étapes du parcours">
          {ETAPES.map((e, i) => (
            <li key={e} style={{ '--i': i }}><span aria-hidden="true" />{e}</li>
          ))}
        </ol>
        <p className="intro-pied">Hack4Children Togo 2026</p>
      </div>
      <button type="button" className="intro-passer" onClick={finir}>Passer</button>
    </div>
  )
}
