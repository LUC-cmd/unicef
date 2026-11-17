import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import togo, { CONTOUR } from '../lib/togo.js'
import { couleurIndice } from '../lib/format.js'

// Projection simple : le Togo est petit, une projection plate corrigée de la latitude suffit.
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
const TOUS = REGIONS.reduce((b, r) => [Math.min(b[0], r.bbox[0]), Math.min(b[1], r.bbox[1]), Math.max(b[2], r.bbox[2]), Math.max(b[3], r.bbox[3])], [1e9, 1e9, -1e9, -1e9])
const PAYS = [(TOUS[0] + TOUS[2]) / 2, (TOUS[1] + TOUS[3]) / 2]
const cadre = (b, marge, ratio) => {
  let w = b[2] - b[0] + marge * 2; let h = b[3] - b[1] + marge * 2
  if (w / h < ratio) w = h * ratio; else h = w / ratio
  const cx = (b[0] + b[2]) / 2; const cy = (b[1] + b[3]) / 2
  return [cx - w / 2, cy - h / 2, w, h]
}
const RATIO = 1.25
const VUE_PAYS = cadre(TOUS, 14, RATIO)
const MARITIME = REGIONS.find((r) => r.nom === 'Maritime')
const VUE_MARITIME = cadre(MARITIME.bbox, 10, RATIO)
const SEGMENTS = CONTOUR[0].slice(1).map((p, i) => [pt(...CONTOUR[0][i]), pt(...p)])
const DUREE_TRACE = 1900

const TEINTES = { 'TG-M': '#1CABE2', 'TG-P': '#7CC9EA', 'TG-C': '#A6DAF0', 'TG-K': '#5CB8DF', 'TG-S': '#C4E6F5' }
const facile = (t) => (t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2)

