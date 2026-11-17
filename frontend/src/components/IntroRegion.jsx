import { useCallback, useEffect, useRef, useState } from 'react'
import { AFRIQUE, AFRIQUE_BBOX } from '../lib/afrique.js'
import { BBOX_TOGO, CENTRE_TOGO, REGIONS, cadre, facile } from './CarteImmersive.jsx'
import { LIBELLE_REGION, regionDeploiement } from '../lib/region.js'

/**
 * Ouverture du site : l'Afrique avec le logo UNICEF, puis le Togo, puis la région où ce déploiement est installé.
 * Se montre une fois par session, se passe en un clic, et s'efface seule pour laisser place à l'accueil.
 */
export default function IntroRegion({ onFin }) {
  const region = regionDeploiement()
  const cible = REGIONS.find((r) => r.nom === region) || REGIONS[0]
  const [ratio, setRatio] = useState(() => window.innerWidth / window.innerHeight)
  const [phase, setPhase] = useState(0) // 0 Afrique · 1 Togo · 2 région · 3 sortie
  const vueInit = useRef(cadre(AFRIQUE_BBOX, 160, window.innerWidth / window.innerHeight))
  const [vue, setVue] = useState(vueInit.current)
  const vueRef = useRef(vue); vueRef.current = vue
  const anim = useRef(0)
  const minuteurs = useRef([])

  useEffect(() => {
    const maj = () => setRatio(window.innerWidth / window.innerHeight)
    window.addEventListener('resize', maj)
    return () => window.removeEventListener('resize', maj)
  }, [])

  const aller = useCallback((vers, duree) => {
    cancelAnimationFrame(anim.current)
    const de = vueRef.current
    const debut = performance.now()
    const pas = (now) => {
      const t = Math.min(1, (now - debut) / duree)
      const e = facile(t)
      setVue(de.map((x, i) => x + (vers[i] - x) * e))
      if (t < 1) anim.current = requestAnimationFrame(pas)
    }
    anim.current = requestAnimationFrame(pas)
  }, [])

  const finir = useCallback(() => {
    minuteurs.current.forEach(clearTimeout)
    cancelAnimationFrame(anim.current)
    setPhase(3)
    setTimeout(() => onFin(), 650)
  }, [onFin])

  useEffect(() => {
    const r = window.innerWidth / window.innerHeight
    const t = minuteurs.current = [
      setTimeout(() => { setPhase(1); aller(cadre(BBOX_TOGO, 30, r), 2800) }, 2300),
      setTimeout(() => { setPhase(2); aller(cadre(cible.bbox, 18, r), 2400) }, 5600),
      setTimeout(() => finir(), 9000),
    ]
    const echap = (e) => { if (e.key === 'Escape') finir() }
    document.addEventListener('keydown', echap)
    document.body.style.overflow = 'hidden'
    return () => { t.forEach(clearTimeout); cancelAnimationFrame(anim.current); document.removeEventListener('keydown', echap); document.body.style.overflow = '' }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const echelle = vue[2] / cadre(BBOX_TOGO, 30, ratio)[2]
  const px = (n) => n * echelle
  const titre = phase === 0 ? ['Afrique de l’Ouest', 'Un enfant, un parcours']
    : phase === 1 ? ['Togo', '5 régions · 39 préfectures']
      : [LIBELLE_REGION[region], 'Là où Fil d’Or est déployé']

  return (
    <div className={`intro ${phase === 3 ? 'sortie' : ''}`} role="dialog" aria-label="Ouverture : de l'Afrique à votre région">
      <svg viewBox={vue.map((v) => v.toFixed(1)).join(' ')} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <g style={{ opacity: phase === 0 ? 1 : phase === 1 ? 0.35 : 0.14, transition: 'opacity 1.6s ease' }}>
          {AFRIQUE.map((c) => <path key={c.id} d={c.d} fill={c.id === 'TG' ? 'none' : 'rgba(255,255,255,.22)'} stroke="rgba(255,255,255,.5)" strokeWidth="1.2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />)}
        </g>
        {phase === 0 && (
          <g>
            <circle cx={CENTRE_TOGO[0]} cy={CENTRE_TOGO[1]} r="44" fill="none" stroke="#FFC20E" strokeWidth="3" vectorEffect="non-scaling-stroke" className="repere-togo" />
            <circle cx={CENTRE_TOGO[0]} cy={CENTRE_TOGO[1]} r="9" fill="#FFC20E" />
          </g>
        )}
        <g style={{ opacity: phase >= 1 ? 1 : 0, transition: 'opacity 1.2s ease .5s' }}>
          {REGIONS.map((r) => {
            const actif = r.nom === region
            return <path key={r.id} d={r.d} fill={phase === 2 && actif ? '#FFC20E' : phase === 2 ? 'rgba(255,255,255,.18)' : 'rgba(255,255,255,.42)'}
                         stroke="#fff" strokeWidth={px(2)} strokeLinejoin="round" style={{ transition: 'fill 1s ease' }} />
          })}
          {phase === 2 && <text x={cible.centre[0]} y={cible.centre[1]} textAnchor="middle" fontSize={px(14)} fontWeight="800" fill="#0b3a63">{cible.nom}</text>}
        </g>
      </svg>

      <figure className={`intro-photo gauche ${phase <= 1 ? 'vu' : ''}`}><img src="/partenaires/mesure-bras.jpg" alt="" /></figure>
      <figure className={`intro-photo droite ${phase <= 1 ? 'vu' : ''}`}><img src="/partenaires/enfants-unicef.png" alt="" /></figure>

      <header className="intro-marque">
        <img src="/partenaires/unicef-logo.png" alt="UNICEF" height="64" />
        <span>Hack4Children Togo 2026</span>
      </header>
      <div className="intro-titre" aria-live="polite" key={phase}>
        <h1>{titre[0]}</h1>
        <p>{titre[1]}</p>
      </div>
      <button type="button" className="intro-passer" onClick={finir}>Passer</button>
    </div>
  )
}
