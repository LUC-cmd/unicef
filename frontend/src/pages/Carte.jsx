import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api.js'
import { couleurIndice } from '../lib/format.js'
import { Squelette } from '../components/Chargement.jsx'
import { Barres } from '../components/Graphiques.jsx'
import { COULEURS, TuileChiffre } from '../components/Courbes.jsx'
import CarteTogo from '../components/CarteTogo.jsx'
import ActesSuivi from '../components/ActesSuivi.jsx'
import RupturesParcours from '../components/RupturesParcours.jsx'
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
  const [toutes, setZones] = useState([])
  const [erreur, setErreur] = useState('')
  const [choisie, setChoisie] = useState(null)
  const [chargement, setChargement] = useState(true)

  const [geo, setGeo] = useState([])
  useEffect(() => {
    setChargement(true)
    Promise.all([
      api.get('/api/decideur/zones').then(setZones).catch((e) => setErreur(e.message)),
      api.get('/api/decideur/geographie').then(setGeo).catch(() => {})
    ]).finally(() => setChargement(false))
  }, [])
  const pilotes = useMemo(() => new Set(geo.filter((g) => g.pilote).map((g) => g.code)), [geo])
  const horsPilote = useMemo(() => geo.filter((g) => !g.pilote), [geo])

  const zones = useMemo(() => (pilotes.size ? toutes.filter((z) => pilotes.has(z.code)) : toutes), [toutes, pilotes])

  // Zoom automatique sur la région de l'utilisateur via géolocalisation
  useEffect(() => {
    if (!geo.length || !zones.length) return
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          // Trouver la zone la plus proche
          const proche = zones.reduce((best, z) => {
            const dist = Math.sqrt(Math.pow(latitude - z.latitude, 2) + Math.pow(longitude - z.longitude, 2))
            return dist < best.dist ? { zone: z, dist } : best
          }, { zone: null, dist: Infinity })
          if (proche.zone && proche.dist < 0.5) { // 0.5 degré ~ 55 km
            setChoisi(proche.zone.code)
          }
        },
        () => {}, // Erreur de géolocalisation : on ignore
        { timeout: 5000 }
      )
    }
  }, [geo, zones])
  const triees = useMemo(
    () => [...zones].sort((a, b) => (b.indiceOubli ?? -1) - (a.indiceOubli ?? -1)),
    [zones],
  )

  const detaillees = zones.filter((z) => !z.masquee)
  const oubliees = detaillees.filter((z) => (z.indiceOubli ?? 0) >= 60)
  const totalFamilles = zones.reduce((n, z) => n + z.familles, 0)
  const prioritaire = triees.find((z) => !z.masquee && z.indiceOubli !== null)
  const detail = zones.find((z) => z.code === choisie) ?? prioritaire
  const suiviMoyen = (() => { const l = detaillees.filter((z) => z.tauxSuiviPct != null); const f = l.reduce((n, z) => n + z.familles, 0); return f ? Math.round(l.reduce((n, z) => n + z.tauxSuiviPct * z.familles, 0) / f) : null })()

  const action = (z) => z.masquee ? 'Trop peu de familles : suivi par l\'agent' : (z.indiceOubli ?? 0) >= 60 ? 'Envoyer une équipe mobile cette semaine' : (z.indiceOubli ?? 0) >= 35 ? 'Renforcer les rappels et les visites' : 'Maintenir le suivi'

  // Instantanés hebdomadaires des indices, gardés sur l'appareil : la tendance se voit sans serveur.
  const [tendances, setTendances] = useState({})
  useEffect(() => {
    if (!zones.length) return
    const d = new Date()
    const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
    t.setUTCDate(t.getUTCDate() - ((t.getUTCDay() + 6) % 7) + 3)
    const p = new Date(Date.UTC(t.getUTCFullYear(), 0, 4))
    const semaine = `${t.getUTCFullYear()}-S${String(1 + Math.round((t - p) / 6048e5)).padStart(2, '0')}`
    const courant = Object.fromEntries(zones.filter((z) => z.indiceOubli != null).map((z) => [z.code, z.indiceOubli]))
    try {
      const snaps = JSON.parse(localStorage.getItem('fildor.carte.snapshots') || '[]')
      const precedent = snaps.filter((s) => s.semaine !== semaine).pop()
      if (precedent) {
        const t2 = {}
        zones.forEach((z) => { if (precedent.indices[z.code] != null && z.indiceOubli != null) t2[z.code] = z.indiceOubli - precedent.indices[z.code] })
        setTendances(t2)
      }
      localStorage.setItem('fildor.carte.snapshots', JSON.stringify([...snaps.filter((s) => s.semaine !== semaine), { semaine, indices: courant }].slice(-4)))
    } catch { /* stockage indisponible */ }
  }, [zones])
  const tendanceTexte = (code) => {
    const d = tendances[code]
    if (d === undefined) return null
    if (d === 0) return 'Stable'
    return `${d > 0 ? '↑' : '↓'} ${Math.abs(d)} pt(s) vs la semaine dernière${d > 0 ? ' (se dégrade)' : ' (s’améliore)'}`
  }

  const attente = toutes.length === 0 && !erreur
  const gauche = (
    <>
        <CarteTogo zones={zones} horsPilote={horsPilote} choisie={choisie} onChoisir={setChoisie} />

    </>
  )
  const detailJsx = (
    <>
          {detail ? (
            <div className="carte">
              <p className="petit zone-etiquette">{detail.code === prioritaire?.code && !choisie ? 'À visiter en premier' : `Région ${detail.region}`}</p>
              <h2>{detail.nom}</h2>
              {!detail.masquee && <p className="action-zone">{action(detail)}</p>}
              {detail.masquee ? (
                <p>Moins de 5 familles : zone non détaillée pour protéger l'anonymat.</p>
              ) : (
                <dl className="stats">
                  <dt>Indice d'oubli</dt><dd>{detail.indiceOubli} / 100</dd>
                  {tendanceTexte(detail.code) && <><dt>Tendance</dt><dd>{tendanceTexte(detail.code)}</dd></>}
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
            <div className="carte"><p>Aucune zone dans votre région pour le moment.</p></div>
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
        <div className="grille-tuiles quatre">
          <TuileChiffre libelle="Préfectures suivies" valeur={`${zones.length} sur ${geo.length || 39}`} aide="Le pilote commence par la Maritime" couleur={COULEURS.cyan} />
          <TuileChiffre libelle="Familles dans le fil" valeur={totalFamilles} aide="Anonymes : jamais un nom ici" couleur={COULEURS.bleu} />
          <TuileChiffre libelle="Rendez-vous réalisés" valeur={suiviMoyen === null ? '—' : `${suiviMoyen} %`} aide="Moyenne pondérée de la région" couleur={COULEURS.violet} />
          <TuileChiffre libelle="Zones oubliées" valeur={oubliees.length} aide={prioritaire ? `À visiter d'abord : ${prioritaire.nom.replace(/ \(.*\)/, '')}` : 'Indice de 60 ou plus'} couleur={COULEURS.orange} />
        </div>
      )}

        <div className="deux-colonnes">
          {gauche}
          <section>{detailJsx}</section>
        </div>

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
        <RupturesParcours />
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

  if (vue === 'ruptures') {
    return (
      <main className="page">
        <Bandeau surtitre="Responsable régional" titre="Où l'enfant se perd">
          Les passages entre deux services où des enfants sont perdus de vue, et les progrès par trimestre.
        </Bandeau>
        <RupturesParcours />
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
