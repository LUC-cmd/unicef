import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api.js'
import CarteImmersive, { REGIONS } from '../components/CarteImmersive.jsx'
import { LIBELLE_TYPE_STRUCTURE } from '../lib/format.js'

const fr = (n) => new Intl.NumberFormat('fr-FR').format(n)

// Chiffres publics du briefing thématique UNICEF Hack4Children (16 novembre 2026).
const DAGBEKEVA = { habitants: 245780, enfants: 35859, formations: 23, prescolaires: 12, actes: '184 actes sur 454 pas encore retirés (40 %)' }

function Tuile({ valeur, libelle }) {
  return <div className="tuile-carte"><b>{valeur}</b><span>{libelle}</span></div>
}

function Structures({ code }) {
  const [liste, setListe] = useState(null)
  useEffect(() => { setListe(null); api.get(`/api/public/structures?zone=${encodeURIComponent(code)}`).then(setListe).catch(() => setListe([])) }, [code])
  if (liste === null) return <p className="petit">Chargement des structures…</p>
  if (liste.length === 0) return <p className="petit">Aucune structure encore inscrite dans l'annuaire.</p>
  const groupes = liste.reduce((g, s) => { (g[s.type] ||= []).push(s); return g }, {})
  return (
    <div className="structures-pref">
      {Object.entries(groupes).map(([type, l]) => (
        <section key={type}>
          <h3>{LIBELLE_TYPE_STRUCTURE?.[type] ?? type} <span className="petit">({l.length})</span></h3>
          <ul>{l.slice(0, 4).map((s) => <li key={s.code}><b>{s.nom}</b>{s.horaires && <span className="petit">{s.horaires}</span>}</li>)}</ul>
        </section>
      ))}
      <Link className="bouton secondaire petit-bouton" to={`/annuaire?zone=${encodeURIComponent(code)}`}>Tout l'annuaire de la zone</Link>
    </div>
  )
}

/** Page publique : le territoire du Togo, région par région. Chaque niveau de zoom est une étape de navigation : le bouton retour redescend d'un niveau. */
export default function Territoire() {
  const [params, setParams] = useSearchParams()
  const region = params.get('region')
  const pref = params.get('pref')
  const [prefectures, setPrefectures] = useState([])
  const [pret, setPret] = useState(false)
  useEffect(() => { api.get('/api/public/territoire').then(setPrefectures).catch(() => {}) }, [])
  const aller = (r, p) => { const n = {}; if (r) n.region = r; if (p) n.pref = p; setParams(n) }

  const parRegion = useMemo(() => REGIONS.map((r) => {
    const l = prefectures.filter((p) => p.region === r.nom)
    return { ...r, prefectures: l, familles: l.reduce((n, p) => n + (p.familles ?? 0), 0), pilote: l.some((p) => p.pilote) }
  }), [prefectures])
  const courante = parRegion.find((r) => r.nom === region)
  const choisie = prefectures.find((p) => p.code === pref)
  const total = parRegion.reduce((n, r) => n + r.familles, 0)
  const nbPilotes = prefectures.filter((p) => p.pilote).length

  return (
    <div className="territoire">
      <CarteImmersive prefectures={prefectures} regionChoisie={region} onRegion={(r) => aller(r, null)} prefChoisie={pref} onPrefecture={(c) => aller(region, c)} onPret={() => setPret(true)} />
      <aside className={`territoire-panneau ${pret ? 'visible' : ''}`} aria-label="Régions et préfectures">
        {!courante ? (
          <>
            <h1>Le Togo, région par région</h1>
            <div className="tuiles-carte">
              <Tuile valeur="5" libelle="régions" />
              <Tuile valeur={prefectures.length || 39} libelle="préfectures" />
              <Tuile valeur={nbPilotes} libelle="dans le pilote" />
              <Tuile valeur={total ? fr(total) : '—'} libelle="familles suivies" />
            </div>
            <p className="petit">Touchez une région pour y entrer.</p>
            <ul className="liste-regions">
              {parRegion.map((r) => (
                <li key={r.id}>
                  <button type="button" onClick={() => aller(r.nom, null)}>
                    <b>{r.nom}</b>
                    <span>{r.prefectures.length} préfecture{r.prefectures.length > 1 ? 's' : ''}{r.pilote ? ' · pilote' : ''}</span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="petit repere-chiffre">Au Togo, 17,7 % des enfants de moins de 5 ans n'ont pas d'acte de naissance. <span>Briefing UNICEF Hack4Children, nov. 2026</span></p>
          </>
        ) : !choisie ? (
          <>
            <button type="button" className="lien retour" onClick={() => aller(null, null)}>← Tout le Togo</button>
            <h1>{courante.nom}</h1>
            <div className="tuiles-carte">
              <Tuile valeur={courante.prefectures.length} libelle={courante.prefectures.length > 1 ? 'préfectures' : 'préfecture'} />
              <Tuile valeur={courante.familles ? fr(courante.familles) : '—'} libelle="familles suivies" />
            </div>
            {courante.pilote
              ? <p className="badge ok">Région pilote : le suivi est en place</p>
              : <p className="badge">Le suivi s'y étendra après le pilote</p>}
            <p className="petit">Touchez une préfecture pour zoomer.</p>
            <ul className="liste-prefectures">
              {courante.prefectures.map((p) => (
                <li key={p.code}>
                  <button type="button" onClick={() => aller(region, p.code)}>
                    <span className={`pastille ${p.pilote ? 'ok' : ''}`} /> <b>{p.nom.replace(/ \(.*\)/, '')}</b>
                    <span className="petit">{p.familles ? `${fr(p.familles)} familles` : p.pilote ? 'en démarrage' : ''}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <>
            <button type="button" className="lien retour" onClick={() => aller(region, null)}>← {courante?.nom ?? 'Région'}</button>
            <h1>{choisie.nom}</h1>
            <p className="petit">Chef-lieu : {choisie.chefLieu}</p>
            <div className="tuiles-carte">
              <Tuile valeur={choisie.familles ? fr(choisie.familles) : '—'} libelle="familles suivies" />
              <Tuile valeur={choisie.pilote ? 'Pilote' : 'Plus tard'} libelle="statut" />
            </div>
            {choisie.code === 'VO' && (
              <div className="carte dagbekeva">
                <h2>Dagbékéva</h2>
                <p className="petit">Le modèle de la préfecture de Vo : connecter les services autour de l'enfant.</p>
                <div className="tuiles-carte">
                  <Tuile valeur={fr(DAGBEKEVA.habitants)} libelle="habitants" />
                  <Tuile valeur={fr(DAGBEKEVA.enfants)} libelle="enfants de 0 à 59 mois" />
                  <Tuile valeur={DAGBEKEVA.formations} libelle="formations sanitaires" />
                  <Tuile valeur={DAGBEKEVA.prescolaires} libelle="préscolaires" />
                </div>
                <p className="petit">{DAGBEKEVA.actes}. Fil d'Or aide les familles à retirer l'acte. Source : briefing UNICEF.</p>
              </div>
            )}
            <h2 className="titre-petit">Services de la zone</h2>
            <Structures code={choisie.code} />
            {choisie.pilote && <Link className="bouton" to="/connexion">Entrer dans le suivi</Link>}
          </>
        )}
      </aside>
    </div>
  )
}
