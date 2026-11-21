import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { IconeAgent, IconeBouclier, IconeCarnet, IconeZone } from '../components/Icones.jsx'
import { useAuth } from '../lib/contexte.jsx'

import { MDP_DEMO } from '../lib/config.js'
import { api, definirSecretFamille } from '../lib/api.js'
import { ecrireCompte } from '../lib/famille.js'
import { entrerFille } from '../lib/fille.js'
import { ZONES } from '../lib/format.js'
import { ecrireSessionReseau, reseau } from '../lib/reseauClient.js'

function IconeCroix() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d="M4 21V8l8-5 8 5v13zM12 9v6M9 12h6" /></svg> }
function IconeReglage() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d="M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M6 14v6" /></svg> }

const COMPTES = [
  { id: 'agent.vo', role: 'Agent de santé', lieu: 'Vo, zone rurale', detail: 'Visite les familles, saisit les données de santé, inscrit les nouveaux-nés, suit les vaccinations.', cible: '/agent', Icone: IconeAgent },
  { id: 'mairie', role: "Agent d'état civil", lieu: 'Mairie', detail: 'Enregistre les déclarations de naissance, délivre les actes de naissance.', cible: '/mairie', Icone: IconeCarnet },
  { id: 'structure.golfe', role: 'Centre de santé', lieu: 'Golfe', detail: 'Répond aux demandes de rappel de vaccination, d’orientation vers les services, met à jour ses horaires.', cible: '/structure', Icone: IconeCroix },
  { id: 'creche.golfe', role: 'Crèche', lieu: 'Crèche communautaire du Golfe', detail: 'Valide les réservations des familles, voit les enfants présents, tient ses horaires et sa capacité, et trouve sa mallette : jeux par âge, menu, hygiène, signes d’alerte.', cible: '/structure', Icone: IconeCroix },
  { id: 'famille', role: 'Famille', lieu: 'Famille de démonstration', detail: 'Ce que voit une maman : le fil d’or de ses enfants, ses rappels, les crèches proches, le dossier de naissance. Aucun mot de passe : on entre directement.', cible: '/famille', Icone: IconeCarnet, famille: true },
  { id: 'fille.demo', role: 'Jeune fille', lieu: 'Compte personnel, sans nom', detail: 'Poser ses questions en privé, recevoir un conseil, puis aller à la borne avec son code pour retirer ses produits. Aucun mot de passe en démonstration : on entre directement.', cible: '/fille', Icone: IconeCarnet, fille: true },
  { id: 'boutique.agbele', role: 'Boutique partenaire', lieu: 'Agbélé', detail: 'Ajoute ses produits pour les enfants, les femmes enceintes et les jeunes filles, suit les demandes des familles et ses contrôles. Un agent de santé valide les produits.', cible: '/reseau', Icone: IconeCroix, reseau: true },
  { id: 'agent.nutrition', role: 'Agent de santé, nutrition', lieu: 'Réseau nutrition', detail: 'Valide les produits des boutiques, prévoit les visites, contrôle les boutiques et répond aux questions anonymes des jeunes filles.', cible: '/reseau', Icone: IconeAgent, reseau: true },
  { id: 'centre.davie', role: 'Hôpital : cas qui arrivent', lieu: 'Hôpital de Davié', detail: 'Voit arriver les cas urgents annoncés par les agents, les bornes et les téléphones, les urgences en premier.', cible: '/reseau', Icone: IconeCroix, reseau: true },
  { id: 'district.togo', role: 'Responsable de district', lieu: 'District de démonstration', detail: 'Crée les villages, centres, hôpitaux, crèches et écoles, ouvre les accès (code d’activation), suit références, retards et manques, et envoie les agents où il faut.', cible: '/reseau', Icone: IconeZone, reseau: true },
  { id: 'national.togo', role: 'Responsable national', lieu: 'Togo, toutes les régions', detail: 'Voit le pays entier : vaccination, nutrition, santé de la mère et de l’enfant, éveil, jeunes filles, région par région, avec l’évolution sur 6 mois et les reculs. Aucun nom d’enfant.', cible: '/reseau', Icone: IconeBouclier, reseau: true },
  { id: 'centre.agbele', role: 'Centre de santé de village', lieu: 'Agbélé', detail: 'Reçoit les cas annoncés par les agents et les écoles avant l’arrivée du patient, avec l’itinéraire, et marque l’arrivée puis la prise en charge.', cible: '/reseau', Icone: IconeCroix, reseau: true },
  { id: 'ecole.agbele', role: 'Jardin d’enfants et école maternelle', lieu: 'Agbélé', detail: 'Présences, éveil et apprentissage (4 domaines), signalement d’un enfant au centre le plus proche. Aucun nom, des codes.', cible: '/reseau', Icone: IconeCarnet, reseau: true },
  { id: 'ecole.davie', role: 'École primaire', lieu: 'École primaire de Davié', detail: 'Présences, suivi des élèves de 6 à 11 ans, signalement d’un enfant à l’hôpital de Davié. Aucun nom, des codes.', cible: '/reseau', Icone: IconeCarnet, reseau: true },
  { id: 'unicef.partenaire', role: 'Partenaire UNICEF', lieu: 'Lecture seule', detail: 'Voit le tableau national, l’état des bornes en totaux et télécharge un rapport. Ne peut rien modifier et ne voit aucune personne. Compte de démonstration : ce n’est pas un compte officiel de l’UNICEF.', cible: '/reseau', Icone: IconeBouclier, reseau: true },
  { id: 'technicien.borne', role: 'Technicien des bornes', lieu: 'Bornes du district', detail: 'Voit l’état de chaque borne (stock, relève, réseau), recharge, enregistre une relève même sans réseau et lit ce que disent les utilisatrices.', cible: '/reseau', Icone: IconeReglage, reseau: true },
  { id: 'decideur', role: 'Responsable régional', lieu: 'Région Maritime', detail: 'Voir la carte des zones oubliées, décider où envoyer une équipe en priorité.', cible: '/carte', Icone: IconeZone },
  { id: 'admin', role: 'Administrateur', lieu: 'Démonstration', detail: 'Gère les comptes, les messages, les clés USB, fait avancer le temps pour tester.', cible: '/admin', Icone: IconeReglage },
]

