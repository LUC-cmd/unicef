import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import { LIBELLE_LANGUE, LIBELLE_REPONSE, LIBELLE_TYPE_STRUCTURE, formaterDate } from '../lib/format.js'
import { lienCarte, positionUneFois } from '../lib/geo.js'
import { COULEURS, TuileChiffre } from '../components/Courbes.jsx'
import Bandeau from '../components/Bandeau.jsx'
import { Squelette } from '../components/Chargement.jsx'
import { Anneau } from '../components/Graphiques.jsx'
import { Link } from 'react-router-dom'

const REPONSES = [['RDV_PROPOSE', 'Proposer un rendez-vous'], ['PAS_DE_PLACE', 'Pas de place'], ['AUTRE_STRUCTURE', 'Conseiller une autre structure']]

/** Console d'une structure : ses informations publiques, et les demandes des familles. */
export default function Structure({ vue = 'demandes' }) {
  const [maStructure, setMaStructure] = useState(null)
  const [demandes, setDemandes] = useState([])
  const [statut, setStatut] = useState('NOUVELLE')
  const [info, setInfo] = useState(null)

  const chargerDemandes = useCallback(async () => {
    try { setDemandes(await api.get(`/api/structure/demandes?statut=${statut}`)) }
    catch (e) { setInfo({ ok: false, texte: e.message }) }
  }, [statut])

  useEffect(() => { api.get('/api/structure/moi').then(setMaStructure).catch((e) => setInfo({ ok: false, texte: e.message })) }, [])
  useEffect(() => { chargerDemandes() }, [chargerDemandes])
  const [bilan, setBilan] = useState(null)
  useEffect(() => {
    if (vue !== 'tableau') return
    Promise.all([api.get('/api/structure/demandes?statut=NOUVELLE'), api.get('/api/structure/demandes?statut=TRAITEE')])
      .then(([nouvelles, traitees]) => setBilan({ nouvelles, traitees })).catch(() => setBilan({ nouvelles: [], traitees: [] }))
  }, [vue])

  async function enregistrer(e) {
    e.preventDefault()
    try {
      setMaStructure(await api.put('/api/structure/moi', {
        telephone: maStructure.telephone ?? '', horaires: maStructure.horaires ?? '', services: maStructure.services ?? '',
        besoinsSpecifiques: maStructure.besoinsSpecifiques, actif: maStructure.actif,
        latitude: maStructure.latitude == null || maStructure.latitude === '' ? null : Number(maStructure.latitude),
        longitude: maStructure.longitude == null || maStructure.longitude === '' ? null : Number(maStructure.longitude),
      }))
      setInfo({ ok: true, texte: 'Informations enregistrées : elles apparaissent dans l’annuaire public.' })
    } catch (err) { setInfo({ ok: false, texte: err.message }) }
  }

  /** La structure se place là où elle se trouve réellement : le point que les familles suivront. */
  async function prendreMaPosition() {
    setInfo({ ok: true, texte: 'Localisation en cours…' })
    const p = await positionUneFois()
    if (!p) { setInfo({ ok: false, texte: 'Localisation impossible ou refusée : entrez les coordonnées à la main.' }); return }
    maj({ latitude: Number(p.lat.toFixed(6)), longitude: Number(p.lon.toFixed(6)) })
    setInfo({ ok: true, texte: 'Position prise : vérifiez-la puis enregistrez.' })
  }

  async function repondre(id, reponse) {
    try {
      const r = await api.post(`/api/structure/demandes/${id}/repondre`, { reponse })
      setInfo({ ok: true, texte: r.message }); await chargerDemandes()
    } catch (err) { setInfo({ ok: false, texte: err.message }) }
  }

  const maj = (champs) => setMaStructure((s) => ({ ...s, ...champs }))

  const titreStructure = maStructure ? maStructure.nom : 'Ma structure'
  const sousTitre = maStructure ? `${LIBELLE_TYPE_STRUCTURE[maStructure.type]} · ${maStructure.zone}` : null
  const retour = info && <p className={info.ok ? 'succes' : 'erreur'} role="status">{info.texte}</p>

  if (vue === 'tableau') {
    if (!bilan) return <main className="page"><Bandeau surtitre="Structure d'accueil" titre="Tableau de bord">{titreStructure}</Bandeau><Squelette /></main>
    const tousMotifs = [...bilan.nouvelles, ...bilan.traitees]
    const rappels = tousMotifs.filter((d) => d.motif === 'RAPPEL').length
    return (
      <main className="page">
        <Bandeau surtitre="Structure d'accueil" titre="Tableau de bord">{titreStructure}{sousTitre ? ` · ${sousTitre}` : ''}</Bandeau>
        {retour}
        <div className="grille-tuiles">
          <TuileChiffre libelle="Demandes à traiter" valeur={bilan.nouvelles.length} aide={bilan.nouvelles.length ? 'Des familles attendent une réponse' : 'Aucune demande en attente'} couleur={COULEURS.orange} />
          <TuileChiffre libelle="Demandes traitées" valeur={bilan.traitees.length} aide="Réponses déjà envoyées" couleur={COULEURS.cyan} />
          <TuileChiffre libelle="Rappels demandés" valeur={rappels} aide="Familles qui veulent être rappelées" couleur={COULEURS.bleu} />
          <TuileChiffre libelle="Orientations" valeur={tousMotifs.length - rappels} aide="Familles qui cherchent une structure" couleur={COULEURS.violet} />
          <TuileChiffre libelle="Annuaire" valeur={maStructure?.actif ? 'Visible' : 'Masquée'} aide="Statut de votre fiche publique" couleur={COULEURS.cyan} />
          <TuileChiffre libelle="Horaires affichés" valeur={maStructure?.horaires || '—'} aide="Modifiables dans « Mes informations »" couleur={COULEURS.bleu} />
        </div>
        <div className="raccourcis">
          <Link className="bouton" to="/structure/demandes">Répondre aux familles</Link>
          <Link className="bouton secondaire" to="/structure/fiche">Mettre à jour mes informations</Link>
        </div>
        <div className="grille-deux">
          <section className="carte">
            <Anneau titre="Demandes reçues" centre={tousMotifs.length}
                    parts={[{ nom: 'À traiter', valeur: bilan.nouvelles.length, couleur: '#ffc20e' }, { nom: 'Traitées', valeur: bilan.traitees.length, couleur: '#00833d' }]} />
          </section>
          <section className="carte">
            <Anneau titre="Pourquoi les familles vous écrivent" centre={tousMotifs.length}
                    parts={[{ nom: 'Rappel', valeur: rappels, couleur: '#1cabe2' }, { nom: 'Orientation', valeur: tousMotifs.length - rappels, couleur: '#374ea2' }]} />
          </section>
        </div>
        <section className="carte">
          <h2>Dernières demandes à traiter</h2>
          <ul className="liste-demandes">
            {bilan.nouvelles.slice(0, 4).map((d) => (
              <li key={d.id}>
                <div className="demande-qui">
                  <b>{d.codeFamille}</b>
                  <span className={`badge ${d.motif === 'RAPPEL' ? 'role-agent' : 'role-structure'}`}>{d.motif === 'RAPPEL' ? 'Veut être rappelée' : 'Cherche une structure'}</span>
                  <span className="petit">{d.zone}{LIBELLE_LANGUE[d.langue] ? ` · ${LIBELLE_LANGUE[d.langue]}` : ''}</span>
                </div>
                <div className="actions">
                  {REPONSES.map(([v, nom]) => <button key={v} className="bouton secondaire petit-bouton" onClick={() => repondre(d.id, v).then(() => api.get('/api/structure/demandes?statut=NOUVELLE').then((n) => setBilan((b) => ({ nouvelles: n, traitees: [...b.traitees, ...b.nouvelles.filter((x) => x.id === d.id)] }))))}>{nom}</button>)}
                </div>
              </li>
            ))}
            {bilan.nouvelles.length === 0 && <li className="vide">Aucune demande en attente. Bravo : toutes les familles ont une réponse.</li>}
          </ul>
        </section>
      </main>
    )
  }

  if (vue === 'fiche') {
    return (
      <main className="page">
        <Bandeau surtitre="Structure d'accueil" titre="Mes informations publiques">{titreStructure}</Bandeau>
        {retour}
        <section>
          {maStructure && (
            <form className="carte" onSubmit={enregistrer}>
              <h2>Informations publiques</h2>
              <label>Téléphone de la structure <input value={maStructure.telephone ?? ''} maxLength={30} onChange={(e) => maj({ telephone: e.target.value })} /></label>
              <label>Horaires <input value={maStructure.horaires ?? ''} maxLength={120} onChange={(e) => maj({ horaires: e.target.value })} /></label>
              <label>Services <textarea rows="3" maxLength={300} value={maStructure.services ?? ''} onChange={(e) => maj({ services: e.target.value })} /></label>
              <fieldset className="localisation-fiche">
                <legend>Position sur la carte (là où les familles doivent venir)</legend>
                <div className="ligne-age">
                  <label>Latitude <input type="number" step="0.000001" min="5.9" max="11.4" value={maStructure.latitude ?? ''} onChange={(e) => maj({ latitude: e.target.value })} /></label>
                  <label>Longitude <input type="number" step="0.000001" min="0" max="2" value={maStructure.longitude ?? ''} onChange={(e) => maj({ longitude: e.target.value })} /></label>
                  <button type="button" className="bouton secondaire" onClick={prendreMaPosition}>📍 Prendre ma position ici</button>
                </div>
                {maStructure.latitude != null && maStructure.longitude != null && (
                  <p className="petit"><a href={lienCarte(Number(maStructure.latitude), Number(maStructure.longitude))} target="_blank" rel="noreferrer">Vérifier ce point sur la carte</a></p>
                )}
                <p className="petit">Vraie position = les familles arrivent sans se perdre. En démonstration, un point proche du chef-lieu est déjà rempli.</p>
              </fieldset>
              <label className="case"><input type="checkbox" checked={maStructure.besoinsSpecifiques} onChange={(e) => maj({ besoinsSpecifiques: e.target.checked })} /> Accueille les enfants à besoins spécifiques</label>
              <label className="case"><input type="checkbox" checked={maStructure.actif} onChange={(e) => maj({ actif: e.target.checked })} /> Visible dans l'annuaire</label>
              <button className="bouton">Enregistrer</button>
              <p className="petit">Dernière mise à jour : {formaterDate(maStructure.miseAJourLe)}</p>
            </form>
          )}
        </section>
      </main>
    )
  }

  return (
    <main className="page">
      <Bandeau surtitre="Structure d'accueil" titre="Demandes des familles">{titreStructure}{sousTitre ? ` · ${sousTitre}` : ''}</Bandeau>
      {retour}
        <section>
          <h2>Demandes des familles</h2>
          <p className="petit">
            Vous voyez un code famille, la zone et la langue : jamais de nom ni de numéro. Votre réponse part par SMS
            à la famille, avec votre numéro et vos horaires.
          </p>
          <div className="onglets large" role="tablist">
            {[['NOUVELLE', 'À traiter'], ['TRAITEE', 'Traitées']].map(([v, nom]) => (
              <button key={v} role="tab" aria-selected={statut === v} className={statut === v ? 'actif' : ''} onClick={() => setStatut(v)}>{nom}</button>
            ))}
          </div>
          <ul className="liste-visites">
            {demandes.map((d) => (
              <li key={d.id} className="carte">
                <p><b>{d.codeFamille}</b> <span className="petit">· {d.zone} · {LIBELLE_LANGUE[d.langue]}</span></p>
                <p className="petit">{d.motif === 'RAPPEL' ? 'Demande à être rappelée' : 'Demande une orientation'} · {d.origine === 'AGENT' ? 'via l’agent de santé' : 'par la famille'} · {formaterDate(d.creeLe)}</p>
                {d.statut === 'NOUVELLE' ? (
                  <div className="actions">
                    {REPONSES.map(([v, nom]) => <button key={v} className="bouton secondaire petit-bouton" onClick={() => repondre(d.id, v)}>{nom}</button>)}
                  </div>
                ) : <p className="succes">Réponse : {LIBELLE_REPONSE[d.reponse]}</p>}
              </li>
            ))}
            {demandes.length === 0 && <li className="petit">Aucune demande.</li>}
          </ul>
        </section>

    </main>
  )
}
