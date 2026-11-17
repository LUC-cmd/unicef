import { useState } from 'react'
import { api } from '../lib/api.js'

/** Retrait de l'accord de la famille : elle n'est plus suivie ni contactée, son téléphone et ses proches sont effacés. */
export default function RetraitConsentement({ codeFamille, enLigne, onFait }) {
  const [confirmer, setConfirmer] = useState(false)
  const [message, setMessage] = useState(null)

  async function retirer() {
    try {
      const r = await api.post(`/api/agent/familles/${encodeURIComponent(codeFamille)}/retrait-consentement`)
      setMessage({ ok: true, texte: r.message }); setConfirmer(false); onFait?.()
    } catch (e) { setMessage({ ok: false, texte: e.message }) }
  }

  if (message?.ok) return <p className="succes" role="status">{message.texte}</p>
  return (
    <div className="retrait">
      {!confirmer ? (
        <button className="lien danger-lien" disabled={!enLigne} onClick={() => setConfirmer(true)}>La famille retire son accord…</button>
      ) : (
        <div className="carte alerte">
          <p><b>Retirer l'accord de la famille {codeFamille} ?</b> Elle ne sera plus suivie ni contactée, son téléphone et ses proches seront effacés. C'est définitif pour ces éléments.</p>
          <div className="actions">
            <button className="bouton" onClick={retirer}>Oui, retirer l'accord</button>
            <button className="bouton secondaire" onClick={() => setConfirmer(false)}>Annuler</button>
          </div>
        </div>
      )}
      {!enLigne && <p className="petit">Disponible en ligne seulement.</p>}
      {message && !message.ok && <p className="erreur" role="alert">{message.texte}</p>}
    </div>
  )
}
