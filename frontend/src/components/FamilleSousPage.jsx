import { Link, Navigate } from 'react-router-dom'
import FamilleNav from './FamilleNav.jsx'
import { lireCompte } from '../lib/famille.js'

/** Une page de service (grossesse, jeux, assistant, acte) ouverte dans l'espace famille : la barre reste, on ne sort pas. */
export default function FamilleSousPage({ children }) {
  if (!lireCompte()) return <Navigate to="/famille" replace />
  return (
    <>
      <div className="fam-cadre"><FamilleNav actif={false} /></div>
      {children}
      <p className="fam-retour"><Link to="/famille" className="bouton secondaire">Retour à mon espace</Link></p>
    </>
  )
}
