import { useState } from 'react'
import { api } from '../lib/api.js'
import { aujourdhuiIso } from '../lib/format.js'

/** Outil de démonstration : lance le cycle des rappels « comme si » on était quelques jours plus tard. */
export default function Admin() {
  const [jours, setJours] = useState(3)
  const [resultat, setResultat] = useState(null)
  const [erreur, setErreur] = useState('')

  async function lancer() {
    setErreur('')
    const d = new Date()
    d.setDate(d.getDate() + Number(jours))
    try {
      const r = await api.post(`/api/admin/cycle?date=${aujourdhuiIso(d)}`)
      setResultat({ ...r, date: aujourdhuiIso(d) })
    } catch (e) { setErreur(e.message) }
  }

  return (
    <main className="page etroite">
      <h1>Démonstration : faire avancer le temps</h1>
      <p>
        Lance le cycle des rappels comme si l'on était dans quelques jours : les rendez-vous non faits deviennent
        « manqués », les rappels sans réponse passent « sans réponse », et les familles remontent dans la liste de l'agent.
      </p>
      <div className="carte">
        <label>Avancer de (jours)
          <input type="number" min="0" max="30" value={jours} onChange={(e) => setJours(e.target.value)} />
        </label>
        <button className="bouton" onClick={lancer}>Lancer le cycle</button>
        <p className="petit">Attention : l'effet est permanent dans la base de démonstration (les dates passées ne reviennent pas).</p>
      </div>
      {erreur && <p className="erreur" role="alert">{erreur}</p>}
      {resultat && (
        <div className="carte" role="status">
          <h2>Cycle du {resultat.date}</h2>
          <ul>
            <li>{resultat.rendezVousManques} rendez-vous devenus manqués</li>
            <li>{resultat.rappelsSansReponse} rappels passés sans réponse</li>
            <li>{resultat.rappelsCrees} nouveaux rappels SMS préparés</li>
            <li>{resultat.rappelsAuxProches} rappels généraux envoyés aux proches</li>
            <li>{resultat.jeuxEnvoyes} jeux de la semaine envoyés par SMS</li>
          </ul>
        </div>
      )}
    </main>
  )
}
