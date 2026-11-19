import { useState } from 'react'
import { api } from '../lib/api.js'

/** Code secret oublié : l'agent l'efface, en présence de la famille. Elle en choisira un nouveau à sa prochaine connexion. */
export default function ReinitialiserSecret({ codeFamille, enLigne }) {
  const [confirmer, setConfirmer] = useState(false)
  const [message, setMessage] = useState(null)

  async function effacer() {
    try {
      const r = await api.post(`/api/agent/familles/${encodeURIComponent(codeFamille)}/code-secret/reinitialiser`)
      setMessage({ ok: true, texte: r.message }); setConfirmer(false)
    } catch (e) { setMessage({ ok: false, texte: e.message }); setConfirmer(false) }
  }

  if (message?.ok) return <p className="succes" role="status">{message.texte}</p>
  return (
    <div className="retrait">
      {!confirmer ? (
        <button className="lien" disabled={!enLigne} onClick={() => setConfirmer(true)}>La famille a oublié son code secret…</button>
      ) : (
        <div className="carte attention">
          <p><b>Effacer le code secret de la famille {codeFamille} ?</b> Vérifiez d’abord que vous êtes bien avec elle et que vous connaissez son carnet. À sa prochaine connexion, elle choisira un nouveau code.</p>
          <div className="actions">
            <button className="bouton" onClick={effacer}>Oui, effacer le code</button>
            <button className="bouton secondaire" onClick={() => setConfirmer(false)}>Annuler</button>
          </div>
        </div>
      )}
      {!enLigne && <p className="petit">Disponible en ligne seulement.</p>}
      {message && !message.ok && <p className="erreur" role="alert">{message.texte}</p>}
    </div>
  )
}
