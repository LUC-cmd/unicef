import { useState } from 'react'
import { api } from '../lib/api.js'
import { LIBELLE_SUJET } from '../lib/format.js'

const SUJETS = Object.keys(LIBELLE_SUJET)
const AIDE = SUJETS.length + 1
const INSCRIPTION = SUJETS.length + 2

const LOCAUX = {
  [AIDE]: [
    'Un problème',
    '',
    'Si le bébé ne boit plus,',
    'convulse, ou si la mère saigne :',
    'allez au centre de santé maintenant.',
    '',
    'Ce menu ne soigne pas.',
    'Il dit à l\'agent que vous avez appelé.',
    '',
    '0 Menu',
  ].join('\n'),
  [INSCRIPTION]: [
    'Comment on vous inscrit',
    '',
    'Pas besoin d\'internet.',
    'L\'agent vient chez vous.',
    'Il note un code, jamais votre nom.',
    'Son téléphone garde tout.',
    'Au centre, ça part tout seul.',
    '',
    'Vous, composez *789#',
    'pour écouter ou signaler un problème.',
    '',
    '0 Menu',
  ].join('\n'),
}

function menu() {
  const lignes = ['Fil d\'Or']
  SUJETS.forEach((s, i) => lignes.push(`${i + 1} ${LIBELLE_SUJET[s]}`))
  lignes.push(`${AIDE} J'ai un problème`)
  lignes.push(`${INSCRIPTION} Comment on m'inscrit`)
  lignes.push('0 Quitter')
  return lignes.join('\n')
}

const MENU = menu()

/** Menu USSD du téléphone basique : pas d'application, pas de data. L'aide et l'inscription marchent même sans réseau. */
export default function Ussd({ numero }) {
  const [ecran, setEcran] = useState("Composez *789# puis validez.")
  const [saisie, setSaisie] = useState('*789#')
  const [ouvert, setOuvert] = useState(false)
  const [attente, setAttente] = useState(false)

  function fermer() {
    setOuvert(false)
    setEcran('Session terminée.\nComposez *789#')
    setSaisie('*789#')
  }

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
      fermer()
      return
    }
    const index = Number(choix)
    if (LOCAUX[index]) {
      setEcran(LOCAUX[index])
      setSaisie('')
      return
    }
    const sujet = SUJETS[index - 1]
    if (!sujet) {
      setEcran(`Choix inconnu.\n\n${MENU}`)
      setSaisie('')
      return
    }
    setAttente(true)
    try {
      const m = await api.post('/api/public/voix', { telephone: numero, sujet, langue: null })
      const avert = m.avertissement ? `\n\n${m.avertissement}` : ''
      setEcran(`${m.titre}\n\n${m.texte}${avert}\n\n0 Menu`)
      setSaisie('')
    } catch {
      setEcran([
        'Pas de réseau.',
        'Le message reste chez l\'agent.',
        '',
        `${AIDE} J'ai un problème`,
        `${INSCRIPTION} Comment on m'inscrit`,
        '0 Menu',
      ].join('\n'))
      setSaisie('')
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
      <p className="petit">Sur un téléphone simple, sans internet : *789# ouvre Fil d'Or. Un chiffre choisit. L'inscription d'une famille nouvelle se fait avec l'agent, même hors réseau.</p>
    </form>
  )
}
