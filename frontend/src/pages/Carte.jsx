import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api.js'
import { couleurIndice } from '../lib/format.js'

const L = 640
const H = 460
const MARGE = 70

function projeter(zones) {
  const lat = zones.map((z) => z.latitude)
  const lon = zones.map((z) => z.longitude)
  const [minLat, maxLat] = [Math.min(...lat), Math.max(...lat)]
  const [minLon, maxLon] = [Math.min(...lon), Math.max(...lon)]
  const dLat = maxLat - minLat || 1
  const dLon = maxLon - minLon || 1
  return (z) => ({
    x: MARGE + ((z.longitude - minLon) / dLon) * (L - 2 * MARGE),
    y: H - MARGE - ((z.latitude - minLat) / dLat) * (H - 2 * MARGE),
  })
}

const pct = (v) => (v === null || v === undefined ? '—' : `${v} %`)

export default function Carte() {
  const [zones, setZones] = useState([])
  const [erreur, setErreur] = useState('')
  const [choisie, setChoisie] = useState(null)

  useEffect(() => {
    api.get('/api/decideur/zones').then(setZones).catch((e) => setErreur(e.message))
  }, [])

  const xy = useMemo(() => (zones.length ? projeter(zones) : null), [zones])
  const triees = useMemo(
    () => [...zones].sort((a, b) => (b.indiceOubli ?? -1) - (a.indiceOubli ?? -1)),
    [zones],
  )
  const detail = zones.find((z) => z.code === choisie)

  return (
    <main className="page">
      <h1>Carte des zones oubliées</h1>
      <p className="petit">
        Taux par zone, jamais un enfant ni un point précis. Le centre de chaque zone est approximatif et les
        distances ne sont pas à l'échelle. Une zone avec moins de 5 familles n'est pas détaillée (anonymat).
        Données fictives.
      </p>
      {erreur && <p className="erreur" role="alert">{erreur}</p>}

      <div className="deux-colonnes">
        <section className="carte">
          {xy && (
            <svg viewBox={`0 0 ${L} ${H}`} role="img" aria-label="Carte schématique des zones, colorées selon l'indice d'oubli">
              <rect x="0" y="0" width={L} height={H} rx="12" fill="var(--fond-carte)" />
              {zones.map((z) => {
                const { x, y } = xy(z)
                const r = 20 + Math.min(z.familles, 20) * 0.9
                return (
                  <g key={z.code} tabIndex="0" role="button" aria-label={`${z.nom}, indice d'oubli ${z.indiceOubli ?? 'non détaillé'}`}
                     onClick={() => setChoisie(z.code)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setChoisie(z.code)}
                     style={{ cursor: 'pointer' }}>
                    <circle cx={x} cy={y} r={r} fill={couleurIndice(z.indiceOubli)} fillOpacity="0.85"
                            stroke={choisie === z.code ? '#000' : '#fff'} strokeWidth={choisie === z.code ? 3 : 2}
                            strokeDasharray={z.masquee ? '5 4' : undefined} />
                    <text x={x} y={y + 5} textAnchor="middle" fontSize="15" fontWeight="700" fill="#fff">{z.indiceOubli ?? '?'}</text>
                    <text x={x} y={y + r + 16} textAnchor="middle" fontSize="12" fill="var(--texte)">{z.nom}</text>
                  </g>
                )
              })}
            </svg>
          )}
          <div className="legende" aria-hidden="true">
            <span><i style={{ background: '#2e7d32' }} /> bien suivie (0–34)</span>
            <span><i style={{ background: '#e08a00' }} /> à surveiller (35–59)</span>
            <span><i style={{ background: '#b3261e' }} /> oubliée (60–100)</span>
            <span><i style={{ background: '#9e9e9e' }} /> non détaillée</span>
          </div>
        </section>

        <section>
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
        </section>
      </div>
    </main>
  )
}
