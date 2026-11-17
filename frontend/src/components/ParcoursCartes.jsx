import { Link } from 'react-router-dom'
import { ETAPES_PARCOURS } from '../lib/etapes.js'
import IconeEtape from './IconeEtape.jsx'

const FL = <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M4 10h11m-4-5 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>

/** Les six étapes : chaque carte est un bouton qui ouvre la page de l'étape. */
export default function ParcoursCartes() {
  return (
    <ol className="etapes-cartes">
      {ETAPES_PARCOURS.map((e, i) => (
        <li key={e.code} style={{ '--c': e.couleur, '--i': i }}>
          <Link to={`/parcours/${e.code}`} className="etape-carte" aria-label={`${e.nom} : ouvrir l'étape`}>
            <span className="etape-haut">
              <span className="etape-icone"><IconeEtape nom={e.icone} /></span>
              <span className="etape-num">{i + 1}</span>
            </span>
            <small>{e.age}</small>
            <h3>{e.nom}</h3>
            <p>{e.court}</p>
            <span className="etape-bouton">Ouvrir l'étape {FL}</span>
          </Link>
        </li>
      ))}
    </ol>
  )
}
