import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { IconeAgent, IconeBouclier, IconeCarnet, IconeZone } from '../components/Icones.jsx'
import { useAuth } from '../lib/contexte.jsx'
import Bandeau from '../components/Bandeau.jsx'

import { MDP_DEMO } from '../lib/config.js'
import { ZONES } from '../lib/format.js'

const COMPTES = [
  { id: 'agent.vo', role: 'Agent de santé', lieu: 'Vo, zone rurale', detail: 'Visite les familles, saisit les données de santé, inscrit les nouveaux-nés, suit les vaccinations.', cible: '/agent', Icone: IconeAgent },
  { id: 'mairie', role: "Agent d'état civil", lieu: 'Mairie', detail: 'Enregistre les déclarations de naissance, délivre les actes de naissance.', cible: '/mairie', Icone: IconeCarnet },
  { id: 'structure.golfe', role: 'Centre de santé', lieu: 'Golfe', detail: 'Répond aux demandes de rappel de vaccination, d’orientation vers les services, met à jour ses horaires.', cible: '/structure', Icone: IconeBouclier },
  { id: 'decideur', role: 'Responsable régional', lieu: 'Région Maritime', detail: 'Voir la carte des zones oubliées, décider où envoyer une équipe en priorité.', cible: '/carte', Icone: IconeZone },
  { id: 'admin', role: 'Administrateur', lieu: 'Démonstration', detail: 'Gère les comptes, les messages, les clés USB, fait avancer le temps pour tester.', cible: '/admin', Icone: IconeBouclier },
]

export default function Connexion() {
  const { connexion, entrerLocal } = useAuth()
  const [zoneLocale, setZoneLocale] = useState(ZONES[0][0])
  const navigate = useNavigate()
  const lieu = useLocation()
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState('')
  const [choisi, setChoisi] = useState(null)
  const compte = COMPTES.find((c) => c.id === choisi)
  const [username, setUsername] = useState('')
  const [mdp, setMdp] = useState('')
  const [mdpVisible, setMdpVisible] = useState(false)

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
    <main className="page connexion-page">
      <section className="carte connexion-centre">
        <h1>Connexion à Fil d'Or</h1>
        <p className="petit">Choisissez votre espace : le formulaire sera rempli automatiquement, il ne reste qu'à cliquer sur « Se connecter ».</p>

        {!choisi ? (
          <>
            <h2 className="choix-espace-titre">Choisir un espace</h2>
            <div className="comptes">
              {COMPTES.map((c) => (
                <button key={c.id} type="button" className="compte" onClick={() => choisir(c)}>
                  <span className="compte-icone"><c.Icone /></span>
                  <span>
                    <b>{c.role}</b>
                    <span>{c.lieu}</span>
                    <small>{c.detail}</small>
                  </span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <form className="connexion-form" onSubmit={envoyerFormulaire}>
            <button type="button" className="lien-bouton" onClick={() => { setChoisi(null); setUsername(''); setMdp(''); setErreur('') }}>← Changer d'espace</button>
            <h2>Se connecter comme <b>{compte.role}</b></h2>
            <p className="petit">Espace : {compte.lieu}. Les champs sont pré-remplis pour la démonstration.</p>
            {erreur && <p className="erreur" role="alert">{erreur}</p>}
            <label>Identifiant
              <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
            </label>
            <label>Mot de passe
              <div className="mdp-champ">
                <input type={mdpVisible ? 'text' : 'password'} value={mdp} onChange={(e) => setMdp(e.target.value)} autoComplete="current-password" required />
                <button type="button" className="mdp-oeil" onClick={() => setMdpVisible((v) => !v)} aria-label={mdpVisible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
                  {mdpVisible ? '🙈' : '👁️'}
                </button>
              </div>
            </label>
            <button className="bouton" disabled={enCours}>{enCours ? 'Connexion…' : 'Se connecter'}</button>
          </form>
        )}
      </section>

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
