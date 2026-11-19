import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import Picto from './Picto.jsx'

const GROUPES = [
  ['Mon espace', [['/famille', 'Accueil', 'famille', true], ['/famille/messages', 'Messages', 'telephone'], ['/famille/dossier', 'Dossier de naissance', 'fiche'], ['/famille/compte', 'Mon compte', 'coeur']]],
  ['Crèches', [['/famille/lieux', 'Crèches près de moi', 'pin'], ['/famille/creche', 'Réserver une place', 'horloge']]],
  ['Pour mon enfant', [['/famille/grossesse', 'Ma grossesse', 'enceinte'], ['/famille/jeux', 'Jeux et vidéos', 'danse'], ['/famille/assistant', 'Poser une question', 'parole'], ['/famille/acte', 'Acte de naissance', 'bol']]],
]
const TOUS = GROUPES.flatMap(([, l]) => l)

/** Menu vertical de l'espace famille : tout est à portée, sur toutes les pages de l'espace. */
export default function FamilleNav({ aRepondre = 0 }) {
  const { pathname } = useLocation()
  const [ouvert, setOuvert] = useState(false)
  useEffect(() => { setOuvert(false) }, [pathname])
  const courant = TOUS.find(([to, , , fin]) => (fin ? pathname === to : pathname.startsWith(to)))?.[1] || 'Mon espace'
  return (
    <nav className={`fam-onglets${ouvert ? ' ouvert' : ''}`} aria-label="Menu de mon espace famille">
      <button type="button" className="fam-bascule" aria-expanded={ouvert} onClick={() => setOuvert((o) => !o)}>
        <Picto nom="famille" /><span>Menu · <b>{courant}</b></span><i aria-hidden="true">{ouvert ? '▴' : '▾'}</i>
      </button>
      <div className="fam-liste">
        {GROUPES.map(([titre, liens]) => (
          <div key={titre} className="fam-groupe">
            <p className="fam-groupe-titre">{titre}</p>
            {liens.map(([to, nom, pic, fin]) => (
              <NavLink key={to} to={to} end={!!fin} className={({ isActive }) => (isActive ? 'actif' : '')} onClick={() => window.scrollTo({ top: 0 })}>
                <Picto nom={pic} /><span>{nom}</span>
                {to === '/famille/messages' && aRepondre > 0 && <em className="fam-pastille" aria-label={`${aRepondre} message(s) à confirmer`}>{aRepondre}</em>}
              </NavLink>
            ))}
          </div>
        ))}
      </div>
    </nav>
  )
}