/** Le Togo se dessine, se découpe en régions, puis la caméra descend sur la région Maritime où le pilote suit les zones. */
export default function CarteTogo({ zones = [], horsPilote = [], choisie, onChoisir }) {
  const [phase, setPhase] = useState(0) // 0 tracé · 1 remplissage · 2 découpe · 3 zoom · 4 prêt
  const [vue, setVue] = useState(VUE_PAYS)
  const [region, setRegion] = useState(null)
  const [cycle, setCycle] = useState(0)
  const reduit = useRef(typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  const anim = useRef(0)

  const aller = useCallback((vers, duree = 1500) => {
    cancelAnimationFrame(anim.current)
    const depart = performance.now()
    let de
    setVue((v) => { de = v; return v })
    const pas = (now) => {
      const t = Math.min(1, (now - depart) / duree)
      const e = facile(t)
      setVue((de ?? VUE_PAYS).map((x, i) => x + (vers[i] - x) * e))
      if (t < 1) anim.current = requestAnimationFrame(pas)
    }
    anim.current = requestAnimationFrame(pas)
  }, [])

  useEffect(() => {
    if (reduit.current) { setPhase(4); setVue(VUE_MARITIME); return undefined }
    setPhase(0); setVue(VUE_PAYS); setRegion(null)
    const t = [
      setTimeout(() => setPhase(1), DUREE_TRACE + 100),
      setTimeout(() => setPhase(2), DUREE_TRACE + 900),
      setTimeout(() => { setPhase(3); aller(VUE_MARITIME, 1700) }, DUREE_TRACE + 2300),
      setTimeout(() => setPhase(4), DUREE_TRACE + 4000),
    ]
    return () => { t.forEach(clearTimeout); cancelAnimationFrame(anim.current) }
  }, [cycle, aller])

  const echelle = vue[2] / VUE_PAYS[2]
  const trait = (px) => px * echelle
  const decalage = (r) => {
    const dx = r.centre[0] - PAYS[0]; const dy = r.centre[1] - PAYS[1]
    const n = Math.hypot(dx, dy) || 1
    const amp = phase === 2 ? 26 : phase >= 3 ? 3 : 0
    return `translate(${(dx / n) * amp}px, ${(dy / n) * amp}px)`
  }
  const zoomee = phase >= 3
  const points = useMemo(() => zones.map((z) => ({ ...z, xy: pt(z.longitude, z.latitude) })), [zones])
  const autres = useMemo(() => horsPilote.map((z) => ({ ...z, xy: pt(z.longitude, z.latitude) })), [horsPilote])
  const rayon = (z) => (4.2 + Math.sqrt(z.familles ?? 5) * 0.62) * echelle * 1.9

  function cliquerRegion(r) {
    if (phase < 4) return
    if (r.nom === 'Maritime') { setRegion(null); aller(VUE_MARITIME, 900) } else { setRegion(r); aller(cadre(r.bbox, 10, RATIO), 900) }
  }

  return (
    <figure className="carte-togo">
      <svg viewBox={vue.map((v) => v.toFixed(2)).join(' ')} role="img" aria-label="Carte du Togo en cinq régions, avec les zones suivies dans la région Maritime">
        <defs>
          <filter id="lueur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation={3 * echelle} result="f" /><feMerge><feMergeNode in="f" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          <pattern id="trame-togo" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="#c3d8e4" /></pattern>
        </defs>
        <rect x={vue[0] - 800} y={vue[1] - 800} width="2400" height="2400" fill="url(#trame-togo)" opacity="0.55" />

        {REGIONS.map((r) => {
          const estMaritime = r.nom === 'Maritime'
          const apparue = phase >= 1
          const estompee = phase >= 3 && !estMaritime && region?.id !== r.id
          return (
            <g key={r.id} className="togo-region" style={{ transform: decalage(r), opacity: apparue ? (estompee ? 0.4 : 1) : 0 }}
               onClick={() => cliquerRegion(r)} role="button" tabIndex={phase >= 4 ? 0 : -1} aria-label={`Région ${r.nom}`}
               onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && cliquerRegion(r)}>
              <path d={r.d} fill={TEINTES[r.id]} stroke="#fff" strokeWidth={trait(2.4)} strokeLinejoin="round" />
              {!zoomee && phase >= 2 && <text x={r.centre[0]} y={r.centre[1]} textAnchor="middle" fontSize="15" fontWeight="700" fill="#17475f" style={{ pointerEvents: 'none' }}>{r.nom}</text>}
            </g>
          )
        })}

        {phase < 2 && (
          <g filter="url(#lueur)" fill="none" stroke="#1393c7" strokeWidth={trait(2.6)} strokeLinecap="round" aria-hidden="true">
            {SEGMENTS.map(([a, b], i) => (
              <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} className="togo-trait" style={{ animationDelay: `${(i / SEGMENTS.length) * DUREE_TRACE}ms` }} />
            ))}
          </g>
        )}

        {zoomee && !region && phase >= 3 && (
          <text x={MARITIME.centre[0]} y={MARITIME.bbox[1] + trait(14)} textAnchor="middle" fontSize={trait(15)} fontWeight="700" fill="#17475f" className="togo-apparition">Région Maritime</text>
        )}

        {phase >= 4 && echelle > 0.5 && autres.map((z) => (
          <g key={z.code} aria-label={`${z.nom}, pas encore dans le pilote`} style={{ pointerEvents: 'none' }}>
            <circle cx={z.xy[0]} cy={z.xy[1]} r={trait(3.4)} fill="#fff" stroke="#6f8796" strokeWidth={trait(1.3)} />
            {echelle > 0.75 && <text x={z.xy[0] + trait(6)} y={z.xy[1] + trait(3.5)} fontSize={trait(8.5)} fill="#31515f" stroke="#fff" strokeWidth={trait(2.4)} paintOrder="stroke">{z.nom.replace(/ \(.*\)/, '')}</text>}
          </g>
        ))}

        {phase >= 4 && !region && points.map((z, i) => {
          const r = rayon(z)
          const actif = choisie === z.code
          return (
            <g key={z.code} className="togo-zone" style={{ animationDelay: `${i * 90}ms`, transformOrigin: `${z.xy[0]}px ${z.xy[1]}px` }} tabIndex="0" role="button"
               aria-label={`${z.nom}, indice d'oubli ${z.indiceOubli ?? 'non détaillé'}`} onClick={() => onChoisir?.(z.code)}
               onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onChoisir?.(z.code)}>
              <circle cx={z.xy[0]} cy={z.xy[1]} r={r + trait(5)} fill={couleurIndice(z.indiceOubli)} fillOpacity="0.2" />
              <circle cx={z.xy[0]} cy={z.xy[1]} r={r} fill={couleurIndice(z.indiceOubli)} stroke={actif ? '#2d2926' : '#fff'} strokeWidth={trait(actif ? 3 : 2)} strokeDasharray={z.masquee ? `${trait(4)} ${trait(3)}` : undefined} />
              <text x={z.xy[0]} y={z.xy[1] + r * 0.36} textAnchor="middle" fontSize={r * 0.95} fontWeight="700" fill="#fff" style={{ pointerEvents: 'none' }}>{z.indiceOubli ?? '?'}</text>
              <text x={z.xy[0]} y={z.xy[1] + r + trait(14)} textAnchor="middle" fontSize={trait(12)} fontWeight="700" fill="#2d2926" stroke="#fff" strokeWidth={trait(3)} paintOrder="stroke" style={{ pointerEvents: 'none' }}>{z.nom.replace(/ \(.*\)/, '')}</text>
            </g>
          )
        })}
      </svg>

      <div className="carte-togo-barre">
        {phase < 4 ? <span className="petit">Le Togo se dessine…</span> : region ? (
          <span className="petit"><b>{region.nom}</b> : pas encore dans le pilote. Le suivi commence par la région Maritime.</span>
        ) : (
          <div className="legende" aria-hidden="true">
            <span><i style={{ background: '#00833d' }} /> bien suivie (0–34)</span>
            <span><i style={{ background: '#f26a21' }} /> à surveiller (35–59)</span>
            <span><i style={{ background: '#e2231a' }} /> oubliée (60–100)</span>
            <span><i style={{ background: '#777779' }} /> non détaillée</span>
            {horsPilote.length > 0 && <span><i className="horspilote" /> hors pilote</span>}
          </div>
        )}
        <div className="carte-togo-actions">
          {phase >= 4 && (region || vue !== VUE_MARITIME) && <button type="button" className="bouton secondaire petit-bouton" onClick={() => { setRegion(null); aller(VUE_MARITIME, 900) }}>Région Maritime</button>}
          {phase >= 4 && <button type="button" className="bouton secondaire petit-bouton" onClick={() => { setRegion(null); aller(VUE_PAYS, 900) }}>Tout le Togo</button>}
          <button type="button" className="bouton secondaire petit-bouton" onClick={() => setCycle((c) => c + 1)}>Rejouer</button>
        </div>
      </div>
      <figcaption className="petit carte-togo-source">Chaque cercle est le centre approximatif d'une zone ; son chiffre est l'indice d'oubli. Contours : <a href="https://www.amcharts.com/" target="_blank" rel="noreferrer">amCharts</a> (Natural Earth).</figcaption>
    </figure>
  )
}
