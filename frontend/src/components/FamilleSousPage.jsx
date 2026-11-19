import { Link, Navigate } from 'react-router-dom'
import FamilleNav from './FamilleNav.jsx'
import { lireCompte } from '../lib/famille.js'

/** Une page de service (grossesse, jeux, assistant, acte) ouverte dans l'espace famille : le menu reste à gauche, on ne sort pas. */
export default function FamilleSousPage({ children }) {
  if (!lireCompte()) return <Navigate to="/famille" replace />
  return (
    <div className="fam-sous-mise">
      <aside className="fam-aside"><FamilleNav actif={false} /></aside>
      <div className="fam-sous-contenu">
        {children}
        <p className="fam-retour"><Link to="/famille" className="bouton secondaire">Retour à mon espace</Link></p>
      </div>
    </div>
  )
}
