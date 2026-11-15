import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { IconeAgent, IconeBouclier, IconeCarnet, IconeZone } from '../components/Icones.jsx'
import { useAuth } from '../lib/contexte.jsx'
import Bandeau from '../components/Bandeau.jsx'

// Mot de passe commun des comptes de démonstration, défini à la construction du site (VITE_MDP_DEMO).
const MDP_DEMO = import.meta.env.VITE_MDP_DEMO || 'FilDor2026!demo'

const COMPTES = [
  { id: 'agent.vo', role: 'Agent de santé', lieu: 'Vo, zone rurale', detail: 'Inscrire les familles, visites, saisie hors ligne.', cible: '/tableau', Icone: IconeAgent },
  { id: 'agent.golfe', role: 'Agent de santé', lieu: 'Zone du Golfe', detail: 'Le même tableau de bord, seulement les familles du Golfe.', cible: '/tableau', Icone: IconeAgent },
  { id: 'agent.zio', role: 'Agent de santé', lieu: 'Zone de Zio', detail: 'Le même tableau de bord, seulement les familles de Zio.', cible: '/tableau', Icone: IconeAgent },
  { id: 'mairie', role: "Agent d'état civil", lieu: 'Mairie', detail: 'Dossiers de naissance à valider ou à renvoyer.', cible: '/tableau', Icone: IconeCarnet },
  { id: 'structure.golfe', role: 'Centre de santé', lieu: 'Golfe', detail: 'Demandes de rappel et horaires du centre.', cible: '/tableau', Icone: IconeBouclier },
  { id: 'structure.vo', role: 'Centre de santé', lieu: 'Vo', detail: 'Les demandes des familles de Vo.', cible: '/tableau', Icone: IconeBouclier },
  { id: 'decideur', role: 'Responsable régional', lieu: 'Région Maritime', detail: 'Carte des zones, sans voir un enfant en particulier.', cible: '/tableau', Icone: IconeZone },
  { id: 'admin', role: 'Administrateur', lieu: 'Démonstration', detail: 'Tous les tableaux, plus les coulisses.', cible: '/tableau', Icone: IconeBouclier },
]

export default function Connexion() {
  const { connexion } = useAuth()
  const navigate = useNavigate()
  const lieu = useLocation()
  const [enCours, setEnCours] = useState(null)
  const [erreur, setErreur] = useState('')
  const [username, setUsername] = useState('')
  const [mdp, setMdp] = useState('')

  async function entrer(id, motDePasse) {
    setErreur('')
    setEnCours(id)
    try {
      await connexion(id, motDePasse)
      const depuis = lieu.state?.depuis
      navigate(depuis && depuis !== '/connexion' ? depuis : '/tableau', { replace: true })
    } catch (err) {
      setErreur(err.statut === 401 ? 'Identifiant ou mot de passe incorrect.' : err.message)
    } finally {
      setEnCours(null)
    }
  }

  function envoyerFormulaire(e) {
    e.preventDefault()
    entrer(username.trim(), mdp)
  }

  return (
    <>
    <Bandeau surtitre="Un clic, ou les identifiants" titre="Choisissez votre place">
      Chaque carte ouvre son tableau de bord. Pour les taper : l'identifiant est sous le rôle, le mot de passe est le même pour tous, <b>{MDP_DEMO}</b>.
    </Bandeau>
    <main className="page connexion-page">
      {erreur && <p className="erreur" role="alert">{erreur}</p>}
      <div className="comptes-grille entree-grille">
        {COMPTES.map(({ id, role, lieu: zone, detail, Icone }) => (
          <button key={id} type="button" className="compte-carte" disabled={enCours !== null} onClick={() => entrer(id, MDP_DEMO)}>
            <span className="icone"><Icone /></span>
            <span className="texte">
              <b>{role}</b>
              <em>{zone}</em>
              <code className="identifiant">{id}</code>
              <span>{detail}</span>
            </span>
            <span className="entrer">{enCours === id ? 'Ouverture…' : 'Entrer'}</span>
          </button>
        ))}
      </div>
      <details className="autre-compte">
        <summary>J'ai déjà un identifiant</summary>
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
