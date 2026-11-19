import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { lireCompte } from '../lib/famille.js'
import Bandeau from '../components/Bandeau.jsx'
import { api } from '../lib/api.js'
import { lienCarte, lienItineraire } from '../lib/geo.js'
import Picto from '../components/Picto.jsx'

const JOURS_NOM = { LUN: 'lundi', MAR: 'mardi', MER: 'mercredi', JEU: 'jeudi', VEN: 'vendredi', SAM: 'samedi', DIM: 'dimanche' }
const FORMULES = [['JOURNEE', 'Journée'], ['MATIN', 'Matin'], ['APRES_MIDI', 'Après-midi']]
const STATUT = { DEMANDEE: ['En attente de la crèche', '#B87B00'], CONFIRMEE: ['Place confirmée', '#00833E'], REFUSEE: ['Refusée', '#C0392B'], ANNULEE: ['Annulée', '#6b7785'] }
const CODE_JOUR = ['DIM', 'LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM']
const jourLisible = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
const ajouterJours = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) }

function heuresFormule(formule, c) {
  if (formule === 'MATIN') return [c.ouverture, '12:00']
  if (formule === 'APRES_MIDI') return ['13:00', c.fermeture]
  return [c.ouverture, c.fermeture]
}

export default function FamilleCreche() {
  const compte = lireCompte()
  if (!compte) return <Navigate to="/famille" replace />
  return <Reservation compte={compte} />
}

