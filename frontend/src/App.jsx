import { useEffect, useState } from 'react'
import { Link, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './lib/contexte.jsx'
import Accueil from './pages/Accueil.jsx'
import Connexion from './pages/Connexion.jsx'
import Telephone from './pages/Telephone.jsx'
import Agent from './pages/Agent.jsx'
import Mairie from './pages/Mairie.jsx'
import Carte from './pages/Carte.jsx'
import Carnet from './pages/Carnet.jsx'
import Admin from './pages/Admin.jsx'
import Annuaire from './pages/Annuaire.jsx'
import Ecoute from './pages/Ecoute.jsx'
import Assistant from './pages/Assistant.jsx'
import Inscription from './pages/Inscription.jsx'
import Structure from './pages/Structure.jsx'
import Projet from './pages/Projet.jsx'
import Jeux from './pages/Jeux.jsx'
import Fonctionnement from './pages/Fonctionnement.jsx'
import Tableau from './pages/Tableau.jsx'
import Logo from './components/Logo.jsx'
import { IconeMenu } from './components/Icones.jsx'

const LIBELLE_ROLE = {
  AGENT: 'Agent de santé',
  MAIRIE: "État civil",
  DECIDEUR: 'Responsable régional',
  STRUCTURE: 'Structure',
  ADMIN: 'Administrateur',
}

const ROLES_PAR_PAGE = {
  agent: ['AGENT', 'ADMIN'],
  mairie: ['MAIRIE', 'ADMIN'],
  carte: ['DECIDEUR', 'ADMIN'],
  structure: ['STRUCTURE'],
  admin: ['ADMIN'],
}

function Connecte({ children }) {
  const { session } = useAuth()
  const lieu = useLocation()
  if (!session) return <Navigate to="/connexion" state={{ depuis: lieu.pathname }} replace />
  return children
}

function Protegee({ page, children }) {
  const { session } = useAuth()
  const lieu = useLocation()
  if (!session) return <Navigate to="/connexion" state={{ depuis: lieu.pathname }} replace />
  if (!ROLES_PAR_PAGE[page].includes(session.role)) {
    return (
      <main className="page etroite">
        <h1>Accès réservé</h1>
        <div className="carte">
          <p>Votre compte ({LIBELLE_ROLE[session.role] ?? session.role}) n'a pas accès à cette page.</p>
          <Link className="bouton secondaire" to="/">Retour à l'accueil</Link>
        </div>
      </main>
    )
  }
  return children
}

export default function App() {
  const { session, deconnexion } = useAuth()
  const lieu = useLocation()
  const [menuOuvert, setMenuOuvert] = useState(false)
  const peut = (page) => session && ROLES_PAR_PAGE[page].includes(session.role)
  
  // Ferme le menu mobile et remonte en haut à chaque changement de page
  useEffect(() => { setMenuOuvert(false); window.scrollTo(0, 0) }, [lieu.pathname])

  return (
    <div className="coque">
      <a className="lien-evitement" href="#contenu">Aller au contenu</a>
      <div className={`entete-bloc no-print ${menuOuvert ? 'ouvert' : ''}`}>
        <div className="barre-haute">
          <div className="interieur">
            <span>Hack4Children Togo 2026</span>
            <span>Démonstration · données fictives · aucun diagnostic</span>
          </div>
        </div>
        <header className="entete">
          <div className="interieur">
            <Link to="/" className="logo" aria-label="Fil d'Or, accueil"><Logo /></Link>
            <button className="menu-bouton" aria-expanded={menuOuvert} aria-controls="navigation" onClick={() => setMenuOuvert((o) => !o)}>
              <IconeMenu /> Menu
            </button>
            <nav id="navigation" className="nav-principale" aria-label="Navigation principale">
              <NavLink to="/projet">Le projet</NavLink>
              <NavLink to="/fonctionnement">Fonctionnement</NavLink>
              <NavLink to="/jeux">Jeux</NavLink>
              <NavLink to="/telephone">Téléphone</NavLink>
              <NavLink to="/annuaire">Annuaire</NavLink>
              {session
                ? <NavLink className="bouton-entete" to="/tableau">Tableau de bord</NavLink>
                : <Link className="bouton-entete" to="/connexion">Se connecter</Link>}
            </nav>
          </div>
        </header>
        {session && (
          <div className="espace-pro">
            <div className="interieur">
              <span className="espace-titre">{LIBELLE_ROLE[session.role] ?? 'Espace professionnel'}</span>
              <nav aria-label="Espace professionnel">
                <NavLink to="/tableau">Tableau de bord</NavLink>
                {peut('agent') && <NavLink to="/agent" end>Mes visites</NavLink>}
                {peut('agent') && <NavLink to="/agent/inscription">Inscrire une famille</NavLink>}
                {peut('mairie') && <NavLink to="/mairie">Déclarations de naissance</NavLink>}
                {peut('carte') && <NavLink to="/carte">Carte des zones</NavLink>}
                {peut('structure') && <NavLink to="/structure">Ma structure</NavLink>}
                {peut('admin') && <NavLink to="/mairie">État civil</NavLink>}
                {peut('admin') && <NavLink to="/carte">Carte</NavLink>}
                {peut('admin') && <NavLink to="/admin">Coulisses</NavLink>}
              </nav>
              <div className="session">
                <div className="qui"><b>{session.nomComplet}</b></div>
                <button className="bouton secondaire petit-bouton" onClick={deconnexion}>Se déconnecter</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="contenu" id="contenu">
        <Routes>
          <Route path="/" element={<Accueil />} />
          <Route path="/projet" element={<Projet />} />
          <Route path="/connexion" element={<Connexion />} />
          <Route path="/tableau" element={<Connecte><Tableau /></Connecte>} />
          <Route path="/telephone" element={<Telephone />} />
          <Route path="/ecoute" element={<Ecoute />} />
          <Route path="/assistant" element={<Assistant />} />
          <Route path="/annuaire" element={<Annuaire />} />
          <Route path="/fonctionnement" element={<Fonctionnement />} />
          <Route path="/jeux" element={<Jeux />} />
          <Route path="/jeux/:jeu" element={<Jeux />} />
          <Route path="/agent" element={<Protegee page="agent"><Agent /></Protegee>} />
          <Route path="/agent/inscription" element={<Protegee page="agent"><Inscription /></Protegee>} />
          <Route path="/structure" element={<Protegee page="structure"><Structure /></Protegee>} />
          <Route path="/carnet/:code" element={<Protegee page="agent"><Carnet /></Protegee>} />
          <Route path="/mairie" element={<Protegee page="mairie"><Mairie /></Protegee>} />
          <Route path="/carte" element={<Protegee page="carte"><Carte /></Protegee>} />
          <Route path="/admin" element={<Protegee page="admin"><Admin /></Protegee>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>

      <footer className="pied no-print">
        <div className="pied-interieur">
          <div className="pied-grille">
            <div>
              <Link to="/" className="logo" aria-label="Fil d'Or, accueil"><Logo fond="#164863" /></Link>
              <p>Un seul carnet pour suivre chaque enfant de la grossesse à 5 ans : santé, nutrition, état civil, services sociaux et éveil.</p>
            </div>
            <div>
              <h2>Découvrir</h2>
              <ul>
                <li><Link to="/projet">Le projet</Link></li>
                <li><Link to="/fonctionnement">Fonctionnement et preuve de naissance</Link></li>
                <li><Link to="/jeux">Jeux pour les enfants</Link></li>
                <li><Link to="/telephone">Simulateur de téléphone</Link></li>
                <li><Link to="/annuaire">Annuaire des structures</Link></li>
                <li><Link to="/ecoute">Point d'écoute</Link></li>
                <li><Link to="/assistant">Poser une question</Link></li>
              </ul>
            </div>
            <div>
              <h2>Espaces professionnels</h2>
              <ul>
                <li><Link to="/connexion">Agent de santé</Link></li>
                <li><Link to="/connexion">État civil</Link></li>
                <li><Link to="/connexion">Structure d'accueil</Link></li>
                <li><Link to="/connexion">Responsable régional</Link></li>
              </ul>
            </div>
            <div>
              <h2>Protection</h2>
              <ul>
                <li>Aucun nom, aucune photo, aucune adresse</li>
                <li>Accord de la famille avant tout suivi</li>
                <li>Accès par rôle et par zone, journal des consultations</li>
                <li>Loi n° 2019-014 du 29 octobre 2019</li>
              </ul>
            </div>
          </div>
          <div className="pied-bas">
            <p>
              Fil d'Or informe et oriente, il ne pose aucun diagnostic. Les contenus de santé et le calendrier vaccinal
              doivent être validés par des professionnels avant tout usage réel. Projet candidat au concours Hack4Children Togo 2026,
              version de démonstration : toutes les données sont fictives. Ce n'est pas un service officiel de l'UNICEF.
            </p>
            <span>© 2026 Fil d'Or</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
