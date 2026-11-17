import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'

const LIGNES = [
  ['grossesseSansNaissance', 'Grossesse suivie, naissance jamais notée', 'Une mère suivie pendant sa grossesse dont on perd la trace après le terme.'],
  ['naissanceSansDeclaration', 'Nés depuis plus de 45 jours, jamais déclarés', 'Le délai gratuit est dépassé : il faut un jugement supplétif.'],
  ['acteNonRetire', 'Actes prêts, jamais retirés', 'La déclaration est validée mais la famille n’est pas venue chercher l’acte.'],
  ['vaccineSansEveil', 'Vaccinés, jamais orientés vers l’éveil', 'Un enfant vacciné que l’on n’a pas lancé dans les jeux d’éveil.'],
  ['troisCinqAns', 'De 3 à 5 ans, pas au préscolaire', 'Moins de 3 enfants sur 10 vont au préscolaire au Togo.'],
  ['petitPoidsSansVisite', 'Petit poids sans visite la première semaine', 'Le suivi à domicile n’a pas eu lieu après la sortie.'],
]
const COULEURS = { hygiene: '#1CABE2', vaccination: '#374EA2', nutrition: '#F26A21' }

function Courbes({ progres }) {
  const tri = [...new Set(progres.map((p) => p.trimestre))].sort()
  if (tri.length < 2) return null
  const moy = (t, k) => { const l = progres.filter((p) => p.trimestre === t); return l.reduce((s, p) => s + p[k], 0) / l.length }
  const W = 360, H = 170, mx = 40, my = 16
  const all = ['hygiene', 'vaccination', 'nutrition'].flatMap((k) => tri.map((t) => moy(t, k)))
  const lo = Math.floor(Math.min(...all) / 5) * 5 - 5, hi = Math.ceil(Math.max(...all) / 5) * 5 + 5
  const x = (i) => mx + (i * (W - mx - 20)) / (tri.length - 1)
  const y = (v) => H - 24 - ((v - lo) / (hi - lo)) * (H - 24 - my)
  return (
    <figure className="progres">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Progrès par trimestre : hygiène, vaccination, nutrition">
        {[lo, (lo + hi) / 2, hi].map((v) => <g key={v}><line x1={mx} x2={W - 10} y1={y(v)} y2={y(v)} stroke="#e3ebf2" /><text x={mx - 6} y={y(v) + 4} textAnchor="end" fontSize="10" fill="#52606d">{Math.round(v)}</text></g>)}
        {tri.map((t, i) => <text key={t} x={x(i)} y={H - 6} textAnchor="middle" fontSize="10" fill="#52606d">{t.replace('2026-', '')}</text>)}
        {['hygiene', 'vaccination', 'nutrition'].map((k) => {
          const pts = tri.map((t, i) => [x(i), y(moy(t, k))])
          return <g key={k}><polyline fill="none" stroke={COULEURS[k]} strokeWidth="2.5" points={pts.map((p) => p.join(',')).join(' ')} />
            {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="4" fill={COULEURS[k]} stroke="#fff" strokeWidth="2" />)}</g>
        })}
      </svg>
      <figcaption className="legende-p">{Object.entries({ hygiene: 'Hygiène', vaccination: 'Vaccination', nutrition: 'Nutrition' }).map(([k, n]) => {
        const a = moy(tri[0], k), b = moy(tri[tri.length - 1], k)
        return <span key={k}><i style={{ background: COULEURS[k] }} /> {n} <b>{b - a >= 0 ? '+' : ''}{(b - a).toFixed(0)} pts</b></span>
      })}</figcaption>
    </figure>
  )
}

/** Où les enfants se perdent entre deux services, et si la région progresse. */
export default function RupturesParcours() {
  const [r, setR] = useState(null)
  const [progres, setProgres] = useState([])
  const [erreur, setErreur] = useState('')
  useEffect(() => {
    api.get('/api/decideur/ruptures').then(setR).catch((e) => setErreur(e.message))
    api.get('/api/decideur/progres').then(setProgres).catch(() => {})
  }, [])
  if (!r) return erreur ? <p className="erreur" role="alert">{erreur}</p> : <div className="sq-bloc sq-carte" role="status" aria-label="Chargement" />
  const val = (k) => (k === 'troisCinqAns' ? r.troisCinqAns - r.troisCinqAnsAuPrescolaire : r[k])
  const max = Math.max(1, ...LIGNES.map(([k]) => val(k)))
  return (
    <section className="carte" aria-labelledby="titre-ruptures">
      <h2 id="titre-ruptures">Où les enfants se perdent entre deux services</h2>
      <p className="petit">Des nombres par zone, jamais un enfant. Chaque ligne est un passage d'une étape à l'autre.</p>
      <ul className="ruptures">
        {LIGNES.map(([k, titre, aide]) => (
          <li key={k}>
            <div className="rupture-tete"><b>{titre}</b><span>{val(k)}</span></div>
            <div className="rupture-barre"><i style={{ width: `${(100 * val(k)) / max}%` }} /></div>
            <small>{aide}{k === 'troisCinqAns' && ` Part au préscolaire dans la région : ${r.partPrescolaire} %.`}</small>
          </li>
        ))}
      </ul>
      <div className="tableau-conteneur"><table>
        <thead><tr><th>Zone</th><th>Sans naissance</th><th>Non déclarés</th><th>Actes non retirés</th><th>Sans éveil</th><th>Hors préscolaire</th></tr></thead>
        <tbody>{r.zones.map((z) => (
          <tr key={z.zone}><td>{z.zone}</td>{z.masquee ? <td colSpan="5" className="petit">Moins de 5 familles : non détaillé</td> : <>
            <td>{z.grossesseSansNaissance}</td><td>{z.naissanceSansDeclaration}</td><td>{z.acteNonRetire}</td><td>{z.vaccineSansEveil}</td><td>{z.troisCinqAnsHorsPrescolaire}</td></>}</tr>
        ))}</tbody>
      </table></div>
      {progres.length > 0 && <>
        <h3>Les progrès, trimestre après trimestre</h3>
        <p className="petit">Part des familles concernées, moyenne des zones pilotes. Données de démonstration.</p>
        <Courbes progres={progres} />
      </>}
    </section>
  )
}
