import { useCallback, useEffect, useState } from 'react'
import Bandeau from '../components/Bandeau.jsx'
import { api } from '../lib/api.js'

const FORMULE = { JOURNEE: 'Journée', MATIN: 'Matin', APRES_MIDI: 'Après-midi' }
const STATUT = { DEMANDEE: 'À traiter', CONFIRMEE: 'Confirmée', REFUSEE: 'Refusée' }
const TOUS = ['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM']
const auj = () => new Date().toISOString().slice(0, 10)
const plus = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) }
const lisible = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

/** Console de la crèche : réservations des familles (à confirmer ou refuser) et conditions d'accueil. */
export default function CrecheGestion() {
  const [du, setDu] = useState(auj)
  const [liste, setListe] = useState([])
  const [offre, setOffre] = useState(null)
  const [info, setInfo] = useState(null)
  const charger = useCallback(async () => {
    try { setListe(await api.get(`/api/structure/creche/reservations?du=${du}&au=${plus(du, 6)}`)) } catch (e) { setInfo({ ok: false, texte: e.message }) }
  }, [du])
  useEffect(() => { api.get('/api/structure/creche').then(setOffre).catch((e) => setInfo({ ok: false, texte: e.message })) }, [])
  useEffect(() => { charger() }, [charger])

  const decider = async (id, decision) => {
    try { const r = await api.post(`/api/structure/creche/reservations/${id}/decision`, { decision }); setInfo({ ok: true, texte: r.message }); charger() } catch (e) { setInfo({ ok: false, texte: e.message }) }
  }
  const enregistrer = async (e) => {
    e.preventDefault()
    try { setOffre(await api.put('/api/structure/creche', offre)); setInfo({ ok: true, texte: 'Conditions enregistrées : les familles les voient tout de suite.' }) } catch (err) { setInfo({ ok: false, texte: err.message }) }
  }
  const basculerJour = (j) => { const s = new Set(offre.jours.split(',')); s.has(j) ? s.delete(j) : s.add(j); setOffre({ ...offre, jours: TOUS.filter((x) => s.has(x)).join(',') }) }
  const parJour = liste.reduce((m, r) => { (m[r.dateJour] ||= []).push(r); return m }, {})
  const maj = (k, v) => setOffre({ ...offre, [k]: v })

  return (
    <>
      <Bandeau surtitre="Ma crèche" titre="Accueil des enfants">
        Les demandes des familles arrivent ici : jour, demi-journée, heures d'arrivée et de départ. Vous confirmez ou refusez, la famille est prévenue.
      </Bandeau>
      <div className="creche-gestion">
        {info && <p className={info.ok ? 'ok-notif' : 'alerte-jour'} role="status">{info.texte}</p>}
        <section className="carte">
          <div className="creche-semaine">
            <button className="bouton secondaire petit-bouton" onClick={() => setDu(plus(du, -7))}>Semaine précédente</button>
            <b>Du {lisible(du)} au {lisible(plus(du, 6))}</b>
            <button className="bouton secondaire petit-bouton" onClick={() => setDu(plus(du, 7))}>Semaine suivante</button>
          </div>
          {Object.keys(parJour).length === 0 && <p className="petit">Aucune réservation cette semaine.</p>}
          {Object.entries(parJour).map(([jour, rs]) => (
            <div key={jour} className="creche-jour">
              <h3>{lisible(jour)} <small>{rs.filter((r) => r.statut === 'CONFIRMEE').length} confirmé(s) sur {offre?.capacite ?? '…'} places</small></h3>
              <ul className="fam-boite">
                {rs.map((r) => (
                  <li key={r.id} style={{ '--c': r.statut === 'CONFIRMEE' ? '#00833E' : r.statut === 'REFUSEE' ? '#C0392B' : '#B87B00' }}>
                    <b>{r.heureArrivee} à {r.heureDepart} · {FORMULE[r.formule]}</b>
                    <p>Enfant {r.codeEnfant}, {r.ageMois} mois{r.note ? ` · « ${r.note} »` : ''}</p>
                    <small>{STATUT[r.statut]}</small>
                    {r.statut === 'DEMANDEE' && <span className="creche-actions"><button className="bouton petit-bouton" onClick={() => decider(r.id, 'CONFIRMEE')}>Confirmer</button><button className="bouton secondaire petit-bouton" onClick={() => decider(r.id, 'REFUSEE')}>Refuser</button></span>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        {offre && (
          <form className="carte" onSubmit={enregistrer}>
            <h2>Conditions d'accueil</h2>
            <p className="petit">Ce que les familles lisent avant de réserver.</p>
            <label className="champ">Conditions pour inscrire l'enfant<textarea rows={3} maxLength={600} value={offre.conditions} onChange={(e) => maj('conditions', e.target.value)} /></label>
            <label className="champ">Ce qu'il faut apporter<textarea rows={3} maxLength={600} value={offre.aApporter} onChange={(e) => maj('aApporter', e.target.value)} /></label>
            <label className="champ">Tarif<input maxLength={200} value={offre.tarif} onChange={(e) => maj('tarif', e.target.value)} /></label>
            <div className="deux-champs">
              <label className="champ">Ouverture<input type="time" value={offre.ouverture} onChange={(e) => maj('ouverture', e.target.value)} /></label>
              <label className="champ">Fermeture<input type="time" value={offre.fermeture} onChange={(e) => maj('fermeture', e.target.value)} /></label>
              <label className="champ">Âge minimum (mois)<input type="number" min="0" max="72" value={offre.ageMinMois} onChange={(e) => maj('ageMinMois', Number(e.target.value))} /></label>
              <label className="champ">Âge maximum (mois)<input type="number" min="1" max="72" value={offre.ageMaxMois} onChange={(e) => maj('ageMaxMois', Number(e.target.value))} /></label>
              <label className="champ">Places par jour<input type="number" min="1" max="200" value={offre.capacite} onChange={(e) => maj('capacite', Number(e.target.value))} /></label>
            </div>
            <fieldset className="formules"><legend>Jours d'ouverture</legend>
              {TOUS.map((j) => <label key={j} className={offre.jours.split(',').includes(j) ? 'actif' : ''}><input type="checkbox" checked={offre.jours.split(',').includes(j)} onChange={() => basculerJour(j)} />{j.toLowerCase()}</label>)}
            </fieldset>
            <button className="bouton">Enregistrer les conditions</button>
          </form>
        )}
      </div>
    </>
  )
}
