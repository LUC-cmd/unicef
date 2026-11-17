import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { IconeAgent, IconeBouclier, IconeCarnet, IconeZone } from '../components/Icones.jsx'
import { useAuth } from '../lib/contexte.jsx'
import Bandeau from '../components/Bandeau.jsx'

import { MDP_DEMO } from '../lib/config.js'
import { ZONES } from '../lib/format.js'

const COMPTES = [
  { id: 'admin', role: 'Administrateur', lieu: 'Toute la plateforme', detail: 'Les quatre services, les comptes, l’horloge de démonstration.', cible: '/admin', Icone: IconeBouclier },
  { id: 'agent.vo', role: 'Agent de santé', lieu: 'Vo, zone rurale', detail: 'Visites à faire en premier, saisie hors ligne, inscription des familles.', cible: '/agent', Icone: IconeAgent },
  { id: 'agent.golfe', role: 'Agent de santé', lieu: 'Golfe', detail: 'Le même tableau de bord, limité à la zone du Golfe.', cible: '/agent', Icone: IconeAgent },
  { id: 'mairie', role: "Agent d'état civil", lieu: 'Mairie', detail: 'Déclarations de naissance déjà remplies, à valider ou à renvoyer.', cible: '/mairie', Icone: IconeCarnet },
  { id: 'structure.golfe', role: 'Centre de santé', lieu: 'Golfe', detail: 'Demandes des familles, horaires, fiche publique.', cible: '/structure', Icone: IconeBouclier },
  { id: 'decideur', role: 'Responsable régional', lieu: 'Région Maritime', detail: 'Carte des zones, sans nom d’enfant.', cible: '/carte', Icone: IconeZone },
]

export default function Connexion() {
  const { connexion, entrerLocal } = useAuth()
  const [zoneLocale, setZoneLocale] = useState(ZONES[0][0])
  const navigate = useNavigate()
  const lieu = useLocation()
  const [enCours, setEnCours] = useState(null)
  const [erreur, setErreur] = useState('')
  const [compte, setCompte] = useState(COMPTES[0])
  const [username, setUsername] = useState(COMPTES[0].id)
  const [mdp, setMdp] = useState(MDP_DEMO)
  const [voirMdp, setVoirMdp] = useState(false)

  function choisir(c) {
    setCompte(c)
    setUsername(c.id)
    setMdp(MDP_DEMO)
    setErreur('')
  }

  async function entrer(id, motDePasse, cible) {
    setErreur('')
    setEnCours(id)
    try {
      await connexion(id, motDePasse)
      navigate('/preparation', { replace: true, state: { cible: lieu.state?.depuis && cible && lieu.state.depuis.startsWith(cible) ? lieu.state.depuis : cible } })
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
    <Bandeau surtitre="Tableaux de bord" titre="Entrer dans Fil d'Or">
      L'identifiant et le mot de passe sont déjà saisis. Choisissez un tableau de bord, affichez le mot de passe si vous voulez le lire, puis cliquez sur Se connecter.
    </Bandeau>
    <main className="page connexion-page">

      {erreur && <p className="erreur" role="alert">{erreur}</p>}

      <section className="carte connexion-saisie">
        <div>
          <p className="surtitre">Compte prêt</p>
          <h2>{compte.role}</h2>
          <p>{compte.lieu}. {compte.detail}</p>
        </div>
        <form onSubmit={envoyerFormulaire}>
          <label>Identifiant
            <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
          </label>
          <label className="champ-secret">Mot de passe
            <input type={voirMdp ? 'text' : 'password'} value={mdp} onChange={(e) => setMdp(e.target.value)} autoComplete="current-password" required />
            <button type="button" className="voir-mdp" onClick={() => setVoirMdp((v) => !v)}>{voirMdp ? 'Masquer' : 'Voir'}</button>
          </label>
          <button className="bouton" disabled={enCours !== null}>{enCours ? 'Connexion…' : 'Se connecter'}</button>
        </form>
      </section>

      <div className="comptes-grille">
        {COMPTES.map((c) => (
          <button key={c.id} type="button" className={`compte-carte${compte.id === c.id ? ' choisi' : ''}`} aria-pressed={compte.id === c.id} disabled={enCours !== null} onClick={() => choisir(c)}>
            <span className="icone"><c.Icone /></span>
            <span className="texte">
              <b>{c.role}</b>
              <em>{c.lieu}</em>
              <span>{c.detail}</span>
            </span>
            <span className="entrer">{compte.id === c.id ? 'Sélectionné' : 'Choisir'}</span>
          </button>
        ))}
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
