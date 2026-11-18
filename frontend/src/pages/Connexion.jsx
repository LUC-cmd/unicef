import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { IconeAgent, IconeBouclier, IconeCarnet, IconeZone } from '../components/Icones.jsx'
import { useAuth } from '../lib/contexte.jsx'
import Bandeau from '../components/Bandeau.jsx'

import { MDP_DEMO } from '../lib/config.js'
import { ZONES } from '../lib/format.js'

const COMPTES = [
  { id: 'agent.vo', role: 'Agent de santé', lieu: 'Vo, zone rurale', detail: 'Liste de visites priorisée, saisie hors ligne, inscription de familles. Chaque agent ne voit que sa zone.', cible: '/agent', Icone: IconeAgent },
  { id: 'mairie', role: "Agent d'état civil", lieu: 'Mairie', detail: 'Reçoit les dossiers de naissance pré-remplis, les valide ou les rejette.', cible: '/mairie', Icone: IconeCarnet },
  { id: 'structure.golfe', role: 'Centre de santé', lieu: 'Golfe', detail: 'Répond aux demandes de rappel et d’orientation, met à jour ses horaires.', cible: '/structure', Icone: IconeBouclier },
  { id: 'decideur', role: 'Responsable régional', lieu: 'Région Maritime', detail: 'Carte anonyme des zones oubliées : où envoyer une équipe en premier.', cible: '/carte', Icone: IconeZone },
  { id: 'admin', role: 'Administrateur', lieu: 'Démonstration', detail: 'Fait avancer le temps pour montrer les rappels sans réponse.', cible: '/admin', Icone: IconeBouclier },
]

export default function Connexion() {
  const { connexion, entrerLocal } = useAuth()
  const [zoneLocale, setZoneLocale] = useState(ZONES[0][0])
  const navigate = useNavigate()
  const lieu = useLocation()
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState('')
  const [choisi, setChoisi] = useState(COMPTES[0].id)
  const compte = COMPTES.find((c) => c.id === choisi) ?? COMPTES[0]
  const [username, setUsername] = useState(compte.id)
  const [mdp, setMdp] = useState(MDP_DEMO)

  function choisir(c) {
    setChoisi(c.id)
    setUsername(c.id)
    setMdp(MDP_DEMO)
    setErreur('')
  }

  async function envoyerFormulaire(e) {
    e.preventDefault()
    const id = username.trim()
    const cible = COMPTES.find((c) => c.id === id)?.cible
    setErreur('')
    setEnCours(true)
    try {
      await connexion(id, mdp)
      navigate('/preparation', {
        replace: true,
        state: { cible: lieu.state?.depuis && cible && lieu.state.depuis.startsWith(cible) ? lieu.state.depuis : cible },
      })
    } catch (err) {
      setErreur(err.statut === 401 ? 'Identifiant ou mot de passe incorrect.' : err.message)
    } finally {
      setEnCours(false)
    }
  }

  return (
    <>
    <Bandeau surtitre="Démonstration" titre="Connexion à Fil d'Or">
      Choisissez votre espace : le formulaire est déjà rempli pour ce rôle, il ne reste qu'à cliquer sur « Se connecter ».
      Toutes les données sont fictives.
    </Bandeau>
    <main className="page connexion-page">

      <div className="grille-deux connexion-grille">
        <form className="carte connexion-form" onSubmit={envoyerFormulaire}>
          <h2>Se connecter</h2>
          <p className="petit">Espace choisi : <b>{compte.role}</b> — {compte.lieu}. Les champs sont pré-remplis pour la démonstration ; vous pouvez les modifier (par exemple <code>agent.golfe</code> avec le même mot de passe).</p>
          {erreur && <p className="erreur" role="alert">{erreur}</p>}
          <label>Identifiant
            <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
          </label>
          <label>Mot de passe
            <input type="password" value={mdp} onChange={(e) => setMdp(e.target.value)} autoComplete="current-password" required />
          </label>
          <button className="bouton" disabled={enCours}>{enCours ? 'Connexion…' : 'Se connecter'}</button>
        </form>

        <section>
          <h2 className="choix-espace-titre">Choisir un espace</h2>
          <div className="comptes">
            {COMPTES.map((c) => (
              <button key={c.id} type="button" className={`compte ${choisi === c.id ? 'choisi' : ''}`} onClick={() => choisir(c)}>
                <span className="compte-icone"><c.Icone /></span>
                <span>
                  <b>{c.role}</b>
                  <span>{c.lieu} — {c.detail}</span>
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>

      <section className="carte entree-locale">
        <h2>Pas de réseau ici ?</h2>
        <p>Entrez quand même : vous pouvez inscrire des familles et saisir des visites. Tout reste sur cet appareil, puis part dans la base par clé USB ou dès que vous vous connectez avec du réseau.</p>
        <div className="formulaire-ligne">
          <label>Ma zone de travail
            <select value={zoneLocale} onChange={(e) => setZoneLocale(e.target.value)}>
              {ZONES.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
            </select>
          </label>
        </div>
        <button type="button" className="bouton secondaire" onClick={() => { entrerLocal(zoneLocale); navigate('/agent', { replace: true }) }}>Entrer sans réseau</button>
      </section>
    </main>
    </>
  )
}
