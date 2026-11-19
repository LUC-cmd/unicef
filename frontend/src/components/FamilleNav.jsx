import { NavLink } from 'react-router-dom'
import Picto from './Picto.jsx'

const ONGLETS = [['/famille', 'Accueil', 'famille', true], ['/famille/messages', 'Messages', 'telephone'], ['/famille/lieux', 'Crèches', 'pin'], ['/famille/dossier', 'Dossier', 'fiche'], ['/famille/compte', 'Compte', 'coeur']]

/** Barre de l'espace famille : présente sur toutes les pages de l'espace, y compris grossesse, jeux, assistant et acte. */
export default function FamilleNav({ aRepondre = 0, actif = true }) {
  return (
    <nav className="fam-onglets" aria-label="Sections de mon espace">
      {ONGLETS.map(([to, nom, pic, fin]) => (
        <NavLink key={to} to={to} end={fin} className={({ isActive }) => (actif && isActive ? 'actif' : '')} onClick={() => window.scrollTo({ top: 0 })}>
          <Picto nom={pic} /><span>{nom}</span>
          {to === '/famille/messages' && aRepondre > 0 && <i className="fam-pastille" aria-label={`${aRepondre} message(s) à confirmer`}>{aRepondre}</i>}
        </NavLink>
      ))}
    </nav>
  )
}
