import { Suspense, lazy, useEffect, useState } from 'react'
import { Link, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth, useReseau } from './lib/contexte.jsx'
import Accueil from './pages/Accueil.jsx'
import Connexion from './pages/Connexion.jsx'
import { ANCRES_PROJET } from './lib/ancres.js'
import Chargement from './components/Chargement.jsx'
import Retours from './components/Retours.jsx'
import Logo from './components/Logo.jsx'
import { IconeMenu } from './components/Icones.jsx'

const Visite = lazy(() => import('./pages/Visite.jsx'))
const HorsReseau = lazy(() => import('./pages/HorsReseau.jsx'))
const Adolescents = lazy(() => import('./pages/Adolescents.jsx'))
const Signalement = lazy(() => import('./pages/Signalement.jsx'))
const Projet = lazy(() => import('./pages/Projet.jsx'))
const Jeux = lazy(() => import('./pages/Jeux.jsx'))
const Fonctionnement = lazy(() => import('./pages/Fonctionnement.jsx'))
const Telephone = lazy(() => import('./pages/Telephone.jsx'))
const Assistant = lazy(() => import('./pages/Assistant.jsx'))
const Ecoute = lazy(() => import('./pages/Ecoute.jsx'))
const ActeNaissance = lazy(() => import('./pages/ActeNaissance.jsx'))
const Annuaire = lazy(() => import('./pages/Annuaire.jsx'))
const Carnet = lazy(() => import('./pages/Carnet.jsx'))
const Preparation = lazy(() => import('./pages/Preparation.jsx'))
const espace = (nom) => lazy(() => import('./pages/Espaces.jsx').then((m) => ({ default: m[nom] })))
const EspaceAgent = espace('EspaceAgent')
const EspaceMairie = espace('EspaceMairie')
const EspaceStructure = espace('EspaceStructure')
const EspaceDecideur = espace('EspaceDecideur')
const EspaceAdmin = espace('EspaceAdmin')

const LIBELLE_ROLE = {
  AGENT: 'Agent de santé',
  MAIRIE: "État civil",
  DECIDEUR: 'Responsable régional',
  STRUCTURE: 'Structure',
  ADMIN: 'Administrateur',
}

const ACCUEIL_ROLE = { AGENT: '/agent', MAIRIE: '/mairie', DECIDEUR: '/carte', STRUCTURE: '/structure', ADMIN: '/admin' }

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
  const { enLigne } = useReseau()
  const lieu = useLocation()
  const [menuOuvert, setMenuOuvert] = useState(false)
  
  // Ferme le menu mobile et remonte en haut à chaque changement de page
  useEffect(() => {
    setMenuOuvert(false); window.scrollTo(0, 0)
    document.querySelectorAll('.menu-deroulant[open]').forEach((d) => d.removeAttribute('open'))
  }, [lieu.pathname])

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
              <details className="menu-deroulant">
                <summary>Ressources</summary>
                <div className="menu-liste">
                  <Link to="/fonctionnement">Fonctionnement et preuve de naissance</Link>
                  <Link to="/acte">Obtenir un acte de naissance</Link>
                  <Link to="/annuaire">Annuaire des structures</Link>
                  <Link to="/ecoute">Point d'écoute</Link>
                  <Link to="/telephone">Simulateur de téléphone</Link>
                  <Link to="/adolescents">Adolescents</Link>
                  <Link to="/signalement">Une situation inquiétante ?</Link>
                </div>
              </details>
              <NavLink to="/assistant">Assistant</NavLink>
              <NavLink to="/jeux">Jeux</NavLink>
              {!session && <span className={`etat-reseau-entete ${enLigne ? 'en' : 'hors'}`} role="status" title={enLigne ? 'Connecté au serveur' : 'Hors ligne : les saisies sont gardées sur cet appareil'}>
                <i aria-hidden="true" />{enLigne ? 'En ligne' : 'Hors ligne'}
              </span>}
              {!session && <Link className="bouton-entete" to="/connexion">Se connecter</Link>}
              {session && <Link className="bouton-entete" to={ACCUEIL_ROLE[session.role] ?? '/'}>Mon espace</Link>}
              {session && <button type="button" className="bouton-entete sortie" onClick={deconnexion}>Se déconnecter</button>}
            </nav>
          </div>
        </header>
        {lieu.pathname === '/projet' && (
          <nav className="barre-ancres sous-entete" aria-label="Sur cette page">
            <div className="ancres">
              {ANCRES_PROJET.map(([id, nom]) => <a key={id} href={`#${id}`}>{nom}</a>)}
            </div>
          </nav>
        )}
      </div>

      <div className="contenu" id="contenu">
        <Retours />
        <Suspense fallback={<Chargement texte="Ouverture de la page…" />}>
        <Routes>
          <Route path="/" element={<Accueil />} />
          <Route path="/preparation" element={<Preparation />} />
          <Route path="/projet" element={<Projet />} />
          <Route path="/connexion" element={<Connexion />} />
          <Route path="/telephone" element={<Telephone />} />
          <Route path="/ecoute" element={<Ecoute />} />
          <Route path="/assistant" element={<Assistant />} />
          <Route path="/annuaire" element={<Annuaire />} />
          <Route path="/acte" element={<ActeNaissance />} />
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
        </Suspense>
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
