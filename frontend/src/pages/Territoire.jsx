import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api.js'
import CarteImmersive, { REGIONS } from '../components/CarteImmersive.jsx'

const fr = (n) => new Intl.NumberFormat('fr-FR').format(n)

/** Page publique : le territoire du Togo, région par région. Aucune donnée personnelle ; un chiffre de familles n'apparaît qu'à partir de 5. */
export default function Territoire() {
  const [prefectures, setPrefectures] = useState([])
  const [region, setRegion] = useState(null)
  const [pref, setPref] = useState(null)
  const [pret, setPret] = useState(false)
  useEffect(() => { api.get('/api/public/territoire').then(setPrefectures).catch(() => {}) }, [])

  const parRegion = useMemo(() => REGIONS.map((r) => {
    const l = prefectures.filter((p) => p.region === r.nom)
    return { ...r, prefectures: l, familles: l.reduce((n, p) => n + (p.familles ?? 0), 0), pilote: l.some((p) => p.pilote) }
  }), [prefectures])
  const courante = parRegion.find((r) => r.nom === region)
  const choisie = prefectures.find((p) => p.code === pref)

  return (
    <div className="territoire">
      <CarteImmersive prefectures={prefectures} regionChoisie={region} onRegion={(r) => { setRegion(r); setPref(null) }} prefChoisie={pref} onPrefecture={setPref} onPret={() => setPret(true)} />
      <aside className={`territoire-panneau ${pret ? 'visible' : ''}`} aria-label="Régions et préfectures">
        {!courante ? (
          <>
            <h1>Le Togo, région par région</h1>
            <p className="petit">Touchez une région pour y entrer.</p>
            <ul className="liste-regions">
              {parRegion.map((r) => (
                <li key={r.id}>
                  <button type="button" onClick={() => setRegion(r.nom)}>
                    <b>{r.nom}</b>
                    <span>{r.prefectures.length} préfecture{r.prefectures.length > 1 ? 's' : ''}{r.pilote ? ' · pilote' : ''}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <>
            <button type="button" className="lien retour" onClick={() => { setRegion(null); setPref(null) }}>← Tout le Togo</button>
            <h1>{courante.nom}</h1>
            <p className="petit">{courante.prefectures.length} préfecture{courante.prefectures.length > 1 ? 's' : ''}{courante.familles ? ` · ${fr(courante.familles)} familles suivies` : ''}</p>
            {courante.pilote
              ? <p className="badge ok">Région pilote : le suivi est en place</p>
              : <p className="badge">Prochaine étape : le suivi s'y étendra après le pilote</p>}
            <ul className="liste-prefectures">
              {courante.prefectures.map((p) => (
                <li key={p.code}>
                  <button type="button" className={pref === p.code ? 'actif' : ''} onClick={() => setPref(p.code)}>
                    <span className={`pastille ${p.pilote ? 'ok' : ''}`} /> {p.nom.replace(/ \(.*\)/, '')}
                  </button>
                </li>
              ))}
            </ul>
            {choisie && (
              <div className="carte detail-pref">
                <h2>{choisie.nom}</h2>
                <p className="petit">Chef-lieu : {choisie.chefLieu}</p>
                <p>{choisie.pilote ? (choisie.familles ? `${fr(choisie.familles)} familles suivies.` : 'Suivi en démarrage.') : 'Pas encore dans le pilote.'}</p>
                {choisie.pilote && <Link className="bouton" to="/connexion">Entrer dans le suivi</Link>}
              </div>
            )}
          </>
        )}
      </aside>
    </div>
  )
}
