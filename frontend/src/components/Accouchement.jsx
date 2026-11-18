import { useState } from 'react'
import { api } from '../lib/api.js'
import { etapesPassees } from '../lib/calendrier.js'
import { envoyerOuMettreEnFile } from '../lib/envoi.js'
import { aujourdhuiIso, formaterDate } from '../lib/format.js'
import { ajouterAccouchement } from '../lib/offline.js'

/** « Le bébé est né » : la grossesse suivie devient un enfant et son plan de vaccination se crée (marche hors ligne). */
export default function Accouchement({ fiche, enLigne, onChange }) {
  const aujourdhui = aujourdhuiIso()
  const [date, setDate] = useState(aujourdhui)
  const [faites, setFaites] = useState([])
  const [etat, setEtat] = useState(null)
  const minimum = (() => { const d = new Date(aujourdhui + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() - 60); return d.toISOString().slice(0, 10) })()

  async function envoyer(e) {
    e.preventDefault()
    const corps = { dateNaissance: date, etapesFaites: faites }
    try {
      const r = await envoyerOuMettreEnFile({
        enLigne,
        envoyer: () => api.post(`/api/agent/enfants/${encodeURIComponent(fiche.codeEnfant)}/accouchement`, corps),
        mettreEnFile: () => ajouterAccouchement({ codeEnfant: fiche.codeEnfant, ...corps }),
      })
      setEtat({ ok: true, texte: r.envoye
        ? 'Naissance enregistrée : le plan de vaccination est créé. Prochaine étape : la déclaration de naissance ci-dessous — les noms de la mère et du père sont déjà pré-remplis depuis la grossesse.'
        : 'Naissance enregistrée sur ce téléphone. Elle partira au retour du réseau. Prochaine étape : la déclaration de naissance — les noms sont déjà pré-remplis depuis la grossesse.' })
      onChange?.()
    } catch (err) { setEtat({ ok: false, texte: err.message }) }
  }

  if (etat?.ok) return <p className="succes" role="status">{etat.texte}</p>

  return (
    <form onSubmit={envoyer}>
      <h3>Le bébé est né ?</h3>
      <p className="petit">Terme prévu le {formaterDate(fiche.dateTermePrevue)}. Enregistrer la naissance crée le plan de vaccination.</p>
      <label>Date de naissance
        <input type="date" required value={date} min={minimum} max={aujourdhui} onChange={(e) => { setDate(e.target.value); setFaites([]) }} />
      </label>
      {etapesPassees(date, aujourdhui).map((et) => (
        <label className="case" key={et.index}>
          <input type="checkbox" checked={faites.includes(et.index)}
                 onChange={() => setFaites((l) => (l.includes(et.index) ? l.filter((i) => i !== et.index) : [...l, et.index]))} />
          Déjà fait : {et.libelle}
        </label>
      ))}
      <button className="bouton secondaire">Enregistrer la naissance</button>
      {etat && !etat.ok && <p className="erreur" role="alert">{etat.texte}</p>}
    </form>
  )
}
