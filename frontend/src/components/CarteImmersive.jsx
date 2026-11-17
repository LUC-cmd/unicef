import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import togo from '../lib/togo.js'
import { AFRIQUE, AFRIQUE_BBOX } from '../lib/afrique.js'

// Même projection que la carte du Togo, pour que la caméra passe de l'Afrique au pays sans saut.
const LAT0 = 11.2
const S = 100
const COS = Math.cos((8.6 * Math.PI) / 180)
const pt = (lon, lat) => [(lon + 0.2) * COS * S, (LAT0 - lat) * S]
const anneau = (r) => r.map(([lo, la], i) => { const [x, y] = pt(lo, la); return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}` }).join(' ') + 'Z'

const REGIONS = togo.features.map((f) => {
  const g = f.geometry
  const polys = g.type === 'MultiPolygon' ? g.coordinates : [g.coordinates]
  const anneaux = polys.flat()
  const pts = anneaux.flat().map(([lo, la]) => pt(lo, la))
  const xs = pts.map((p) => p[0]); const ys = pts.map((p) => p[1])
  return { id: f.properties.id, nom: f.properties.nom, d: anneaux.map(anneau).join(' '),
    bbox: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)],
    centre: [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2] }
})
const BBOX_TOGO = REGIONS.reduce((b, r) => [Math.min(b[0], r.bbox[0]), Math.min(b[1], r.bbox[1]), Math.max(b[2], r.bbox[2]), Math.max(b[3], r.bbox[3])], [1e9, 1e9, -1e9, -1e9])
const CENTRE_TOGO = [(BBOX_TOGO[0] + BBOX_TOGO[2]) / 2, (BBOX_TOGO[1] + BBOX_TOGO[3]) / 2]
const cadre = (b, marge, ratio) => {
  let w = b[2] - b[0] + marge * 2; let h = b[3] - b[1] + marge * 2
  if (w / h < ratio) w = h * ratio; else h = w / ratio
  const cx = (b[0] + b[2]) / 2; const cy = (b[1] + b[3]) / 2
  return [cx - w / 2, cy - h / 2, w, h]
}
// Sur grand écran, le panneau occupe la droite : on décale la carte vers la gauche pour que rien ne passe dessous.
const decale = (v, ratio) => (ratio > 1.15 ? [v[0] + v[2] * 0.13, v[1], v[2], v[3]] : v)
const facile = (t) => (t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2)
const TEINTES = { 'TG-M': '#1CABE2', 'TG-P': '#7CC9EA', 'TG-C': '#A6DAF0', 'TG-K': '#5CB8DF', 'TG-S': '#C4E6F5' }
const NOM_REGION_ID = Object.fromEntries(REGIONS.map((r) => [r.nom, r.id]))

/** Caméra : l'Afrique, puis le Togo, puis les cinq régions qui s'écartent, puis une région et ses préfectures. */
export default function CarteImmersive({ prefectures = [], regionChoisie, onRegion, prefChoisie, onPrefecture, onPret }) {
  const [ratio, setRatio] = useState(1.7)
  const [phase, setPhase] = useState(0) // 0 Afrique · 1 zoom Togo · 2 régions écartées · 3 interactif
  const conteneur = useRef(null)
  const anim = useRef(0)
  const reduit = useRef(typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  const vueAfrique = useMemo(() => cadre(AFRIQUE_BBOX, 120, ratio), [ratio])
  const vuePays = useMemo(() => decale(cadre(BBOX_TOGO, 22, ratio), ratio), [ratio])
  const [vue, setVue] = useState(() => cadre(AFRIQUE_BBOX, 120, 1.7))
  const vueRef = useRef(vue)
  vueRef.current = vue

  useEffect(() => {
    const el = conteneur.current
    if (!el) return undefined
    const mesurer = () => { const r = el.getBoundingClientRect(); if (r.width && r.height) setRatio(r.width / r.height) }
    mesurer()
    const o = new ResizeObserver(mesurer)
    o.observe(el)
    return () => o.disconnect()
  }, [])

  const aller = useCallback((vers, duree = 1600) => {
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

  // Séquence d'ouverture : lancée une seule fois, jamais annulée par un changement de taille d'écran.
  const vuePaysRef = useRef(vuePays); vuePaysRef.current = vuePays
  const phaseRef = useRef(0); phaseRef.current = phase
  useEffect(() => { if (phaseRef.current === 0 && !reduit.current) setVue(vueAfrique) }, [vueAfrique])
  useEffect(() => {
    if (reduit.current) { setPhase(3); setVue(vuePaysRef.current); onPret?.(); return undefined }
    const t = [
      setTimeout(() => { setPhase(1); aller(vuePaysRef.current, 3200) }, 1500),
      setTimeout(() => setPhase(2), 4300),
      setTimeout(() => { setPhase(3); onPret?.() }, 5600),
    ]
    return () => t.forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => () => cancelAnimationFrame(anim.current), [])

  // Choix d'une région : la caméra descend dessus ; sans région, retour sur le pays.
  useEffect(() => {
    if (phase < 3) return
    const r = REGIONS.find((x) => x.nom === regionChoisie)
    aller(r ? decale(cadre(r.bbox, 14, ratio), ratio) : vuePays, 1300)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regionChoisie, phase])

  const echelle = vue[2] / vuePays[2]
  const px = (n) => n * echelle
  const afrique = phase === 0 ? 1 : phase === 1 ? 0.35 : 0.12
  const zoomRegion = phase >= 3 && regionChoisie
  const points = useMemo(() => prefectures.map((z) => ({ ...z, xy: pt(z.longitude, z.latitude) })), [prefectures])
  const decalage = (r) => {
    const dx = r.centre[0] - CENTRE_TOGO[0]; const dy = r.centre[1] - CENTRE_TOGO[1]
    const n = Math.hypot(dx, dy) || 1
    const amp = phase === 2 ? 8 : phase >= 3 ? 2 : 0
    return `translate(${(dx / n) * amp}px, ${(dy / n) * amp}px)`
  }
  const lieuTogo = CENTRE_TOGO

  return (
    <div className="immersive" ref={conteneur}>
      <svg viewBox={vue.map((v) => v.toFixed(1)).join(' ')} role="img" aria-label="Carte animée : de l'Afrique au Togo, ses cinq régions et leurs préfectures" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="mer" cx="50%" cy="50%" r="75%"><stop offset="0%" stopColor="#eaf6fc" /><stop offset="100%" stopColor="#cfe6f3" /></radialGradient>
          <filter id="ombre-pays" x="-10%" y="-10%" width="120%" height="120%"><feDropShadow dx="0" dy={px(2)} stdDeviation={px(2.5)} floodColor="#17475f" floodOpacity="0.25" /></filter>
        </defs>
        <rect x={vue[0] - 4000} y={vue[1] - 4000} width={vue[2] + 8000} height={vue[3] + 8000} fill="url(#mer)" />

        <g style={{ opacity: afrique, transition: 'opacity 1.6s ease' }} aria-hidden="true">
          {AFRIQUE.map((c) => <path key={c.id} d={c.d} fill={c.id === 'TG' ? 'none' : '#dfe8ee'} stroke="#fff" strokeWidth="1.4" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />)}
        </g>

        {phase === 0 && (
          <g aria-hidden="true">
            <circle cx={lieuTogo[0]} cy={lieuTogo[1]} r="46" fill="none" stroke="#F26A21" strokeWidth="3" vectorEffect="non-scaling-stroke" className="repere-togo" />
            <circle cx={lieuTogo[0]} cy={lieuTogo[1]} r="9" fill="#F26A21" />
          </g>
        )}

        <g filter={phase >= 1 ? 'url(#ombre-pays)' : undefined} style={{ opacity: phase >= 1 ? 1 : 0, transition: 'opacity 1.4s ease .6s' }}>
          {REGIONS.map((r) => {
            const actif = regionChoisie === r.nom
            const estompe = zoomRegion && !actif
            return (
              <g key={r.id} className={`immersive-region ${phase >= 3 ? 'cliquable' : ''}`}
                 style={{ transform: decalage(r), opacity: estompe ? 0.35 : 1 }}
                 onClick={() => phase >= 3 && onRegion?.(actif ? null : r.nom)} role="button" tabIndex={phase >= 3 ? 0 : -1} aria-label={`Région ${r.nom}`}
                 onKeyDown={(e) => phase >= 3 && (e.key === 'Enter' || e.key === ' ') && onRegion?.(actif ? null : r.nom)}>
                <path d={r.d} fill={TEINTES[r.id]} stroke="#fff" strokeWidth={px(2.2)} strokeLinejoin="round" />
                {phase >= 2 && !zoomRegion && <text x={r.centre[0]} y={r.centre[1]} textAnchor="middle" fontSize={px(12)} fontWeight="800" fill="#17475f" stroke="#ffffffaa" strokeWidth={px(2.6)} paintOrder="stroke" style={{ pointerEvents: 'none' }}>{r.nom}</text>}
              </g>
            )
          })}
        </g>

        {phase >= 3 && zoomRegion && points.filter((z) => z.region === regionChoisie).map((z, i) => {
          const actif = prefChoisie === z.code
          return (
            <g key={z.code} className="immersive-pref" style={{ animationDelay: `${i * 70}ms`, transformOrigin: `${z.xy[0]}px ${z.xy[1]}px` }} role="button" tabIndex="0"
               aria-label={`${z.nom}${z.pilote ? ', dans le pilote' : ''}`} onClick={() => onPrefecture?.(z.code)}
               onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onPrefecture?.(z.code)}>
              <circle cx={z.xy[0]} cy={z.xy[1]} r={px(actif ? 9 : 6.5)} fill={z.pilote ? '#F26A21' : '#374EA2'} stroke="#fff" strokeWidth={px(2.2)} />
              {z.pilote && <circle cx={z.xy[0]} cy={z.xy[1]} r={px(13)} fill="none" stroke="#F26A21" strokeOpacity=".5" strokeWidth={px(2)} className="pulse-pref" />}
              <text x={z.xy[0]} y={z.xy[1] - px(12)} textAnchor="middle" fontSize={px(10)} fontWeight="700" fill="#17323f" stroke="#fff" strokeWidth={px(3)} paintOrder="stroke" style={{ pointerEvents: 'none' }}>{z.chefLieu}</text>
            </g>
          )
        })}
      </svg>
      {phase < 3 && <p className="immersive-titre" aria-live="polite">{phase === 0 ? 'Afrique de l’Ouest' : 'Le Togo'}</p>}
    </div>
  )
}

export { REGIONS, NOM_REGION_ID }
