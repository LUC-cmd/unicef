import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { IconeAgent, IconeBouclier, IconeCarnet, IconeZone } from '../components/Icones.jsx'
import { useAuth } from '../lib/contexte.jsx'

import { MDP_DEMO } from '../lib/config.js'
import { api, definirSecretFamille } from '../lib/api.js'
import { ecrireCompte } from '../lib/famille.js'
import { ZONES } from '../lib/format.js'

function IconeCroix() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d="M4 21V8l8-5 8 5v13zM12 9v6M9 12h6" /></svg> }
function IconeReglage() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d="M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M6 14v6" /></svg> }

const COMPTES = [
  { id: 'agent.vo', role: 'Agent de santé', lieu: 'Vo, zone rurale', detail: 'Visite les familles, saisit les données de santé, inscrit les nouveaux-nés, suit les vaccinations.', cible: '/agent', Icone: IconeAgent },
  { id: 'mairie', role: "Agent d'état civil", lieu: 'Mairie', detail: 'Enregistre les déclarations de naissance, délivre les actes de naissance.', cible: '/mairie', Icone: IconeCarnet },
  { id: 'structure.golfe', role: 'Centre de santé', lieu: 'Golfe', detail: 'Répond aux demandes de rappel de vaccination, d’orientation vers les services, met à jour ses horaires.', cible: '/structure', Icone: IconeCroix },
  { id: 'creche.golfe', role: 'Crèche', lieu: 'Crèche communautaire du Golfe', detail: 'Valide les réservations des familles, voit les enfants présents, tient ses horaires et sa capacité, et trouve sa mallette : jeux par âge, menu, hygiène, signes d’alerte.', cible: '/structure', Icone: IconeCroix },
  { id: 'famille', role: 'Famille', lieu: 'Famille de démonstration', detail: 'Ce que voit une maman : le fil d’or de ses enfants, ses rappels, les crèches proches, le dossier de naissance. Aucun mot de passe : on entre directement.', cible: '/famille', Icone: IconeCarnet, famille: true },
  { id: 'decideur', role: 'Responsable régional', lieu: 'Région Maritime', detail: 'Voir la carte des zones oubliées, décider où envoyer une équipe en priorité.', cible: '/carte', Icone: IconeZone },
  { id: 'admin', role: 'Administrateur', lieu: 'Démonstration', detail: 'Gère les comptes, les messages, les clés USB, fait avancer le temps pour tester.', cible: '/admin', Icone: IconeReglage },
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

  async function entrerFamille() {
    setErreur(''); setEnCours(true)
    try {
      definirSecretFamille('')
      const profil = await api.post('/api/public/famille/connexion', { telephone: '90000001', codeFamille: 'F-0001' })
      if (!Array.isArray(profil?.enfants)) throw new Error('Réponse inattendue du serveur')
      ecrireCompte({ telephone: '90000001', codeFamille: 'F-0001', secret: 'demo' })
      navigate('/famille', { replace: true })
    } catch {
      // Le serveur de démonstration ne répond pas : on ouvre une famille fictive de secours, pour que la démonstration continue.
      ecrireCompte({ telephone: '90000001', codeFamille: 'F-0001', secret: 'demo', secours: true })
      navigate('/famille', { replace: true })
    } finally { setEnCours(false) }
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
    <main className="cx">
      <aside className="cx-visuel" aria-hidden="true">
        <svg viewBox="0 0 400 300" className="cx-fil" preserveAspectRatio="xMidYMid slice">
          <path className="cx-trait" d="M40 40 C 200 0 330 20 320 95 S 80 120 110 170 S 330 200 300 255" fill="none" stroke="#FFC20E" strokeWidth="4" strokeLinecap="round" />
          {[[40, 40], [320, 95], [110, 170], [300, 255]].map(([x, y], i) => (
            <circle key={i} className="cx-noeud" style={{ '--i': i }} cx={x} cy={y} r="11" fill="#fff" stroke="#FFC20E" strokeWidth="5" />
          ))}
        </svg>
        <div className="cx-visuel-texte">
          <p className="cx-marque">Fil d'Or</p>
          <h2>Un fil d'or pour chaque enfant, de la grossesse à 5 ans.</h2>
          <ul>
            <li><span><IconeBouclier /></span>Aucun nom, aucune photo : des codes</li>
            <li><span><IconeZone /></span>Chaque agent voit sa zone</li>
            <li><span><IconeCarnet /></span>Fonctionne aussi sans réseau</li>
          </ul>
        </div>
      </aside>

      <section className="cx-panneau">
        <div className="cx-carte">
          <h1>Connexion</h1>
          <p className="cx-sous">Choisissez votre espace, puis entrez vos identifiants. Les comptes ci-dessous sont des comptes de démonstration : un clic les pré-remplit.</p>

          <div className="cx-roles" role="radiogroup" aria-label="Votre espace">
            {COMPTES.map((c) => (
              <button key={c.id} type="button" role="radio" aria-checked={choisi === c.id}
                      className={`cx-role${choisi === c.id ? ' actif' : ''}`} onClick={() => choisir(c)}>
                <span className="cx-role-icone"><c.Icone /></span>
                <span className="cx-role-texte"><b>{c.role}</b><small>{c.lieu}</small></span>
              </button>
            ))}
          </div>
          {compte && <p className="cx-detail" key={compte.id}>{compte.detail}</p>}
          {compte?.famille && <button type="button" className="bouton cx-envoi" disabled={enCours} onClick={entrerFamille}>{enCours ? 'Ouverture…' : 'Voir l’espace famille'}</button>}

          <form className="cx-form" onSubmit={envoyerFormulaire} style={compte?.famille ? { display: 'none' } : undefined}>
            {erreur && <p className="erreur" role="alert">{erreur}</p>}
            <label>Identifiant
              <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required placeholder="ex. agent.vo" />
            </label>
            <label>Mot de passe
              <span className="mdp-champ">
                <input type={mdpVisible ? 'text' : 'password'} value={mdp} onChange={(e) => setMdp(e.target.value)} autoComplete="current-password" required placeholder="Votre mot de passe" />
                <button type="button" className="mdp-oeil" onClick={() => setMdpVisible((v) => !v)} aria-pressed={mdpVisible}
                        aria-label={mdpVisible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} title={mdpVisible ? 'Masquer' : 'Afficher'}>
                  {mdpVisible ? <IconeOeilBarre /> : <IconeOeil />}
                </button>
              </span>
            </label>
            <button className="bouton cx-envoi" disabled={enCours}>{enCours ? 'Connexion…' : 'Se connecter'}</button>
          </form>

          <div className="cx-local">
            <h2>Pas de réseau ici ?</h2>
            <p>Entrez quand même : inscrivez des familles et saisissez des visites. Tout reste sur cet appareil, puis part par clé USB ou dès que le réseau revient.</p>
            <div className="cx-local-ligne">
              <label>Ma zone de travail
                <select value={zoneLocale} onChange={(e) => setZoneLocale(e.target.value)}>
                  {ZONES.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
                </select>
              </label>
              <button type="button" className="bouton secondaire" onClick={() => { entrerLocal(zoneLocale); navigate('/agent', { replace: true }) }}>Entrer sans réseau</button>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

function IconeOeil() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" />
    </svg>
  )
}
function IconeOeilBarre() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.5 6.6C3.8 8.4 2 12 2 12s3.6 7 10 7c1.7 0 3.2-.4 4.5-1M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  )
}
