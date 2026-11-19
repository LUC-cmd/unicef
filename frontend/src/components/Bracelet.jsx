import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import Picto from './Picto.jsx'

const NIVEAU = { NORMAL: 'Dans les repères', A_CONTROLER: 'À contrôler', URGENT: 'À orienter vers le centre de santé' }

/** Bracelet du nouveau-né fragile : on note la mesure lue sur le bracelet. Fil d'Or marche aussi sans bracelet. */
export default function Bracelet({ code, enLigne }) {
  const [lecture, setLecture] = useState(null)
  const [temperature, setTemperature] = useState('')
  const [pouls, setPouls] = useState('')
  const [erreur, setErreur] = useState('')

  const charger = useCallback(() => { api.get(`/api/agent/enfants/${encodeURIComponent(code)}/bracelet`).then(setLecture).catch(() => {}) }, [code])
  useEffect(() => { if (enLigne) charger() }, [enLigne, charger])

  async function noter(e) {
    e.preventDefault(); setErreur('')
    try {
      setLecture(await api.post(`/api/agent/enfants/${encodeURIComponent(code)}/bracelet`,
        { temperature: Number(String(temperature).replace(',', '.')), pouls: Number(pouls) }))
      setTemperature(''); setPouls('')
    } catch (x) { setErreur(x.message) }
  }

  if (!enLigne) return null
  const derniere = lecture?.mesures?.[0]
  return (
    <section className={`carte bracelet${lecture?.niveau === 'URGENT' ? ' attention' : ''}`} aria-labelledby={`t-br-${code}`}>
      <h3 id={`t-br-${code}`}><Picto nom="coeur" /> Bracelet du nouveau-né</h3>
      <p className="petit">Pour un nouveau-né fragile suivi avec un bracelet : notez la température et le pouls affichés. Sans bracelet, prenez-les à la visite.</p>
      <form className="bracelet-form" onSubmit={noter}>
        <label className="champ"><span className="champ-titre">Température (°C)</span>
          <input inputMode="decimal" required value={temperature} onChange={(e) => setTemperature(e.target.value)} placeholder="36,8" /></label>
        <label className="champ"><span className="champ-titre">Pouls (par minute)</span>
          <input inputMode="numeric" required value={pouls} onChange={(e) => setPouls(e.target.value)} placeholder="130" /></label>
        <button className="bouton" type="submit">Enregistrer la mesure</button>
      </form>
      {erreur && <p className="erreur" role="alert">{erreur}</p>}
      {derniere && (
        <div className={`bracelet-etat niveau-${lecture.niveau.toLowerCase()}`} role="status">
          <b>{NIVEAU[lecture.niveau]}</b>
          <ul>{lecture.messages.map((m) => <li key={m}>{m}</li>)}</ul>
        </div>
      )}
      {lecture?.mesures?.length > 1 && (
        <table className="bracelet-table"><thead><tr><th>Quand</th><th>Température</th><th>Pouls</th></tr></thead>
          <tbody>{lecture.mesures.map((m) => (
            <tr key={m.le}><td>{new Date(m.le).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td><td>{String(m.temperature).replace('.', ',')} °C</td><td>{m.pouls}</td></tr>
          ))}</tbody></table>
      )}
    </section>
  )
}
