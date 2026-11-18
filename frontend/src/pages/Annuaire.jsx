import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import { LIBELLE_TYPE_STRUCTURE, ZONES, formaterDate } from '../lib/format.js'
import Bandeau from '../components/Bandeau.jsx'
import { distanceKm, formaterKm, lienCarte, lienItineraire, positionUneFois } from '../lib/geo.js'

/** Annuaire public des structures : informations sur les structures, jamais sur les familles.
 *  Avec la localisation du téléphone, la famille voit les structures les plus proches et peut
 *  suivre un itinéraire réel jusqu'à la crèche ou au centre de santé. La position sert une fois,
 *  sur l'appareil : rien n'est envoyé ni enregistré. */
export default function Annuaire() {
  const [zone, setZone] = useState(() => new URLSearchParams(window.location.search).get('zone') || '')
  const [type, setType] = useState('')
  const [besoins, setBesoins] = useState(false)
  const [liste, setListe] = useState([])
  const [erreur, setErreur] = useState('')
  const [maPosition, setMaPosition] = useState(null)
  const [demandePosition, setDemandePosition] = useState(false)

  useEffect(() => {
    const q = new URLSearchParams()
    if (zone) q.set('zone', zone)
    if (type) q.set('type', type)
    if (besoins) q.set('besoinsSpecifiques', 'true')
    api.get(`/api/public/structures?${q}`).then((l) => { setListe(l); setErreur('') }).catch((e) => setErreur(e.message))
  }, [zone, type, besoins])

  const meLocaliser = async () => {
    setDemandePosition(true)
    const p = await positionUneFois()
    setDemandePosition(false)
    setMaPosition(p)
  }

  const avecDistance = liste.map((s) => {
    const km = maPosition ? distanceKm(maPosition.lat, maPosition.lon, s.latitude, s.longitude) : null
    return { ...s, km }
  }).sort((a, b) => (a.km ?? 1e9) - (b.km ?? 1e9))

  return (
    <>
    <Bandeau surtitre="Annuaire public" titre="Annuaire des structures">
      Santé, crèches, centres sociaux et état civil, par zone. Activez la localisation pour voir les plus
      proches et suivre la route jusqu'à elles. Données de démonstration.
    </Bandeau>
    <main className="page">

      <div className="filtres">
        <label>Zone
          <select value={zone} onChange={(e) => setZone(e.target.value)}>
            <option value="">Toutes</option>
            {ZONES.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
          </select>
        </label>
        <label>Type
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">Tous</option>
            {Object.entries(LIBELLE_TYPE_STRUCTURE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label className="case"><input type="checkbox" checked={besoins} onChange={(e) => setBesoins(e.target.checked)} /> Accueille les enfants à besoins spécifiques</label>
        <button type="button" className={`bouton secondaire petit-bouton${maPosition ? ' actif' : ''}`} onClick={meLocaliser} disabled={demandePosition}>
          {demandePosition ? '📍 Localisation…' : maPosition ? '📍 Position activée' : '📍 Autour de moi'}
        </button>
      </div>
      {maPosition && <p className="petit">Liste triée de la plus proche à la plus éloignée. La position a servi une fois, sur cet appareil : elle n'a été envoyée à aucun serveur.</p>}
      {erreur && <p className="erreur" role="alert">{erreur}</p>}

      <div className="grille">
        {avecDistance.map((s) => (
          <article className="carte" key={s.code}>
            <p className="petit">{LIBELLE_TYPE_STRUCTURE[s.type]} · {s.zone}{s.km != null && <> · <b>{formaterKm(s.km)}</b></>}</p>
            <h2>{s.nom}</h2>
            <p>{s.services}</p>
            <p className="petit">🕘 {s.horaires || 'Horaires non renseignés'}<br />☎ {s.telephone || 'Numéro non renseigné'}</p>
            {s.besoinsSpecifiques && <p><span className="pastille normal">Accueille les besoins spécifiques</span></p>}
            {s.latitude != null && s.longitude != null && (
              <p className="deux-boutons">
                <a className="bouton petit-bouton" href={lienItineraire(s.latitude, s.longitude)} target="_blank" rel="noreferrer">🧭 Suivre la route</a>
                <a className="bouton secondaire petit-bouton" href={lienCarte(s.latitude, s.longitude)} target="_blank" rel="noreferrer">🗺️ Voir sur la carte</a>
              </p>
            )}
            <p className="petit">Mis à jour le {formaterDate(s.miseAJourLe)}</p>
          </article>
        ))}
        {avecDistance.length === 0 && !erreur && <p className="petit">Aucune structure pour ces critères.</p>}
      </div>
    </main>
    </>
  )
}
