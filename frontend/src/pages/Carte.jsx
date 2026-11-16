import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api.js'
import { couleurIndice } from '../lib/format.js'
import { Squelette } from '../components/Chargement.jsx'
import { Barres } from '../components/Graphiques.jsx'
import ActesSuivi from '../components/ActesSuivi.jsx'
import Bandeau from '../components/Bandeau.jsx'
import { Link } from 'react-router-dom'

const L = 640
const H = 470
// Cadre de la carte schématique : région Maritime, de Lomé à Tabligbo
const LAT = [5.98, 6.68]
const LON = [1.1, 1.7]
const proj = (lon, lat) => ({
  x: ((lon - LON[0]) / (LON[1] - LON[0])) * L,
  y: H - ((lat - LAT[0]) / (LAT[1] - LAT[0])) * H,
})
const COTE = [[1.1, 6.07], [1.22, 6.095], [1.4, 6.14], [1.6, 6.185], [1.7, 6.2]]
const cheminCote = COTE.map(([lo, la], i) => { const { x, y } = proj(lo, la); return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}` }).join(' ')
const mer = `${cheminCote} L${L} ${H} L0 ${H} Z`
const lac = proj(1.5, 6.17)

const pct = (v) => (v === null || v === undefined ? '—' : `${v} %`)

export default function Carte({ vue = 'carte' }) {
  const [zones, setZones] = useState([])
  const [erreur, setErreur] = useState('')
  const [choisie, setChoisie] = useState(null)

  useEffect(() => {
    api.get('/api/decideur/zones').then(setZones).catch((e) => setErreur(e.message))
  }, [])

  const triees = useMemo(
    () => [...zones].sort((a, b) => (b.indiceOubli ?? -1) - (a.indiceOubli ?? -1)),
    [zones],
  )
  const detail = zones.find((z) => z.code === choisie)

  const detaillees = zones.filter((z) => !z.masquee)
  const oubliees = detaillees.filter((z) => (z.indiceOubli ?? 0) >= 60)
  const totalFamilles = zones.reduce((n, z) => n + z.familles, 0)
  const prioritaire = triees.find((z) => !z.masquee && z.indiceOubli !== null)

  const action = (z) => z.masquee ? 'Trop peu de familles : suivi par l\'agent' : (z.indiceOubli ?? 0) >= 60 ? 'Envoyer une équipe mobile cette semaine' : (z.indiceOubli ?? 0) >= 35 ? 'Renforcer les rappels et les visites' : 'Maintenir le suivi'
  const attente = zones.length === 0 && !erreur
  const gauche = (
    <>
        <section className="carte carte-carte">
          <svg viewBox={`0 0 ${L} ${H}`} role="img" aria-label="Carte schématique des zones, colorées selon l'indice d'oubli">
            <defs>
              <pattern id="quadrillage" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#dbe7ee" strokeWidth="1" /></pattern>
            </defs>
            <rect width={L} height={H} fill="#f3f7f2" />
            <rect width={L} height={H} fill="url(#quadrillage)" />
            <path d={mer} fill="#cfeaf7" />
            <path d={cheminCote} fill="none" stroke="#7fc3e3" strokeWidth="3" strokeLinecap="round" />
            <ellipse cx={lac.x} cy={lac.y} rx="48" ry="11" fill="#cfeaf7" transform={`rotate(-8 ${lac.x} ${lac.y})`} />
            <text x="22" y={H - 20} fontSize="14" fill="#4e86a5" fontStyle="italic">Golfe de Guinée</text>
            {zones.map((z) => {
              const { x, y } = proj(z.longitude, z.latitude)
              const r = 17 + Math.min(z.familles, 25) * 0.7
              const actif = choisie === z.code
              return (
                <g key={z.code} tabIndex="0" role="button" aria-label={`${z.nom}, indice d'oubli ${z.indiceOubli ?? 'non détaillé'}`}
                   onClick={() => setChoisie(z.code)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setChoisie(z.code)}
                   style={{ cursor: 'pointer' }}>
                  <circle cx={x} cy={y} r={r + 8} fill={couleurIndice(z.indiceOubli)} fillOpacity="0.16" />
                  <circle cx={x} cy={y} r={r} fill={couleurIndice(z.indiceOubli)} stroke={actif ? '#2d2926' : '#fff'} strokeWidth={actif ? 4 : 3}
                          strokeDasharray={z.masquee ? '5 4' : undefined} />
                  <text x={x} y={y + 6} textAnchor="middle" fontSize="17" fontWeight="700" fill="#fff" style={{ fontFamily: 'var(--police-titre)' }}>{z.indiceOubli ?? '?'}</text>
                  <rect x={x - 46} y={y + r + 6} width="92" height="20" rx="10" fill="#fff" fillOpacity="0.92" />
                  <text x={x} y={y + r + 20} textAnchor="middle" fontSize="12" fontWeight="700" fill="#2d2926">{z.nom.replace(/ \(.*\)/, '')}</text>
                </g>
              )
            })}
          </svg>
          <div className="legende" aria-hidden="true">
            <span><i style={{ background: '#00833d' }} /> bien suivie (0–34)</span>
            <span><i style={{ background: '#f26a21' }} /> à surveiller (35–59)</span>
            <span><i style={{ background: '#e2231a' }} /> oubliée (60–100)</span>
            <span><i style={{ background: '#777779' }} /> non détaillée</span>
          </div>
        </section>

    </>
  )
  const detailJsx = (
    <>
          {detail ? (
            <div className="carte">
              <h2>{detail.nom}</h2>
              {detail.masquee ? (
                <p>Moins de 5 familles : zone non détaillée pour protéger l'anonymat.</p>
              ) : (
                <dl className="stats">
                  <dt>Indice d'oubli</dt><dd>{detail.indiceOubli} / 100</dd>
                  <dt>Rendez-vous réalisés</dt><dd>{pct(detail.tauxSuiviPct)}</dd>
                  <dt>Naissances déclarées (enfants de plus de 45 jours)</dt><dd>{pct(detail.tauxNaissancesDeclareesPct)}</dd>
                  <dt>Familles qui ont fait un jeu d'éveil cette semaine</dt><dd>{pct(detail.tauxEveilPct)}</dd>
                  <dt>Familles dont un rappel est sans réponse</dt><dd>{detail.famillesSansReponse} sur {detail.familles}</dd>
                  <dt>Familles sans téléphone</dt><dd>{detail.famillesSansTelephone} sur {detail.familles}</dd>
                  <dt>Couverture réseau</dt><dd>{detail.couvertureReseau === 'INCONNUE' ? 'Pas encore mesurée (le pilote l\'établira)' : detail.couvertureReseau}</dd>
                </dl>
              )}
              <p className="petit">L'indice combine : rendez-vous réalisés (50 %), naissances déclarées (30 %), rappels sans réponse (20 %). Sans donnée, une zone compte comme oubliée.</p>
            </div>
          ) : (
            <div className="carte"><p>Cliquez sur une zone pour voir le détail. Où envoyer une équipe mobile en premier ?</p></div>
          )}

    </>
  )
  const barresJsx = (
          <div className="carte">
            <Barres titre="Indice d'oubli par zone (0 = bien suivie, 100 = oubliée)"
                    items={triees.map((z) => ({ nom: z.nom.replace(/ \(.*\)/, ''), valeur: z.masquee ? null : z.indiceOubli, couleur: couleurIndice(z.indiceOubli) }))} />
            <Barres titre="Rendez-vous réalisés, par zone" unite=" %"
                    items={triees.map((z) => ({ nom: z.nom.replace(/ \(.*\)/, ''), valeur: z.masquee ? null : z.tauxSuiviPct, couleur: '#1cabe2' }))} />
          </div>

  )
  const tableJsx = (
          <details className="carte">
            <summary>Voir le tableau détaillé</summary>
          <div className="tableau-conteneur">
            <table>
              <thead><tr><th>Zone</th><th>Indice</th><th>Rdv réalisés</th><th>Naissances</th><th>Éveil</th><th>Sans réponse</th></tr></thead>
              <tbody>
                {triees.map((z) => (
                  <tr key={z.code} onClick={() => setChoisie(z.code)} className={choisie === z.code ? 'choisie' : ''} style={{ cursor: 'pointer' }}>
                    <td>{z.nom}</td>
                    <td><b style={{ color: couleurIndice(z.indiceOubli) }}>{z.indiceOubli ?? '—'}</b></td>
                    <td>{pct(z.tauxSuiviPct)}</td>
                    <td>{pct(z.tauxNaissancesDeclareesPct)}</td>
                    <td>{pct(z.tauxEveilPct)}</td>
                    <td>{z.famillesSansReponse ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </details>
  )

  if (attente && vue !== 'actes') {
    return (
      <main className="page">
        <Bandeau surtitre="Responsable régional" titre="Chargement des zones…">Calcul des indices par zone.</Bandeau>
        <Squelette />
      </main>
    )
  }

  if (vue === 'tableau') {
    return (
      <main className="page">
        <Bandeau surtitre="Responsable régional" titre="Tableau de bord">
          Où envoyer une équipe en premier ? Des taux par zone, jamais un enfant.
        </Bandeau>
        {erreur && <p className="erreur" role="alert">{erreur}</p>}
      {zones.length > 0 && (
        <div className="tableau-kpi">
          <div className="tuile"><b>{zones.length}</b><span>zones suivies</span></div>
          <div className="tuile"><b>{totalFamilles}</b><span>familles dans le fil</span></div>
          <div className={`tuile ${oubliees.length ? 'alerte' : ''}`}><b>{oubliees.length}</b><span>zone(s) oubliée(s) (indice ≥ 60)</span></div>
          {prioritaire && <div className="tuile mise-en-avant"><b>{prioritaire.nom}</b><span>à visiter en premier · indice {prioritaire.indiceOubli}</span></div>}
        </div>
      )}

        <div className="raccourcis">
          <Link className="bouton" to="/carte/carte">Ouvrir la carte</Link>
          <Link className="bouton secondaire" to="/carte/zones">Comparer les zones</Link>
          <Link className="bouton secondaire" to="/carte/actes">Actes de naissance</Link>
        </div>
        <section className="carte">
          <h2>Où agir en premier</h2>
          <div className="tableau-conteneur"><table>
            <thead><tr><th>Zone</th><th>Indice</th><th>Action recommandée</th></tr></thead>
            <tbody>
              {triees.map((z) => (
                <tr key={z.code}><td>{z.nom}</td><td><b style={{ color: couleurIndice(z.indiceOubli) }}>{z.indiceOubli ?? '—'}</b></td><td>{action(z)}</td></tr>
              ))}
            </tbody>
          </table></div>
        </section>
        <div className="grille-deux">
          {barresJsx}
          <ActesSuivi role="DECIDEUR" />
        </div>
      </main>
    )
  }

  if (vue === 'zones') {
    return (
      <main className="page">
        <Bandeau surtitre="Responsable régional" titre="Comparer les zones">
          Indice d'oubli, rendez-vous réalisés, naissances déclarées. Cliquez sur une ligne pour le détail.
        </Bandeau>
        {erreur && <p className="erreur" role="alert">{erreur}</p>}
        <div className="grille-deux">
          <div>{detailJsx}</div>
          {barresJsx}
        </div>
        <div className="carte"><div className="tableau-conteneur"><table>
          <thead><tr><th>Zone</th><th>Indice</th><th>Rdv réalisés</th><th>Naissances</th><th>Éveil</th><th>Sans réponse</th></tr></thead>
          <tbody>
            {triees.map((z) => (
              <tr key={z.code} onClick={() => setChoisie(z.code)} className={choisie === z.code ? 'choisie' : ''} style={{ cursor: 'pointer' }}>
                <td>{z.nom}</td>
                <td><b style={{ color: couleurIndice(z.indiceOubli) }}>{z.indiceOubli ?? '—'}</b></td>
                <td>{pct(z.tauxSuiviPct)}</td>
                <td>{pct(z.tauxNaissancesDeclareesPct)}</td>
                <td>{pct(z.tauxEveilPct)}</td>
                <td>{z.famillesSansReponse ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table></div></div>
      </main>
    )
  }

  if (vue === 'actes') {
    return (
      <main className="page">
        <Bandeau surtitre="Responsable régional" titre="Actes de naissance">
          Combien d'actes validés ont été retirés par les familles, zone par zone.
        </Bandeau>
        <ActesSuivi role="DECIDEUR" />
      </main>
    )
  }

  return (
    <main className="page">
      <Bandeau surtitre="Responsable régional" titre="Carte des zones oubliées">
        Le centre de chaque zone est approximatif et le dessin est schématique. Une zone de moins de 5 familles n'est pas détaillée.
      </Bandeau>
      {erreur && <p className="erreur" role="alert">{erreur}</p>}
      <div className="deux-colonnes">
        {gauche}
        <section>{detailJsx}</section>
      </div>
    </main>
  )
}
