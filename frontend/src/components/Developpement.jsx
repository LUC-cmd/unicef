import { useState } from 'react'
import { Link } from 'react-router-dom'
import { aOrienter, trancheDe } from '../lib/jalons.js'

function lire(code) {
  try { return JSON.parse(localStorage.getItem(`fildor.jalons.${code}`) || '{}') } catch { return {} }
}

/** Repères de développement de l'âge de l'enfant : observé, ou à surveiller. */
export default function Developpement({ code, ageMois }) {
  const tranche = trancheDe(ageMois)
  const [etats, setEtats] = useState(() => lire(code))
  if (!tranche) return null

  function choisir(cle, valeur) {
    const suite = { ...etats, [cle]: etats[cle] === valeur ? undefined : valeur }
    setEtats(suite)
    try { localStorage.setItem(`fildor.jalons.${code}`, JSON.stringify(suite)) } catch { /* stockage indisponible */ }
  }
  const orienter = aOrienter(etats)

  return (
    <section className={`carte${orienter ? ' attention' : ''}`} aria-labelledby={`dev-${code}`}>
      <h3 id={`dev-${code}`}>Développement : repères de {tranche.de} à {tranche.a} mois</h3>
      <p className="petit">Ce que la plupart des enfants de cet âge font. Observez avec la mère, sans test ni diagnostic.</p>
      <ul className="jalons">
        {tranche.jalons.map(([cle, texte]) => (
          <li key={cle}>
            <span>{texte}</span>
            <span className="actions">
              <button type="button" className={`bouton petit-bouton${etats[cle] === 'ok' ? '' : ' secondaire'}`} aria-pressed={etats[cle] === 'ok'} onClick={() => choisir(cle, 'ok')}>Observé</button>
              <button type="button" className={`bouton petit-bouton${etats[cle] === 'surveiller' ? '' : ' secondaire'}`} aria-pressed={etats[cle] === 'surveiller'} onClick={() => choisir(cle, 'surveiller')}>À surveiller</button>
            </span>
          </li>
        ))}
      </ul>
      {orienter && (
        <p><b>Deux repères ou plus à surveiller.</b> Proposer à la famille une consultation au centre de santé, et chercher un accueil adapté dans l'<Link to="/annuaire">annuaire</Link> (case « besoins spécifiques »).</p>
      )}
      <p className="petit">Notes gardées sur cet appareil seulement pour l'instant ; l'enregistrement dans le dossier est prévu.</p>
    </section>
  )
}
