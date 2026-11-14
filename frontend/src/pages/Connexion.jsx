import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/contexte.jsx'

const MDP_DEMO = 'FilDor2026!demo'

const COMPTES = [
  ['agent.golfe', 'Agent de santé (Golfe)', '/agent'],
  ['agent.zio', 'Agent de santé (Zio)', '/agent'],
  ['agent.vo', 'Agent de santé (Vo, zone rurale)', '/agent'],
  ['mairie', "Agent d'état civil", '/mairie'],
  ['decideur', 'Responsable régional', '/carte'],
  ['structure.golfe', 'Centre de santé du Golfe', '/structure'],
  ['structure.vo', 'Centre de santé de Vo', '/structure'],
  ['admin', 'Administrateur (démo)', '/admin'],
]

export default function Connexion() {
  const { connexion } = useAuth()
  const navigate = useNavigate()
  const lieu = useLocation()
  const [username, setUsername] = useState('agent.vo')
  const [mdp, setMdp] = useState(MDP_DEMO)
  const [erreur, setErreur] = useState('')
  const [attente, setAttente] = useState(false)

  async function envoyer(e) {
    e.preventDefault()
    setErreur('')
    setAttente(true)
    try {
      await connexion(username.trim(), mdp)
      const cible = COMPTES.find((c) => c[0] === username.trim())?.[2] || '/'
      navigate(lieu.state?.depuis || cible, { replace: true })
    } catch (err) {
      setErreur(err.statut === 401 ? 'Identifiant ou mot de passe incorrect.' : err.message)
    } finally {
      setAttente(false)
    }
  }

  return (
    <main className="page etroite">
      <h1>Se connecter</h1>
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
        <button className="bouton" disabled={attente}>{attente ? 'Connexion…' : 'Entrer'}</button>
      </form>

      <section className="carte">
        <h2>Comptes de démonstration</h2>
        <p className="petit">
          Mot de passe de démonstration : <code>{MDP_DEMO}</code>. Il est déjà saisi.
          Choisissez un compte, puis entrez.
        </p>
        <ul className="liste-comptes">
          {COMPTES.map(([id, nom]) => (
            <li key={id}>
              <button type="button" className="lien" onClick={() => { setUsername(id); setMdp(MDP_DEMO) }}>{id}</button>
              <span className="petit"> · {nom}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
