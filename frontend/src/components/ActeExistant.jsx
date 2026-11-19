import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'

const CHOIX = [
  ['AUCUN', "Pas d'acte connu", "Fil d'Or aide la famille à le déclarer."],
  ['ETABLI', 'Acte établi, pas encore retiré', "La mairie l'a dressé : il reste à le retirer."],
  ['RETIRE', 'Acte de naissance en main', "Rien à faire : l'alerte disparaît."],
]

/** Enfant déjà né : l'agent note si l'acte existe déjà, pour ne pas relancer la famille pour rien. */
export default function ActeExistant({ code, enLigne }) {
  const [etat, setEtat] = useState(null)
  const [message, setMessage] = useState('')
  useEffect(() => {
    if (!enLigne) return
    api.get(`/api/agent/enfants/${encodeURIComponent(code)}/acte`).then((r) => setEtat(r.etat)).catch(() => {})
  }, [code, enLigne])

  async function choisir(v) {
    setMessage('')
    try {
      const r = await api.post(`/api/agent/enfants/${encodeURIComponent(code)}/acte`, { etat: v })
      setEtat(r.etat); setMessage('Enregistré.')
    } catch (e) { setMessage(e.message) }
  }

  return (
    <fieldset className="acte-existant">
      <legend>Acte de naissance de cet enfant</legend>
      {!enLigne && <p className="petit">Disponible en ligne seulement.</p>}
      {CHOIX.map(([v, titre, aide]) => (
        <label className="case" key={v}>
          <input type="radio" name={`acte-${code}`} disabled={!enLigne || etat === null} checked={etat === v} onChange={() => choisir(v)} />
          <span>{titre} <small>{aide}</small></span>
        </label>
      ))}
      {message && <p className="petit" role="status">{message}</p>}
    </fieldset>
  )
}
