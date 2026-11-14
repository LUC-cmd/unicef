import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import { LIBELLE_ROLE_PROCHE, formaterDate } from '../lib/format.js'

/** Proches informés d'une famille. Ajout et retrait en ligne seulement : il faut l'accord du proche, en personne. */
export default function Proches({ codeFamille, enLigne }) {
  const [liste, setListe] = useState([])
  const [role, setRole] = useState('RELAIS')
  const [telephone, setTelephone] = useState('')
  const [accord, setAccord] = useState(false)
  const [message, setMessage] = useState(null)

  const charger = useCallback(async () => {
    if (!enLigne) return
    try { setListe(await api.get(`/api/agent/familles/${encodeURIComponent(codeFamille)}/proches`)) }
    catch (e) { setMessage({ ok: false, texte: e.message }) }
  }, [codeFamille, enLigne])
  useEffect(() => { charger() }, [charger])

  async function ajouter(e) {
    e.preventDefault()
    try {
      const r = await api.post(`/api/agent/familles/${encodeURIComponent(codeFamille)}/proches`, { role, telephone, accordProche: accord })
      setMessage({ ok: true, texte: r.message }); setTelephone(''); setAccord(false); await charger()
    } catch (err) { setMessage({ ok: false, texte: err.message }) }
  }
  async function retirer(id) {
    try { await api.del(`/api/agent/familles/${encodeURIComponent(codeFamille)}/proches/${id}`); await charger() }
    catch (err) { setMessage({ ok: false, texte: err.message }) }
  }

  return (
    <>
      <h3>Proches informés</h3>
      {!enLigne && <p className="petit">Disponible en ligne seulement.</p>}
      {enLigne && (
        <>
          {liste.length === 0 && <p className="petit">Aucun proche. Ils reçoivent des rappels généraux, sans détail, avec leur accord.</p>}
          <ul>
            {liste.map((p) => (
              <li key={p.id}>{LIBELLE_ROLE_PROCHE[p.role]} <span className="petit">(depuis le {formaterDate(p.ajouteLe)})</span>{' '}
                <button className="lien" onClick={() => retirer(p.id)}>Retirer</button></li>
            ))}
          </ul>
          <form onSubmit={ajouter}>
            <div className="formulaire-ligne">
              <label>Rôle
                <select value={role} onChange={(e) => setRole(e.target.value)}>
                  {Object.entries(LIBELLE_ROLE_PROCHE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </label>
              <label>Téléphone du proche
                <input value={telephone} onChange={(e) => setTelephone(e.target.value)} inputMode="tel" required autoComplete="off" />
              </label>
            </div>
            <label className="case"><input type="checkbox" checked={accord} onChange={(e) => setAccord(e.target.checked)} /> Le proche a accepté de recevoir les rappels</label>
            <button className="bouton secondaire petit-bouton" disabled={!accord}>Ajouter ce proche</button>
          </form>
        </>
      )}
      {message && <p className={message.ok ? 'succes' : 'erreur'} role="status">{message.texte}</p>}
    </>
  )
}
