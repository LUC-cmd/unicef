import { useState } from 'react'
import { api } from '../lib/api.js'
import { LIBELLE_SUJET } from '../lib/format.js'

const SUJETS = Object.keys(LIBELLE_SUJET)
const MENU = [
  'Fil d\'Or',
  ...SUJETS.map((s, i) => `${i + 1} ${LIBELLE_SUJET[s]}`),
  '9 Urgence (convulsion, saignement…)',
  '0 Quitter',
].join('\n')

const MOTIFS_URGENCE = [
  ['1', 'Convulsion ou fièvre forte'],
  ['2', 'Blessure ou saignement'],
  ['3', "L'enfant ne respire pas bien"],
  ['4', 'Autre urgence'],
]
const MENU_URGENCE = ['URGENCE — que se passe-t-il ?', ...MOTIFS_URGENCE.map(([c, l]) => `${c} ${l}`), '0 Retour'].join('\n')

/**
 * Menu USSD du téléphone basique : les mêmes sujets que l'appel, sans application ni data.
 * *789# ouvre le menu, *789*3# déclenche le mode urgence directement.
 */
export default function Ussd({ numero }) {
  const [ecran, setEcran] = useState("Composez *789# puis validez.\nUrgence immédiate : *789*3#")
  const [saisie, setSaisie] = useState('*789#')
  const [ouvert, setOuvert] = useState(false)
  const [urgence, setUrgence] = useState(false)
  const [attente, setAttente] = useState(false)

  async function envoyerUrgence(motif) {
    setAttente(true)
    try {
      const r = await api.post('/api/public/urgence', { telephone: numero, motif })
      setEcran(`Alerte envoyée à l'agent de votre zone.\n\n${r.message}\n\nSi c'est grave, allez au centre de santé sans attendre.\n\n0 Menu`)
    } catch (err) {
      setEcran(err.message)
    } finally {
      setAttente(false)
      setUrgence(false)
      setSaisie('')
    }
  }

  async function valider(e) {
    e.preventDefault()
    const choix = saisie.trim()
    const code = choix.replace(/\s/g, '')

    // Code direct : *789*3# = urgence, sans passer par le menu.
    if (!ouvert && code === '*789*3#') {
      setOuvert(true)
      setUrgence(true)
      setEcran(MENU_URGENCE)
      setSaisie('')
      return
    }
    if (!ouvert) {
      if (code !== '*789#') {
        setEcran('Code inconnu.\nComposez *789#\nUrgence : *789*3#')
        return
      }
      setOuvert(true)
      setEcran(MENU)
      setSaisie('')
      return
    }
    if (choix === '0' || choix === '') {
      if (urgence) {
        setUrgence(false)
        setEcran(MENU)
        setSaisie('')
      } else {
        setOuvert(false)
        setEcran('Session terminée.\nComposez *789#')
        setSaisie('*789#')
      }
      return
    }
    if (urgence) {
      const trouve = MOTIFS_URGENCE.find(([c]) => c === choix)
      if (!trouve) {
        setEcran(`Choix inconnu.\n\n${MENU_URGENCE}`)
        setSaisie('')
        return
      }
      await envoyerUrgence(trouve[1])
      return
    }
    if (choix === '9') {
      setUrgence(true)
      setEcran(MENU_URGENCE)
      setSaisie('')
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
      <p className="petit">
        Comme sur un téléphone sans écran tactile : *789# ouvre Fil d'Or, un chiffre choisit le sujet,
        <b> 9</b> ou <b>*789*3#</b> déclenche le mode urgence — l'agent de la zone est prévenu.
      </p>
    </form>
  )
}
