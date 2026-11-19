import { useCallback, useEffect, useRef, useState } from 'react'
import { AFRIQUE, AFRIQUE_BBOX } from '../lib/afrique.js'
import { BBOX_TOGO, CENTRE_TOGO, REGIONS, cadre, facile } from './CarteImmersive.jsx'
import { LIBELLE_REGION, REGIONS_TOGO, regionDeploiement } from '../lib/region.js'
import { useAuth } from '../lib/contexte.jsx'
import Logo from './Logo.jsx'

/**
 * Ouverture du site : le logo Fil d'Or, puis l'Afrique, le Togo, puis la région de l'utilisateur connecté
 * (sinon la région où ce déploiement est installé). Se passe en un clic, et s'efface seule pour laisser
 * place à l'accueil. Le logo vient de /logo-fildor.png dès qu'il est déposé dans public/ ; sinon dessin original.
 */
/** Le logo du site : dès qu'un fichier /logo-fildor.png est déposé dans public/, il s'affiche ;
 *  sinon le dessin original (le fil d'or). L'utilisateur peut envoyer son logo à tout moment. */
function LogoMarque() {
  const [fichier, setFichier] = useState(true)
  if (fichier) {
    return <img src="/logo-fildor.png" alt="Fil d'Or" height="64" onError={() => setFichier(false)} />
  }
  return <Logo />
}

export default function IntroRegion({ onFin }) {
  const { session } = useAuth()
  const regionConnecte = REGIONS_TOGO.includes(session?.region) ? session.region : null
  const region = regionConnecte || regionDeploiement()
  const cible = REGIONS.find((r) => r.nom === region) || REGIONS[0]
  const [ratio, setRatio] = useState(() => window.innerWidth / window.innerHeight)
  const [phase, setPhase] = useState(0) // 0 Afrique · 1 Togo · 2 région · 3 sortie
  const [coupe, setCoupe] = useState(false) // le Togo se découpe en régions
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
      setTimeout(() => { setPhase(1); aller(cadre(BBOX_TOGO, 30, r), 3000) }, 3600),
      setTimeout(() => setCoupe(true), 6900),
      setTimeout(() => { setPhase(2); aller(cadre(cible.bbox, 18, r), 2600) }, 8800),
      setTimeout(() => finir(), 12400),
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
    : phase === 1 ? [coupe ? 'Cinq régions' : 'Togo', coupe ? 'Maritime · Plateaux · Centrale · Kara · Savanes' : 'Un pays, un suivi']
      : [LIBELLE_REGION[region], 'Là où Fil d’Or est déployé']

  return (
    <div className={`intro ${phase === 3 ? 'sortie' : ''}`} role="dialog" aria-label="Ouverture : de l'Afrique à votre région">
      <svg viewBox={vue.map((v) => v.toFixed(1)).join(' ')} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          {/* L'Afrique est écrite en « UNICEF » : un motif de texte, continu d'un pays à l'autre. */}
          <pattern id="motif-afrique" patternUnits="userSpaceOnUse" width="520" height="150">
            <text x="0" y="62" fontSize="64" fontWeight="800" fill="#fff" fillOpacity=".78" letterSpacing="6">UNICEF</text>
            <text x="260" y="137" fontSize="64" fontWeight="800" fill="#fff" fillOpacity=".78" letterSpacing="6">UNICEF</text>
          </pattern>
          <pattern id="motif-togo" patternUnits="userSpaceOnUse" width="34" height="10">
            <text x="0" y="4.6" fontSize="4.4" fontWeight="800" fill="#fff" fillOpacity=".8" letterSpacing=".5">UNICEF</text>
            <text x="17" y="9.6" fontSize="4.4" fontWeight="800" fill="#fff" fillOpacity=".8" letterSpacing=".5">UNICEF</text>
          </pattern>
          <pattern id="motif-nuit" patternUnits="userSpaceOnUse" width="34" height="10">
            <text x="0" y="4.6" fontSize="4.4" fontWeight="800" fill="#0b3a63" fillOpacity=".4" letterSpacing=".5">UNICEF</text>
            <text x="17" y="9.6" fontSize="4.4" fontWeight="800" fill="#0b3a63" fillOpacity=".4" letterSpacing=".5">UNICEF</text>
          </pattern>
        </defs>
        <g style={{ opacity: phase === 0 ? 1 : phase === 1 ? 0.2 : 0.04, transition: 'opacity 1.6s ease' }}>
          {AFRIQUE.map((c, i) => (
            <path key={c.id} d={c.d} className="pays-intro" style={{ '--i': i }} fill={c.id === 'TG' ? 'none' : 'url(#motif-afrique)'}
                  stroke="rgba(255,255,255,.9)" strokeWidth={vue[2] / 900} strokeLinejoin="round" />
          ))}
        </g>
        {phase === 0 && (
          <g className="repere-apparait">
            <circle cx={CENTRE_TOGO[0]} cy={CENTRE_TOGO[1]} r="44" fill="none" stroke="#FFC20E" strokeWidth="3" vectorEffect="non-scaling-stroke" className="repere-togo" />
            <circle cx={CENTRE_TOGO[0]} cy={CENTRE_TOGO[1]} r="9" fill="#FFC20E" />
          </g>
        )}
        <g style={{ opacity: phase >= 1 ? 1 : 0, transition: 'opacity 1.2s ease .5s' }}>
          {REGIONS.map((r) => {
            const actif = r.nom === region
            return (
              <g key={r.id}>
                <path d={r.d} fill={phase === 2 && actif ? '#FFC20E' : phase === 2 ? 'rgba(255,255,255,.12)' : 'rgba(255,255,255,.16)'} style={{ transition: 'fill 1s ease' }} />
                <path d={r.d} fill={phase === 2 && actif ? 'url(#motif-nuit)' : phase === 2 ? 'none' : 'url(#motif-togo)'}
                      stroke="#fff" strokeLinejoin="round" strokeWidth={coupe ? px(2.2) : px(.5)} strokeOpacity={coupe ? 1 : 0.55}
                      style={{ transition: 'stroke-width 1.4s ease, stroke-opacity 1.4s ease' }} />
              </g>
            )
          })}
          {phase === 2 && <text x={cible.centre[0]} y={cible.centre[1]} textAnchor="middle" fontSize={px(14)} fontWeight="800" fill="#0b3a63">{cible.nom}</text>}
        </g>
      </svg>

      <header className="intro-marque">
        <LogoMarque />
        <span>Fil d'Or · Hack4Children Togo 2026 · avec l'UNICEF</span>
      </header>
      <div className="intro-titre" aria-live="polite" key={`${phase}${coupe}`}>
        <h1>{titre[0]}</h1>
        <p>{titre[1]}</p>
      </div>
      <button type="button" className="intro-passer" onClick={finir}>Passer</button>
    </div>
  )
}
