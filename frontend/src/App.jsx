import BandeauAndroid from './components/BandeauAndroid.jsx'
import MenuProfil from './components/MenuProfil.jsx'
import { Suspense, lazy, useEffect, useState } from 'react'
import { Link, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth, useReseau } from './lib/contexte.jsx'
import Accueil from './pages/Accueil.jsx'
import Connexion from './pages/Connexion.jsx'
import { ANCRES_PROJET } from './lib/ancres.js'
import Chargement from './components/Chargement.jsx'
import Retours from './components/Retours.jsx'
import BarreRetour from './components/BarreRetour.jsx'
import Logo from './components/Logo.jsx'
import { IconeMenu } from './components/Icones.jsx'

const Territoire = lazy(() => import('./pages/Territoire.jsx'))
const Visite = lazy(() => import('./pages/Visite.jsx'))
const IntroRegion = lazy(() => import('./components/IntroRegion.jsx'))
const Parcours = lazy(() => import('./pages/Parcours.jsx'))
const Creches = lazy(() => import('./pages/Creches.jsx'))
const Telecharger = lazy(() => import('./pages/Telecharger.jsx'))
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
  const { session } = useAuth()
  const { enLigne } = useReseau()
  const lieu = useLocation()
  const [menuOuvert, setMenuOuvert] = useState(false)
  const [intro, setIntro] = useState(() => {
    try {
      const reduit = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      return lieu.pathname === '/' && !sessionStorage.getItem('fildor.intro') && !reduit && !globalThis.FILDOR_CONFIG?.logiciel
    } catch { return false }
  })
  const finIntro = () => { try { sessionStorage.setItem('fildor.intro', '1') } catch { /* sans stockage */ } setIntro(false) }
  const dansEspace = Boolean(session) && /^\/(agent|mairie|structure|carte|admin|carnet)(\/|$)/.test(lieu.pathname)
  
  // Ferme le menu mobile et remonte en haut à chaque changement de page
  useEffect(() => {
    setMenuOuvert(false); window.scrollTo(0, 0)
    document.querySelectorAll('.menu-deroulant[open]').forEach((d) => d.removeAttribute('open'))
  }, [lieu.pathname])

  // Un seul menu déroulant ouvert à la fois ; un clic ailleurs le referme.
  useEffect(() => {
    const fermer = (e) => document.querySelectorAll('.menu-deroulant[open]').forEach((d) => { if (!d.contains(e.target)) d.removeAttribute('open') })
    const unSeul = (e) => { if (e.target.open) document.querySelectorAll('.menu-deroulant[open]').forEach((d) => { if (d !== e.target) d.removeAttribute('open') }) }
    document.addEventListener('click', fermer)
    document.addEventListener('toggle', unSeul, true)
    return () => { document.removeEventListener('click', fermer); document.removeEventListener('toggle', unSeul, true) }
  }, [])

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
      {intro && <Suspense fallback={null}><IntroRegion onFin={finIntro} /></Suspense>}
      <a className="lien-evitement" href="#contenu">Aller au contenu</a>
      <BandeauAndroid />
      <div className={`entete-bloc no-print ${menuOuvert ? 'ouvert' : ''}${dansEspace ? ' espace' : ''}`}>
        <header className="entete">
          <div className="interieur">
            <Link to="/" className="logo" aria-label="Fil d'Or, accueil"><Logo /></Link>
            <a className="marque-unicef" href="https://www.unicef.org/togo/" target="_blank" rel="noreferrer" aria-label="UNICEF, pour chaque enfant"><img src="/partenaires/unicef-globe.png" alt="UNICEF" width="46" height="45" /><span>Hack4Children<br />Togo 2026</span></a>
            <div className="entete-action">
              {!session && <Link className="bouton-entete principal" to="/connexion">Se connecter</Link>}
              {session && !dansEspace && <Link className="bouton-entete principal" to={ACCUEIL_ROLE[session.role] ?? '/'}>Mon espace</Link>}
              {session && dansEspace && <Link className="bouton-entete principal" to="/">Accueil</Link>}
              {session && <MenuProfil />}
            </div>
            <button className="menu-bouton" aria-label="Menu" aria-expanded={menuOuvert} aria-controls="navigation" onClick={() => setMenuOuvert((o) => !o)}>
              <IconeMenu /> <span className="txt-menu">Menu</span>
            </button>
            <nav id="navigation" className="nav-principale" aria-label="Navigation principale">
              <div className="nav-liens">
                <NavLink to="/" end className="lien-accueil">Accueil</NavLink>
                <NavLink to="/parcours">Parcours</NavLink>
                <details className="menu-deroulant">
                  <summary>Familles</summary>
                  <div className="menu-liste">
                    <Link to="/telephone"><b>Téléphone</b><small>SMS, appel vocal et USSD *789#</small></Link>
                    <Link to="/assistant"><b>Assistant</b><small>Une question, à partir des contenus validés</small></Link>
                    <Link to="/jeux"><b>Jeux d'éveil</b><small>Un jeu par jour, avec les objets de la maison</small></Link>
                    <Link to="/annuaire"><b>Annuaire</b><small>Centre de santé, crèche, état civil</small></Link>
                    <Link to="/ecoute"><b>Point d'écoute</b><small>Le même message, sans téléphone</small></Link>
                    <Link to="/acte"><b>Acte de naissance</b><small>Délais, gratuité, retrait de l'acte</small></Link>
                    <Link to="/signalement"><b>Situation inquiétante</b><small>Qui prévenir, tout de suite</small></Link>
                  </div>
                </details>
                <details className="menu-deroulant">
                  <summary>Terrain</summary>
                  <div className="menu-liste">
                    <Link to="/hors-reseau"><b>Logiciel hors réseau</b><small>Saisir au village, synchroniser au retour</small></Link>
                    <Link to="/creches"><b>Crèches solidaires</b><small>Formation des femmes leaders</small></Link>
                    <Link to="/adolescents"><b>Adolescents</b><small>Repères avant la grossesse</small></Link>
                    <Link to="/fonctionnement"><b>Fonctionnement</b><small>Qui fait quoi, où vont les données</small></Link>
                  </div>
                </details>
                <NavLink to="/projet">Le projet</NavLink>
              </div>
              <div className="nav-actions">
                {!enLigne && <span className="etat-reseau-entete hors" role="status" title="Hors ligne : les saisies sont gardées sur cet appareil">
                  <i aria-hidden="true" />Hors ligne
                </span>}
              </div>
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
        <BarreRetour />
        <Suspense fallback={<Chargement texte="Ouverture de la page…" />}>
        <Routes>
          <Route path="/" element={<Accueil />} />
          <Route path="/preparation" element={<Preparation />} />
          <Route path="/projet" element={<Projet />} />
          <Route path="/territoire" element={<Territoire />} />
          <Route path="/connexion" element={<Connexion />} />
          <Route path="/telephone" element={<Telephone />} />
          <Route path="/ecoute" element={<Ecoute />} />
          <Route path="/assistant" element={<Assistant />} />
          <Route path="/annuaire" element={<Annuaire />} />
          <Route path="/acte" element={<ActeNaissance />} />
          <Route path="/fonctionnement" element={<Fonctionnement />} />
          <Route path="/visite" element={<Visite />} />
          <Route path="/hors-reseau" element={<HorsReseau />} />
          <Route path="/telecharger" element={<Telecharger />} />
          <Route path="/parcours" element={<Parcours />} />
          <Route path="/creches" element={<Creches />} />
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

      <footer className={`pied no-print${dansEspace ? ' compact' : ''}`}>
        <div className="pied-interieur">
          <div className="pied-ligne">
            <Link to="/" className="logo" aria-label="Fil d'Or, accueil"><Logo /></Link>
            <span className="pied-unicef"><img src="/partenaires/unicef-logo.png" alt="UNICEF" height="44" /><small>Concours Hack4Children Togo 2026</small></span>
          </div>
          <nav className="pied-colonnes" aria-label="Liens du site">
              <div>
                <h2>Familles</h2>
                <ul>
                  <li><Link to="/telephone">Téléphone</Link></li>
                  <li><Link to="/assistant">Assistant</Link></li>
                  <li><Link to="/jeux">Jeux d'éveil</Link></li>
                  <li><Link to="/annuaire">Annuaire</Link></li>
                  <li><Link to="/ecoute">Point d'écoute</Link></li>
                  <li><Link to="/acte">Acte de naissance</Link></li>
                  <li><Link to="/signalement">Situation inquiétante</Link></li>
                </ul>
              </div>
              <div>
                <h2>Terrain</h2>
                <ul>
                  <li><Link to="/connexion">Tableaux de bord</Link></li>
                  <li><Link to="/hors-reseau">Logiciel hors réseau</Link></li>
                  <li><Link to="/creches">Crèches solidaires</Link></li>
                  <li><Link to="/adolescents">Adolescents</Link></li>
                  <li><Link to="/fonctionnement">Fonctionnement</Link></li>
                </ul>
              </div>
              <div>
                <h2>Le projet</h2>
                <ul>
                  <li><Link to="/parcours">Un enfant, un parcours</Link></li>
                  <li><Link to="/projet">Le dossier</Link></li>
                  <li><Link to="/visite">Visite guidée</Link></li>
                  <li><Link to="/territoire">Le territoire</Link></li>
                </ul>
              </div>
          </nav>
          <p className="pied-legal">
            Aucune photo, aucune adresse, aucun nom sans accord · Loi n° 2019-014 du 29 octobre 2019 · Fil d'Or informe et oriente, il ne pose aucun
            diagnostic · Version de démonstration, données fictives · Projet candidat au concours Hack4Children Togo 2026, pas un service
            officiel de l'UNICEF · © 2026 Fil d'Or
          </p>
        </div>
      </footer>
    </div>
  )
}
