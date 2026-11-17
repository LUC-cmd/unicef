import { useRef, useState } from 'react'

// Palette catégorielle validée (écart de teinte contrôlé) : cyan UNICEF, bleu UNICEF, orange, violet.
export const COULEURS = { cyan: '#1CABE2', bleu: '#374EA2', orange: '#F26A21', violet: '#8A5CC2' }
const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
export const jourCourt = (iso) => { const [, m, j] = iso.split('-'); return `${Number(j)} ${MOIS[Number(m) - 1]}` }

function arrondi(max) {
  if (max <= 10) return Math.max(4, Math.ceil(max / 2) * 2)
  const p = 10 ** Math.floor(Math.log10(max))
  const n = max / p
  return (n <= 2 ? 2 : n <= 5 ? 5 : 10) * p
}

/** Moyenne mobile centrée : la courbe montre la tendance, l'infobulle garde la valeur exacte du jour. */
export const lisser = (v, k = 1) => v.map((_, i) => { const a = v.slice(Math.max(0, i - k), i + k + 1); return a.reduce((s, x) => s + x, 0) / a.length })

const L = 680, H = 240, M = { g: 40, d: 14, h: 14, b: 28 }

/** Courbes sur plusieurs jours, avec repère et infobulle au survol. series : { nom, valeurs, couleur }. */
export function Courbe({ titre, jours, series }) {
  const [survol, setSurvol] = useState(null)
  const ref = useRef(null)
  const haut = arrondi(Math.max(1, ...series.flatMap((s) => s.valeurs)))
  const n = jours.length
  const x = (i) => M.g + (i / Math.max(1, n - 1)) * (L - M.g - M.d)
  const y = (v) => M.h + (1 - v / haut) * (H - M.h - M.b)
  const trait = (vals) => lisser(vals).map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')
  const aire = (vals) => `${trait(vals)} L${x(n - 1).toFixed(1)} ${y(0)} L${x(0).toFixed(1)} ${y(0)} Z`
  const graduations = [0, 0.5, 1].map((f) => Math.round(haut * f))
  const reperes = jours.map((j, i) => [j, i]).filter(([, i]) => (n - 1 - i) % 7 === 0)

  function bouger(e) {
    const r = ref.current.getBoundingClientRect()
    const px = ((e.clientX - r.left) / r.width) * L
    const i = Math.round(((px - M.g) / (L - M.g - M.d)) * (n - 1))
    setSurvol(Math.max(0, Math.min(n - 1, i)))
  }

  return (
    <figure className="graphe courbe">
      {titre && <figcaption className="graphe-titre">{titre}</figcaption>}
      <ul className="courbe-legende">
        {series.map((s) => <li key={s.nom}><i style={{ background: s.couleur }} />{s.nom} <b>{s.valeurs.reduce((a, b) => a + b, 0)}</b></li>)}
      </ul>
      <div className="courbe-zone">
        <svg ref={ref} viewBox={`0 0 ${L} ${H}`} width="100%" role="img" aria-label={`${titre}. Détail dans le tableau sous le graphique.`}
             onMouseMove={bouger} onMouseLeave={() => setSurvol(null)} onTouchStart={(e) => bouger(e.touches[0])} onTouchMove={(e) => bouger(e.touches[0])}>
          {graduations.map((g) => (
            <g key={g}>
              <line x1={M.g} x2={L - M.d} y1={y(g)} y2={y(g)} stroke="#e3ebf0" strokeWidth="1" />
              <text x={M.g - 8} y={y(g) + 4} textAnchor="end" fontSize="11" fill="#5c5855">{g}</text>
            </g>
          ))}
          {reperes.map(([j, i]) => <text key={j} x={x(i)} y={H - 8} textAnchor={i === n - 1 ? 'end' : i === 0 ? 'start' : 'middle'} fontSize="11" fill="#5c5855">{jourCourt(j)}</text>)}
          <defs>
            <linearGradient id="degrade-courbe" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor={series[0].couleur} stopOpacity="0.28" /><stop offset="1" stopColor={series[0].couleur} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={aire(series[0].valeurs)} fill="url(#degrade-courbe)" />
          {series.map((s) => <path key={s.nom} d={trait(s.valeurs)} fill="none" stroke={s.couleur} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />)}
          {survol !== null && (
            <g>
              <line x1={x(survol)} x2={x(survol)} y1={M.h} y2={y(0)} stroke="#2d2926" strokeOpacity="0.25" strokeDasharray="3 3" />
              {series.map((s) => <circle key={s.nom} cx={x(survol)} cy={y(s.valeurs[survol])} r="4.5" fill={s.couleur} stroke="#fff" strokeWidth="2" />)}
            </g>
          )}
        </svg>
        {survol !== null && (
          <div className="courbe-bulle" style={{ left: `${(x(survol) / L) * 100}%` }}>
            <b>{jourCourt(jours[survol])}</b>
            {series.map((s) => <span key={s.nom}><i style={{ background: s.couleur }} />{s.nom} : <b>{s.valeurs[survol]}</b></span>)}
          </div>
        )}
      </div>
      <details className="graphe-table">
        <summary>Voir les chiffres</summary>
        <div className="tableau-conteneur"><table>
          <thead><tr><th>Jour</th>{series.map((s) => <th key={s.nom}>{s.nom}</th>)}</tr></thead>
          <tbody>{jours.map((j, i) => <tr key={j}><td>{jourCourt(j)}</td>{series.map((s) => <td key={s.nom}>{s.valeurs[i]}</td>)}</tr>)}</tbody>
        </table></div>
      </details>
    </figure>
  )
}

/** Petite courbe sans axes pour une tuile de chiffre. */
export function Mini({ valeurs: brutes, couleur = COULEURS.cyan }) {
  const valeurs = lisser(brutes, 2)
  const max = Math.max(1, ...valeurs)
  const w = 120, h = 36
  const pts = valeurs.map((v, i) => [(i / Math.max(1, valeurs.length - 1)) * (w - 6) + 3, h - 4 - (v / max) * (h - 10)])
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mini" aria-hidden="true">
      <path d={pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')} fill="none" stroke={couleur} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="3" fill={couleur} stroke="#fff" strokeWidth="1.5" />
    </svg>
  )
}

/** Tuile de chiffre : valeur, libellé, tendance sur la période, mini-courbe. */
export function TuileChiffre({ libelle, valeur, serie, aide, couleur }) {
  const somme = serie ? serie.reduce((a, b) => a + b, 0) : null
  return (
    <div className="tuile-chiffre">
      <div className="tuile-texte">
        <span className="tuile-libelle">{libelle}</span>
        <b className="tuile-valeur">{valeur}</b>
        {(aide || somme !== null) && <span className="tuile-aide">{aide ?? `${somme} sur 30 jours`}</span>}
      </div>
      {serie && <Mini valeurs={serie} couleur={couleur} />}
    </div>
  )
}
