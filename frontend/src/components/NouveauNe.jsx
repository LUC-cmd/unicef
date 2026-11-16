import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import { formaterDate } from '../lib/format.js'

/** Poids de naissance et suivi renforcé de la première semaine. */
export default function NouveauNe({ code, enLigne, ageMois }) {
  const [info, setInfo] = useState(null)
  const [poids, setPoids] = useState('')
  const [erreur, setErreur] = useState('')

  useEffect(() => {
    if (!enLigne) return
    api.get(`/api/agent/enfants/${code}/naissance`).then(setInfo).catch(() => {})
  }, [code, enLigne])

  async function enregistrer(e) {
    e.preventDefault()
    try { setInfo(await api.post(`/api/agent/enfants/${code}/poids-naissance`, { grammes: Number(poids) })); setErreur('') }
    catch (x) { setErreur(x.message) }
  }

  if (!enLigne) return null
  return (
    <>
      {ageMois < 3 && (
        <section className={`carte${info?.petitPoids ? ' attention' : ''}`}>
          <h3>Poids de naissance</h3>
          {info?.poidsNaissanceG
            ? <p><b>{info.poidsNaissanceG} g</b>. {info.conseil}</p>
            : <p className="petit">Pas encore noté. En dessous de 2 500 g, le nouveau-né a besoin d'un suivi plus proche la première semaine.</p>}
          {info?.visitesRenforcees?.length > 0 && (
            <p>Visites à prévoir : {info.visitesRenforcees.map((d) => formaterDate(d)).join(', ')}.</p>
          )}
          <form onSubmit={enregistrer} className="actions">
            <label>Poids en grammes <input type="number" inputMode="numeric" min="500" max="6500" value={poids} onChange={(e) => setPoids(e.target.value)} required /></label>
            <button className="bouton petit-bouton" type="submit">Enregistrer</button>
          </form>
          {erreur && <p className="erreur" role="alert">{erreur}</p>}
        </section>
      )}
      {ageMois >= 30 && ageMois < 60 && (
        <section className="carte">
          <h3>Bientôt l'école maternelle</h3>
          <p>À 3 ans, l'enfant peut entrer au préscolaire. Chercher un jardin d'enfants près de la famille dans l'<a href="/annuaire">annuaire</a>, et vérifier que l'acte de naissance est retiré : il sera demandé à l'inscription.</p>
        </section>
      )}
    </>
  )
}
