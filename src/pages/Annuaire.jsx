import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import { LIBELLE_TYPE_STRUCTURE, ZONES, formaterDate } from '../lib/format.js'
import Bandeau from '../components/Bandeau.jsx'

/** Annuaire public des structures : informations sur les structures, jamais sur les familles. */
export default function Annuaire() {
  const [zone, setZone] = useState(() => new URLSearchParams(window.location.search).get('zone') || '')
  const [type, setType] = useState('')
  const [besoins, setBesoins] = useState(false)
  const [liste, setListe] = useState([])
  const [erreur, setErreur] = useState('')

  useEffect(() => {
    const q = new URLSearchParams()
    if (zone) q.set('zone', zone)
    if (type) q.set('type', type)
    if (besoins) q.set('besoinsSpecifiques', 'true')
    api.get(`/api/public/structures?${q}`).then((l) => { setListe(l); setErreur('') }).catch((e) => setErreur(e.message))
  }, [zone, type, besoins])

  return (
    <>
    <Bandeau surtitre="Annuaire public" titre="Annuaire des structures">
      Santé, crèches, centres sociaux et état civil, par zone. Données de démonstration.
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
      </div>
      {erreur && <p className="erreur" role="alert">{erreur}</p>}

      <div className="grille">
        {liste.map((s) => (
          <article className="carte" key={s.code}>
            <p className="petit">{LIBELLE_TYPE_STRUCTURE[s.type]} · {s.zone}</p>
            <h2>{s.nom}</h2>
            <p>{s.services}</p>
            <p className="petit">🕘 {s.horaires || 'Horaires non renseignés'}<br />☎ {s.telephone || 'Numéro non renseigné'}</p>
            {s.besoinsSpecifiques && <p><span className="pastille normal">Accueille les besoins spécifiques</span></p>}
            <p className="petit">Mis à jour le {formaterDate(s.miseAJourLe)}</p>
          </article>
        ))}
        {liste.length === 0 && !erreur && <p className="petit">Aucune structure pour ces critères.</p>}
      </div>
    </main>
    </>
  )
}
