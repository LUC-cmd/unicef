import { useEffect, useState } from 'react'
import { Link, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './lib/contexte.jsx'
import { EspaceAdmin, EspaceAgent, EspaceDecideur, EspaceMairie, EspaceStructure } from './pages/Espaces.jsx'
import Visite from './pages/Visite.jsx'
import HorsReseau from './pages/HorsReseau.jsx'
import Adolescents from './pages/Adolescents.jsx'
import Signalement from './pages/Signalement.jsx'
import Accueil from './pages/Accueil.jsx'
import Connexion from './pages/Connexion.jsx'
import Telephone from './pages/Telephone.jsx'
import Carnet from './pages/Carnet.jsx'
import Annuaire from './pages/Annuaire.jsx'
import Ecoute from './pages/Ecoute.jsx'
import Assistant from './pages/Assistant.jsx'
import Projet from './pages/Projet.jsx'
import Jeux from './pages/Jeux.jsx'
import Fonctionnement from './pages/Fonctionnement.jsx'
import { ANCRES_PROJET } from './lib/ancres.js'
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
  const dansEspace = /^\/(agent|mairie|carte|structure|admin)(\/|$)/.test(lieu.pathname)
  const peut = (page) => session && ROLES_PAR_PAGE[page].includes(session.role)
  
  // Ferme le menu mobile et remonte en haut à chaque changement de page
  useEffect(() => { setMenuOuvert(false); window.scrollTo(0, 0) }, [lieu.pathname])

  // Hauteur de l'en-tête collant : les barres d'ancres des pages se calent juste dessous.
  useEffect(() => {
    const bloc = document.querySelector('.entete-bloc')
    if (!bloc) return undefined
    const mesurer = () => document.documentElement.style.setProperty('--haut-entete', `${bloc.offsetHeight}px`)
    mesurer()
    const obs = new ResizeObserver(mesurer)
    obs.observe(bloc)
    return () => obs.disconnect()
  })

  return (
    <div className="coque">
      <a className="lien-evitement" href="#contenu">Aller au contenu</a>
      <div className={`entete-bloc no-print ${menuOuvert ? 'ouvert' : ''}`}>
        <header className="entete">
          <div className="interieur">
            <Link to="/" className="logo" aria-label="Fil d'Or, accueil"><Logo /></Link>
            <button className="menu-bouton" aria-expanded={menuOuvert} aria-controls="navigation" onClick={() => setMenuOuvert((o) => !o)}>
              <IconeMenu /> Menu
            </button>
            <nav id="navigation" className="nav-principale" aria-label="Navigation principale">
              <NavLink to="/projet">Le projet</NavLink>
              <NavLink to="/visite">Essayer</NavLink>
              <NavLink to="/hors-reseau">Hors réseau</NavLink>
              <NavLink to="/assistant">Assistant</NavLink>
              <NavLink to="/jeux">Jeux</NavLink>
              {!session && <Link className="bouton-entete" to="/connexion">Se connecter</Link>}
            </nav>
          </div>
        </header>
        {session && !dansEspace && (
          <div className="espace-pro">
            <div className="interieur">
              <span className="espace-titre">{LIBELLE_ROLE[session.role] ?? 'Espace professionnel'}</span>
              <nav aria-label="Espace professionnel">
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
        {lieu.pathname === '/projet' && (
          <nav className="barre-ancres sous-entete" aria-label="Sur cette page">
            <div className="ancres">
              {ANCRES_PROJET.map(([id, nom]) => <a key={id} href={`#${id}`}>{nom}</a>)}
            </div>
          </nav>
        )}
      </div>

      <div className="contenu" id="contenu">
        <Routes>
          <Route path="/" element={<Accueil />} />
          <Route path="/projet" element={<Projet />} />
          <Route path="/connexion" element={<Connexion />} />
          <Route path="/telephone" element={<Telephone />} />
          <Route path="/ecoute" element={<Ecoute />} />
          <Route path="/assistant" element={<Assistant />} />
          <Route path="/annuaire" element={<Annuaire />} />
          <Route path="/fonctionnement" element={<Fonctionnement />} />
          <Route path="/visite" element={<Visite />} />
          <Route path="/hors-reseau" element={<HorsReseau />} />
          <Route path="/adolescents" element={<Adolescents />} />
          <Route path="/signalement" element={<Signalement />} />
          <Route path="/jeux" element={<Jeux />} />
          <Route path="/jeux/:jeu" element={<Jeux />} />
          <Route path="/agent/*" element={<Protegee page="agent"><EspaceAgent /></Protegee>} />
          <Route path="/structure/*" element={<Protegee page="structure"><EspaceStructure /></Protegee>} />
          <Route path="/mairie/*" element={<Protegee page="mairie"><EspaceMairie /></Protegee>} />
          <Route path="/carte/*" element={<Protegee page="carte"><EspaceDecideur /></Protegee>} />
          <Route path="/admin/*" element={<Protegee page="admin"><EspaceAdmin /></Protegee>} />
          <Route path="/carnet/:code" element={<Protegee page="agent"><Carnet /></Protegee>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>

      <footer className="pied no-print">
        <div className="pied-interieur">
          <div className="pied-ligne">
            <Link to="/" className="logo" aria-label="Fil d'Or, accueil"><Logo /></Link>
            <nav className="pied-liens" aria-label="Liens du site">
              <Link to="/projet">Le projet</Link>
              <Link to="/fonctionnement">Fonctionnement</Link>
              <Link to="/visite">Essayer</Link>
              <Link to="/hors-reseau">Hors réseau</Link>
              <Link to="/jeux">Jeux</Link>
              <Link to="/annuaire">Annuaire</Link>
              <Link to="/adolescents">Adolescents</Link>
              <Link to="/signalement">Situation inquiétante</Link>
            </nav>
          </div>
          <p className="pied-legal">
            Aucun nom, aucune photo, aucune adresse · Loi n° 2019-014 du 29 octobre 2019 · Fil d'Or informe et oriente, il ne pose aucun
            diagnostic · Version de démonstration, données fictives · Projet candidat au concours Hack4Children Togo 2026, pas un service
            officiel de l'UNICEF · © 2026 Fil d'Or
          </p>
        </div>
      </footer>
    </div>
  )
}
