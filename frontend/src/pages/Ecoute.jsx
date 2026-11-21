import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import { ZONES } from '../lib/format.js'
import Bandeau from '../components/Bandeau.jsx'

function lire(texte) {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(texte)
  u.lang = 'fr-FR'
  window.speechSynthesis.speak(u)
}

/** Point d'écoute : radio, causerie ou marché. Aucune famille n'est identifiée. */
export default function Ecoute() {
  const [zone, setZone] = useState('VO')
  const [seance, setSeance] = useState(null)
  const [erreur, setErreur] = useState('')
  const [lu, setLu] = useState(null)

  useEffect(() => {
    let annule = false
    setErreur('')
    api.get(`/api/public/ecoute?zone=${encodeURIComponent(zone)}`)
      .then((s) => { if (!annule) setSeance(Array.isArray(s?.moments) ? s : null) })
      .catch((e) => { if (!annule) { setSeance(null); setErreur(e.message) } })
    return () => { annule = true }
  }, [zone])

  return (
    <>
    <Bandeau surtitre="Porte 4" titre="Point d'écoute">
      Les mêmes messages qu'au téléphone, lus à voix haute pour tous. Personne n'est nommé.
    </Bandeau>
    <main className="page">

      <label>
        Zone de la séance
        <select value={zone} onChange={(e) => setZone(e.target.value)}>
          {ZONES.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
        </select>
      </label>

      {erreur && <p className="erreur" role="alert">{erreur}</p>}

      {seance && (
        <>
          <p className="avertissement">{seance.consigne} Zone : {seance.nomZone}.</p>
          <div className="grille">
            {seance.moments.map((m) => (
              <article className="carte" key={m.sujet}>
                <h2>{m.titre}</h2>
                <p>{m.texte}</p>
                {m.aValider && <p className="petit">Contenu à valider par un professionnel avant tout usage réel.</p>}
                <button className="bouton secondaire" onClick={() => { setLu(m.sujet); lire(`${m.titre}. ${m.texte}`) }}>
                  {lu === m.sujet ? 'Relire à voix haute' : 'Lire à voix haute'}
                </button>
              </article>
            ))}
          </div>
          <p className="petit">
            Les voix en éwé, kabyè et tem ne sont pas encore enregistrées : la séance de démonstration est lue en français,
            et le dit. En éwé, kabyè ou tem, un locuteur natif lira le même texte.
          </p>
        </>
      )}
    </main>
    </>
  )
}
