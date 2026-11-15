import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/contexte.jsx'

// Facultatif : défini à la construction du site pour préremplir le mot de passe de démonstration.
const MDP_PREREMPLI = import.meta.env.VITE_MDP_DEMO || ''

const COMPTES = [
  ['agent.vo', 'Agent de santé', 'Vo, zone rurale', '/agent'],
  ['agent.golfe', 'Agent de santé', 'Zone du Golfe', '/agent'],
  ['agent.zio', 'Agent de santé', 'Zone de Zio', '/agent'],
  ['mairie', "Agent d'état civil", 'Valide les naissances', '/mairie'],
  ['decideur', 'Responsable régional', 'Carte des zones', '/carte'],
  ['structure.golfe', 'Centre de santé', 'Golfe', '/structure'],
  ['structure.vo', 'Centre de santé', 'Vo', '/structure'],
  ['admin', 'Administrateur', 'Outil de démonstration', '/admin'],
]

export default function Connexion() {
  const { connexion } = useAuth()
  const navigate = useNavigate()
  const lieu = useLocation()
  const [username, setUsername] = useState('agent.vo')
  const [mdp, setMdp] = useState(MDP_PREREMPLI)
  const [erreur, setErreur] = useState('')
  const [attente, setAttente] = useState(false)

  async function envoyer(e) {
    e.preventDefault()
    setErreur('')
    setAttente(true)
    try {
      await connexion(username.trim(), mdp)
      const cible = COMPTES.find((c) => c[0] === username.trim())?.[3] || '/'
      navigate(lieu.state?.depuis || cible, { replace: true })
    } catch (err) {
      setErreur(err.statut === 401 ? 'Identifiant ou mot de passe incorrect.' : err.message)
    } finally {
      setAttente(false)
    }
  }

  return (
    <main className="connexion">
      <div>
        <h1>Se connecter</h1>
        <p className="petit">Espace réservé aux agents de santé, à l'état civil, aux structures d'accueil et aux responsables régionaux.</p>
        <form className="carte" onSubmit={envoyer}>
          <label>
            Identifiant
            <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
          </label>
          <label>
            Mot de passe
            <input type="password" value={mdp} onChange={(e) => setMdp(e.target.value)} autoComplete="current-password" required />
          </label>
          {erreur && <p className="erreur" role="alert">{erreur}</p>}
          <button className="bouton" disabled={attente}>{attente ? 'Connexion en cours…' : 'Se connecter'}</button>
        </form>
        <p className="petit">
          Les comptes de démonstration partagent un mot de passe, communiqué avec le dossier de candidature.
          Toutes les données sont fictives.
        </p>
      </div>

      <section aria-labelledby="titre-comptes">
        <h2 id="titre-comptes">Comptes de démonstration</h2>
        <p className="petit">Choisissez un rôle pour remplir l'identifiant.</p>
        <div className="comptes">
          {COMPTES.map(([id, role, detail]) => (
            <button type="button" key={id} className={`compte ${username === id ? 'choisi' : ''}`} onClick={() => setUsername(id)} aria-pressed={username === id}>
              <b>{role}</b>
              <span>{detail} · {id}</span>
            </button>
          ))}
        </div>
      </section>
    </main>
  )
}