function Reservation({ compte }) {
  const acces = { telephone: compte.telephone, codeFamille: compte.codeFamille }
  const [creches, setCreches] = useState([])
  const [mes, setMes] = useState({ enfants: [], reservations: [] })
  const [choix, setChoix] = useState(null)
  const [form, setForm] = useState({ enfant: '', date: '', formule: 'JOURNEE', arrivee: '', depart: '', note: '' })
  const [message, setMessage] = useState(null)
  const [attente, setAttente] = useState(false)

  const charger = useCallback(async () => {
    try { setMes(await api.post('/api/public/famille/creches', acces)) } catch (e) { setMes({ enfants: [], reservations: [] }); setMessage({ ok: false, texte: e.message }) }
  }, [compte.telephone, compte.codeFamille])
  useEffect(() => { api.post('/api/public/famille/creches/proches', acces).then((l) => setCreches(l)).catch((e) => setMessage({ ok: false, texte: e.message })) }, [])
  useEffect(() => { charger() }, [charger])
  useEffect(() => { if (mes.enfants.length && !form.enfant) setForm((f) => ({ ...f, enfant: mes.enfants[0].codeEnfant })) }, [mes.enfants, form.enfant])

  const c = useMemo(() => creches.find((x) => x.creche.code === choix)?.creche, [creches, choix])
  const choisirFormule = (formule) => { const [a, d] = c ? heuresFormule(formule, c) : ['', '']; setForm((f) => ({ ...f, formule, arrivee: a, depart: d })) }
  const ouvrir = (x) => { setChoix(x.code); const [a, d] = heuresFormule('JOURNEE', x); setForm((f) => ({ ...f, formule: 'JOURNEE', arrivee: a, depart: d })); setMessage(null) }
  const jourOk = form.date && c ? c.jours.split(',').includes(CODE_JOUR[new Date(form.date + 'T12:00:00').getDay()]) : true

  const envoyer = async (e) => {
    e.preventDefault(); setAttente(true); setMessage(null)
    try {
      const r = await api.post(`/api/public/creches/${c.code}/reserver`, { ...acces, codeEnfant: form.enfant, dateJour: form.date, formule: form.formule, heureArrivee: form.arrivee, heureDepart: form.depart, note: form.note })
      setMessage({ ok: true, texte: r.message }); setForm((f) => ({ ...f, date: '', note: '' })); charger()
    } catch (err) { setMessage({ ok: false, texte: err.message }) } finally { setAttente(false) }
  }
  const annuler = async (id) => { try { await api.post(`/api/public/creches/reservations/${id}/annuler`, acces); charger() } catch (err) { setMessage({ ok: false, texte: err.message }) } }

  return (
    <>
      <Bandeau surtitre="Pour les familles" titre="Crèches : conditions et réservations">
        Voyez ce qu'il faut pour inscrire votre enfant, ce qu'il faut apporter, puis choisissez les jours, les demi-journées et les heures d'arrivée et de départ.
      </Bandeau>
      <main className="page espace-famille">
        <p><Link to="/famille" className="bouton secondaire petit-bouton">Retour à mon espace</Link></p>
        <p className="petit">Famille {compte.codeFamille}. {mes.enfants.length ? `${mes.enfants.length} enfant(s) pour la crèche : ${mes.enfants.map((x) => `${x.codeEnfant} (${x.ageMois} mois)`).join(', ')}.` : 'Aucun enfant de la famille n\u2019est encore suivi : l\u2019agent de santé l\u2019inscrira.'}</p>
        <h2 className="titre-section">Les crèches les plus proches</h2>
        <p className="petit">« M'y rendre » ouvre l'application de cartes de votre téléphone avec la route réelle jusqu'à la crèche. Votre position a servi une fois, sur cet appareil : Fil d'Or ne l'enregistre pas.</p>
        <div className="creches-liste">
          {creches.map(({ creche: x, proximite }, i) => (
            <article key={x.code} className={`creche-carte${choix === x.code ? ' choisie' : ''}`}>
              <p className="proximite">{i === 0 ? 'La plus proche · ' : ''}{proximite}</p>
              <h3>{x.nom}</h3>
              <p className="petit">{x.ouverture} à {x.fermeture} · {x.jours.split(',').map((j) => JOURS_NOM[j]?.slice(0, 3)).join(', ')}</p>
              <dl>
                <dt>Conditions pour inscrire l'enfant</dt><dd>{x.conditions || 'À demander à la crèche.'}</dd>
                <dt>Ce qu'il faut apporter</dt><dd>{x.aApporter || 'À demander à la crèche.'}</dd>
                <dt>Tarif</dt><dd>{x.tarif || 'À demander à la crèche.'}</dd>
                <dt>Âges accueillis</dt><dd>{x.ageMinMois} à {x.ageMaxMois} mois · {x.capacite} places par jour</dd>
              </dl>
              {x.latitude != null && x.longitude != null && (
                <p className="deux-boutons">
                  <a className="bouton secondaire petit-bouton" href={lienItineraire(x.latitude, x.longitude)} target="_blank" rel="noreferrer"><Picto nom="route" /> M'y rendre</a>
                  <a className="bouton secondaire petit-bouton" href={lienCarte(x.latitude, x.longitude)} target="_blank" rel="noreferrer"><Picto nom="carte" /> Voir la carte</a>
                </p>
              )}
              <button className="bouton" onClick={() => ouvrir(x)}>{choix === x.code ? 'Crèche choisie' : 'Réserver des jours ici'}</button>
            </article>
          ))}
          {creches.length === 0 && <p className="petit">Aucune crèche pour le moment.</p>}
        </div>

        {c && (
          <form className="carte reservation-form" onSubmit={envoyer} aria-labelledby="t-resa">
            <h2 id="t-resa">Réserver à {c.nom}</h2>
            <label className="champ">Enfant
              <select value={form.enfant} onChange={(e) => setForm({ ...form, enfant: e.target.value })} required>
                {mes.enfants.map((x) => <option key={x.codeEnfant} value={x.codeEnfant}>{x.codeEnfant} · {x.ageMois} mois</option>)}
              </select>
            </label>
            <label className="champ">Jour
              <input type="date" required min={ajouterJours(0)} max={ajouterJours(60)} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </label>
            {form.date && <p className={jourOk ? 'petit' : 'alerte-jour'}>{jourOk ? jourLisible(form.date) : `Fermé le ${jourLisible(form.date)}. Jours d'ouverture : ${c.jours.split(',').map((j) => JOURS_NOM[j]).join(', ')}.`}</p>}
            <fieldset className="formules"><legend>Formule</legend>
              {FORMULES.map(([k, t]) => <label key={k} className={form.formule === k ? 'actif' : ''}><input type="radio" name="formule" checked={form.formule === k} onChange={() => choisirFormule(k)} />{t}</label>)}
            </fieldset>
            <div className="deux-champs">
              <label className="champ">Je dépose à<input type="time" required min={c.ouverture} max={c.fermeture} value={form.arrivee} onChange={(e) => setForm({ ...form, arrivee: e.target.value })} /></label>
              <label className="champ">Je reprends à<input type="time" required min={c.ouverture} max={c.fermeture} value={form.depart} onChange={(e) => setForm({ ...form, depart: e.target.value })} /></label>
            </div>
            <label className="champ">Un mot pour la crèche (facultatif)<input maxLength={200} value={form.note} placeholder="Allergie, personne qui vient chercher l'enfant…" onChange={(e) => setForm({ ...form, note: e.target.value })} /></label>
            <p className="petit">Pour répéter une réservation chaque semaine, envoyez une demande par jour choisi.</p>
            <button className="bouton" disabled={attente || !jourOk || !form.enfant}>Envoyer la demande</button>
          </form>
        )}
        {message && <p className={message.ok ? 'ok-notif' : 'alerte-jour'} role="status">{message.texte}</p>}

        <h2 className="titre-section">Mes réservations</h2>
        {mes.reservations.length === 0 && <p className="petit">Aucune réservation à venir.</p>}
        <ul className="fam-boite">
          {mes.reservations.map((r) => (
            <li key={r.id} style={{ '--c': STATUT[r.statut]?.[1] }}>
              <b>{jourLisible(r.dateJour)} · {r.heureArrivee} à {r.heureDepart}</b>
              <p>{r.nomCreche} · enfant {r.codeEnfant} · {FORMULES.find((f) => f[0] === r.formule)?.[1]}</p>
              <small>{STATUT[r.statut]?.[0]}{r.note ? ` · ${r.note}` : ''}</small>
              {['DEMANDEE', 'CONFIRMEE'].includes(r.statut) && <button className="bouton secondaire petit-bouton" onClick={() => annuler(r.id)}>Annuler</button>}
            </li>
          ))}
        </ul>
      </main>
    </>
  )
}
