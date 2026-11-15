import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { IconeAgent, IconeBouclier, IconeCarnet, IconeZone } from '../components/Icones.jsx'
import { useAuth } from '../lib/contexte.jsx'
import Bandeau from '../components/Bandeau.jsx'

// Mot de passe commun des comptes de démonstration, défini à la construction du site (VITE_MDP_DEMO).
const MDP_DEMO = import.meta.env.VITE_MDP_DEMO || 'FilDor2026!demo'

const COMPTES = [
  { id: 'agent.vo', role: 'Agent de santé', lieu: 'Vo, zone rurale', detail: 'Liste de visites priorisée, saisie hors ligne, inscription de familles.', cible: '/agent', Icone: IconeAgent },
  { id: 'agent.golfe', role: 'Agent de santé', lieu: 'Zone du Golfe', detail: 'Même application, autre zone : chaque agent ne voit que la sienne.', cible: '/agent', Icone: IconeAgent },
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
    <Bandeau surtitre="Comptes professionnels" titre="Entrer dans Fil d'Or">
      Un identifiant, un rôle, un tableau de bord. L’agent ne voit que sa zone, la mairie ne voit que les naissances, le responsable régional ne voit que des zones.
    </Bandeau>
    <main className="page connexion-page">
      {erreur && <p className="erreur" role="alert">{erreur}</p>}

      <div className="connexion-layout">
        <form className="carte connexion-form" onSubmit={envoyerFormulaire}>
          <h2>Connexion</h2>
          <p className="petit">Après la connexion, vous arrivez sur votre tableau de bord.</p>
          <label>Identifiant
            <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
          </label>
          <label>Mot de passe
            <input type="password" value={mdp} onChange={(e) => setMdp(e.target.value)} autoComplete="current-password" required />
          </label>
          <button className="bouton" disabled={enCours !== null}>{enCours === username.trim() ? 'Connexion…' : 'Se connecter'}</button>
        </form>

        <section>
          <h2>Comptes de démonstration</h2>
          <p className="petit">Un clic ouvre le tableau de bord du rôle. Mot de passe commun de la démo, données fictives.</p>
          <div className="comptes-grille">
            {COMPTES.map(({ id, role, lieu: zone, detail, Icone }) => (
              <button key={id} type="button" className="compte-carte" disabled={enCours !== null} onClick={() => entrer(id, MDP_DEMO)}>
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
        </section>
      </div>
    </main>
    </>
  )
}
