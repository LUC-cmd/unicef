import { useState } from 'react'
import { api } from '../lib/api.js'
import { LIBELLE_SUJET } from '../lib/format.js'

const SUJETS = Object.keys(LIBELLE_SUJET)
const MENU = ['Fil d\'Or', ...SUJETS.map((s, i) => `${i + 1} ${LIBELLE_SUJET[s]}`), '0 Quitter'].join('\n')

/** Menu USSD du téléphone basique : les mêmes sujets que l'appel, sans application ni data. */
export default function Ussd({ numero }) {
  const [ecran, setEcran] = useState("Composez *789# puis validez.")
  const [saisie, setSaisie] = useState('*789#')
  const [ouvert, setOuvert] = useState(false)
  const [attente, setAttente] = useState(false)

  async function valider(e) {
    e.preventDefault()
    const choix = saisie.trim()
    if (!ouvert) {
      if (choix.replace(/\s/g, '') !== '*789#') {
        setEcran('Code inconnu.\nComposez *789#')
        return
      }
      setOuvert(true)
      setEcran(MENU)
      setSaisie('')
      return
    }
    if (choix === '0' || choix === '') {
      setOuvert(false)
      setEcran('Session terminée.\nComposez *789#')
      setSaisie('*789#')
      return
    }
    const index = Number(choix) - 1
    if (!Number.isInteger(index) || index < 0 || index >= SUJETS.length) {
      setEcran(`Choix inconnu.\n\n${MENU}`)
      setSaisie('')
      return
    }
    setAttente(true)
    try {
      const m = await api.post('/api/public/voix', { telephone: numero, sujet: SUJETS[index], langue: null })
      const avert = m.avertissement ? `\n\n${m.avertissement}` : ''
      setEcran(`${m.titre}\n\n${m.texte}${avert}\n\n0 Menu`)
      setSaisie('')
    } catch (err) {
      setEcran(err.message)
    } finally {
      setAttente(false)
    }
  }

  return (
    <form onSubmit={valider}>
      <pre className="ecran-ussd" aria-live="polite">{ecran}</pre>
      <label>
        Votre choix
        <input value={saisie} onChange={(e) => setSaisie(e.target.value)} inputMode="tel" maxLength={8} autoComplete="off" />
      </label>
      <button className="bouton" disabled={attente}>{attente ? '…' : 'Valider'}</button>
      <p className="petit">Comme sur un téléphone sans écran tactile : *789# ouvre Fil d'Or, un chiffre choisit le sujet.</p>
    </form>
  )
}
