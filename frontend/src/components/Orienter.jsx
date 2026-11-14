import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import { LIBELLE_REPONSE, LIBELLE_TYPE_STRUCTURE, formaterDate } from '../lib/format.js'

/** L'agent oriente la famille vers une structure de sa zone, ou demande qu'elle soit rappelée. */
export default function Orienter({ codeFamille, demandes, enLigne, onChange }) {
  const [structures, setStructures] = useState([])
  const [code, setCode] = useState('')
  const [motif, setMotif] = useState('ORIENTATION')
  const [message, setMessage] = useState(null)

  useEffect(() => {
    if (!enLigne) return
    api.get('/api/agent/structures').then((l) => { setStructures(l); setCode(l[0]?.code ?? '') }).catch(() => {})
  }, [enLigne])

  async function envoyer(e) {
    e.preventDefault()
    try {
      const r = await api.post('/api/agent/demandes', { codeFamille, codeStructure: code, motif })
      setMessage({ ok: true, texte: r.message }); onChange?.()
    } catch (err) { setMessage({ ok: false, texte: err.message }) }
  }

  return (
    <>
      <h3>Orienter vers une structure</h3>
      {demandes?.length > 0 && (
        <ul className="raisons-liste">
          {demandes.map((d) => (
            <li key={d.id}>{d.nomStructure} : {d.motif === 'RAPPEL' ? 'rappel' : 'orientation'} du {formaterDate(d.creeLe)}
              {' '}— {d.statut === 'NOUVELLE' ? 'en attente de réponse' : `réponse : ${LIBELLE_REPONSE[d.reponse]}`}</li>
          ))}
        </ul>
      )}
      {!enLigne && <p className="petit">Disponible en ligne seulement.</p>}
      {enLigne && structures.length > 0 && (
        <form onSubmit={envoyer}>
          <div className="formulaire-ligne">
            <label>Structure
              <select value={code} onChange={(e) => setCode(e.target.value)}>
                {structures.map((s) => <option key={s.code} value={s.code}>{LIBELLE_TYPE_STRUCTURE[s.type]} : {s.nom}</option>)}
              </select>
            </label>
            <label>Demande
              <select value={motif} onChange={(e) => setMotif(e.target.value)}>
                <option value="ORIENTATION">Orienter la famille</option>
                <option value="RAPPEL">Demander à la rappeler</option>
              </select>
            </label>
          </div>
          <button className="bouton secondaire petit-bouton">Envoyer la demande</button>
        </form>
      )}
      {message && <p className={message.ok ? 'succes' : 'erreur'} role="status">{message.texte}</p>}
    </>
  )
}