const GROUPES = [
  ['Pilotage', 'Voir le pays, la région, le district, décider', ['national.togo', 'unicef.partenaire', 'decideur', 'district.togo']],
  ['Santé', 'Soigner, orienter, visiter', ['agent.vo', 'agent.nutrition', 'structure.golfe', 'centre.agbele', 'centre.davie', 'technicien.borne']],
  ['Petite enfance et école', 'Éveil, présences, signalements', ['creche.golfe', 'ecole.agbele', 'ecole.davie']],
  ['Familles et jeunes filles', 'Un code, aucun nom', ['famille', 'fille.demo', 'boutique.agbele']],
  ['Administration', 'Naissances, comptes, démonstration', ['mairie', 'admin']],
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
      if (COMPTES.find((c) => c.id === id)?.reseau) {
        ecrireSessionReseau(await reseau.post('connexion', { identifiant: id, mdp }))
        navigate('/reseau', { replace: true })
        return
      }
      try { await connexion(id, mdp) } catch (e1) {
        if (e1.statut !== 401) throw e1
        // Pas un compte du serveur principal : on essaie les accès créés par un responsable (district, centre, école, agent).
        try { ecrireSessionReseau(await reseau.post('connexion', { identifiant: id, mdp })); navigate('/reseau', { replace: true }); return } catch { throw e1 }
      }
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

          {lieu.state?.sortie && <p className="succes" role="status">Vous êtes déconnecté. Vos données restent protégées.</p>}
          <div role="radiogroup" aria-label="Votre espace">
            {GROUPES.map(([titreG, aideG, ids]) => (
              <section key={titreG} className="cx-groupe">
                <h2>{titreG}<small>{aideG}</small></h2>
                <div className="cx-roles">
                  {ids.map((id) => COMPTES.find((x) => x.id === id)).filter(Boolean).map((c) => (
                    <button key={c.id} type="button" role="radio" aria-checked={choisi === c.id}
                            className={`cx-role${choisi === c.id ? ' actif' : ''}`} onClick={() => choisir(c)}>
                      <span className="cx-role-icone"><c.Icone /></span>
                      <span className="cx-role-texte"><b>{c.role}</b><small>{c.lieu}</small></span>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
          {compte && <p className="cx-detail" key={compte.id}>{compte.detail}</p>}
          {compte?.fille && <button type="button" className="bouton cx-envoi" onClick={() => { entrerFille(); navigate('/fille', { replace: true }) }}>Entrer dans mon espace</button>}
          {compte?.famille && <button type="button" className="bouton cx-envoi" disabled={enCours} onClick={entrerFamille}>{enCours ? 'Ouverture…' : 'Voir l’espace famille'}</button>}

          <form className="cx-form" onSubmit={envoyerFormulaire} style={compte?.famille || compte?.fille ? { display: 'none' } : undefined}>
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
            <button type="button" className="bouton secondaire" onClick={() => navigate('/reseau')}>Première connexion : activer mon accès</button>
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
