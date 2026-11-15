import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import { LIBELLE_LANGUE, LIBELLE_REPONSE, LIBELLE_TYPE_STRUCTURE, formaterDate } from '../lib/format.js'
import Bandeau from '../components/Bandeau.jsx'

const REPONSES = [['RDV_PROPOSE', 'Proposer un rendez-vous'], ['PAS_DE_PLACE', 'Pas de place'], ['AUTRE_STRUCTURE', 'Conseiller une autre structure']]

/** Console d'une structure : ses informations publiques, et les demandes des familles. */
export default function Structure() {
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

  async function enregistrer(e) {
    e.preventDefault()
    try {
      setMaStructure(await api.put('/api/structure/moi', {
        telephone: maStructure.telephone ?? '', horaires: maStructure.horaires ?? '', services: maStructure.services ?? '',
        besoinsSpecifiques: maStructure.besoinsSpecifiques, actif: maStructure.actif,
      }))
      setInfo({ ok: true, texte: 'Informations enregistrées : elles apparaissent dans l’annuaire public.' })
    } catch (err) { setInfo({ ok: false, texte: err.message }) }
  }

  async function repondre(id, reponse) {
    try {
      const r = await api.post(`/api/structure/demandes/${id}/repondre`, { reponse })
      setInfo({ ok: true, texte: r.message }); await chargerDemandes()
    } catch (err) { setInfo({ ok: false, texte: err.message }) }
  }

  const maj = (champs) => setMaStructure((s) => ({ ...s, ...champs }))

  return (
    <>
    <Bandeau surtitre="Structure d'accueil" titre={maStructure ? maStructure.nom : 'Ma structure'}>
      {maStructure ? `${LIBELLE_TYPE_STRUCTURE[maStructure.type]} · ${maStructure.zone}` : null}
    </Bandeau>
    <main className="page">
      {info && <p className={info.ok ? 'succes' : 'erreur'} role="status">{info.texte}</p>}

      <div className="deux-colonnes">
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

        <section>
          {maStructure && (
            <form className="carte" onSubmit={enregistrer}>
              <h2>Informations publiques</h2>
              <label>Téléphone de la structure <input value={maStructure.telephone ?? ''} maxLength={30} onChange={(e) => maj({ telephone: e.target.value })} /></label>
              <label>Horaires <input value={maStructure.horaires ?? ''} maxLength={120} onChange={(e) => maj({ horaires: e.target.value })} /></label>
              <label>Services <textarea rows="3" maxLength={300} value={maStructure.services ?? ''} onChange={(e) => maj({ services: e.target.value })} /></label>
              <label className="case"><input type="checkbox" checked={maStructure.besoinsSpecifiques} onChange={(e) => maj({ besoinsSpecifiques: e.target.checked })} /> Accueille les enfants à besoins spécifiques</label>
              <label className="case"><input type="checkbox" checked={maStructure.actif} onChange={(e) => maj({ actif: e.target.checked })} /> Visible dans l'annuaire</label>
              <button className="bouton">Enregistrer</button>
              <p className="petit">Dernière mise à jour : {formaterDate(maStructure.miseAJourLe)}</p>
            </form>
          )}
        </section>
      </div>
    </main>
    </>
  )
}
