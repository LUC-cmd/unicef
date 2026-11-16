import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { IconeAgent, IconeBouclier, IconeCarnet, IconeZone } from '../components/Icones.jsx'
import { useAuth } from '../lib/contexte.jsx'
import Bandeau from '../components/Bandeau.jsx'

import { MDP_DEMO } from '../lib/config.js'

const COMPTES = [
  { id: 'agent.vo', role: 'Agent de santé', lieu: 'Vo, zone rurale', detail: 'Liste de visites priorisée, saisie hors ligne, inscription de familles. Chaque agent ne voit que sa zone.', cible: '/agent', Icone: IconeAgent },
  { id: 'mairie', role: "Agent d'état civil", lieu: 'Mairie', detail: 'Reçoit les dossiers de naissance pré-remplis, les valide ou les rejette.', cible: '/mairie', Icone: IconeCarnet },
  { id: 'structure.golfe', role: 'Centre de santé', lieu: 'Golfe', detail: 'Répond aux demandes de rappel et d’orientation, met à jour ses horaires.', cible: '/structure', Icone: IconeBouclier },
  { id: 'decideur', role: 'Responsable régional', lieu: 'Région Maritime', detail: 'Carte anonyme des zones oubliées : où envoyer une équipe en premier.', cible: '/carte', Icone: IconeZone },
  { id: 'admin', role: 'Administrateur', lieu: 'Démonstration', detail: 'Fait avancer le temps pour montrer les rappels sans réponse.', cible: '/admin', Icone: IconeBouclier },
]

export default function Connexion() {
  const { connexion } = useAuth()
  const navigate = useNavigate()
  const lieu = useLocation()
  const [enCours, setEnCours] = useState(null)
  const [erreur, setErreur] = useState('')
  const [username, setUsername] = useState('')
  const [mdp, setMdp] = useState('')

  async function entrer(id, motDePasse, cible) {
    setErreur('')
    setEnCours(id)
    try {
      await connexion(id, motDePasse)
      navigate('/preparation', { replace: true, state: { cible: lieu.state?.depuis || cible } })
    } catch (err) {
      setErreur(err.statut === 401 ? 'Identifiant ou mot de passe incorrect.' : err.message)
    } finally {
      setEnCours(null)
    }
  }

  function envoyerFormulaire(e) {
    e.preventDefault()
    const id = username.trim()
    entrer(id, mdp, COMPTES.find((c) => c.id === id)?.cible)
  }

  return (
    <>
    <Bandeau surtitre="Démonstration" titre="Entrer dans Fil d'Or">
      Choisissez un rôle : la connexion est immédiate. Chaque rôle voit une partie différente du système. Toutes les données sont fictives.
    </Bandeau>
    <main className="page connexion-page">

      {erreur && <p className="erreur" role="alert">{erreur}</p>}

      <div className="comptes-grille">
        {COMPTES.map(({ id, role, lieu: zone, detail, cible, Icone }) => (
          <button key={id} type="button" className="compte-carte" disabled={enCours !== null} onClick={() => entrer(id, MDP_DEMO, cible)}>
            <span className="icone"><Icone /></span>
            <span className="texte">
              <b>{role}</b>
              <em>{zone}</em>
              <span>{detail}</span>
            </span>
            <span className="entrer">{enCours === id ? 'Connexion…' : 'Entrer'}</span>
          </button>
        ))}
      </div>

      <details className="autre-compte">
        <summary>Autres comptes : agent du Golfe (agent.golfe), ou un identifiant</summary>
        <form className="carte" onSubmit={envoyerFormulaire}>
          <div className="formulaire-ligne">
            <label>Identifiant
              <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
            </label>
            <label>Mot de passe
              <input type="password" value={mdp} onChange={(e) => setMdp(e.target.value)} autoComplete="current-password" required />
            </label>
          </div>
          <button className="bouton" disabled={enCours !== null}>Se connecter</button>
        </form>
      </details>
    </main>
    </>
  )
}
