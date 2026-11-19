import BandeauAndroid from './components/BandeauAndroid.jsx'
import MenuProfil from './components/MenuProfil.jsx'
import MenuProfilFamille from './components/MenuProfilFamille.jsx'
import NotificationsFamille from './components/NotificationsFamille.jsx'
import { useCompteFamille } from './lib/famille.js'
import { Notifications } from './components/Shell.jsx'
import { Suspense, lazy, useEffect, useState } from 'react'
import { Link, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth, useReseau } from './lib/contexte.jsx'
import Accueil from './pages/Accueil.jsx'
import Connexion from './pages/Connexion.jsx'
import { ANCRES_PROJET } from './lib/ancres.js'
import Chargement from './components/Chargement.jsx'
import BarriereErreur from './components/BarriereErreur.jsx'
import Retours from './components/Retours.jsx'
import BarreRetour from './components/BarreRetour.jsx'
import { demarrerAnimations } from './lib/animations.js'
import Logo from './components/Logo.jsx'
import { IconeMenu } from './components/Icones.jsx'

const Territoire = lazy(() => import('./pages/Territoire.jsx'))
const Visite = lazy(() => import('./pages/Visite.jsx'))
const IntroRegion = lazy(() => import('./components/IntroRegion.jsx'))
const Parcours = lazy(() => import('./pages/Parcours.jsx'))
const EtapeParcours = lazy(() => import('./pages/EtapeParcours.jsx'))
const Famille = lazy(() => import('./pages/Famille.jsx'))
import FamilleSousPage from './components/FamilleSousPage.jsx'
const DeveloppementFamille = lazy(() => import('./pages/DeveloppementFamille.jsx'))
const MesureBras = lazy(() => import('./pages/MesureBras.jsx'))
const BienEtreMere = lazy(() => import('./pages/BienEtreMere.jsx'))
const MessagesParles = lazy(() => import('./pages/MessagesParles.jsx'))
const FamilleCreche = lazy(() => import('./pages/FamilleCreche.jsx'))
const Creches = lazy(() => import('./pages/Creches.jsx'))
const Telecharger = lazy(() => import('./pages/Telecharger.jsx'))
const HorsReseau = lazy(() => import('./pages/HorsReseau.jsx'))
const Adolescents = lazy(() => import('./pages/Adolescents.jsx'))
const Signalement = lazy(() => import('./pages/Signalement.jsx'))
const Projet = lazy(() => import('./pages/Projet.jsx'))
const Impact = lazy(() => import('./pages/Impact.jsx'))
const Jeux = lazy(() => import('./pages/Jeux.jsx'))
const Grossesse = lazy(() => import('./pages/Grossesse.jsx'))
const Fonctionnement = lazy(() => import('./pages/Fonctionnement.jsx'))
const Telephone = lazy(() => import('./pages/Telephone.jsx'))
const Assistant = lazy(() => import('./pages/Assistant.jsx'))
const WhatsApp = lazy(() => import('./pages/WhatsApp.jsx'))
const Ecoute = lazy(() => import('./pages/Ecoute.jsx'))
const ActeNaissance = lazy(() => import('./pages/ActeNaissance.jsx'))
const Annuaire = lazy(() => import('./pages/Annuaire.jsx'))
const Carnet = lazy(() => import('./pages/Carnet.jsx'))
const Preparation = lazy(() => import('./pages/Preparation.jsx'))
const PortailFamille = lazy(() => import('./pages/PortailFamille.jsx'))
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

/** Application installée sur le téléphone (écran d'accueil) : on ouvre directement l'espace famille. */
function enApplicationFamille() {
  try { return Boolean(window.matchMedia?.('(display-mode: standalone)').matches) && !globalThis.FILDOR_CONFIG?.logiciel } catch { return false }
}

export default function App() {
  const { session } = useAuth()
  const { enLigne } = useReseau()
  const lieu = useLocation()
  const [menuOuvert, setMenuOuvert] = useState(false)
  const [intro, setIntro] = useState(() => {
    try {
      const reduit = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      // L'ouverture se rejoue à chaque chargement de l'accueil (l'utilisateur l'a demandé) ;
      // sauf si le mouvement est réduit ou dans l'application bureau, où elle est inutile.
      return lieu.pathname === '/' && !reduit && !globalThis.FILDOR_CONFIG?.logiciel && !enApplicationFamille()
    } catch { return false }
  })
  const finIntro = () => setIntro(false)
  const compteFamille = useCompteFamille()
  const dansFamille = Boolean(compteFamille) && !session && /^\/famille(\/|$)/.test(lieu.pathname)
  const dansEspace = (Boolean(session) && /^\/(agent|mairie|structure|carte|admin|carnet)(\/|$)/.test(lieu.pathname)) || dansFamille
  
  // Ferme le menu mobile et remonte en haut à chaque changement de page
  useEffect(() => {
    setMenuOuvert(false); window.scrollTo(0, 0)
    document.querySelectorAll('.menu-deroulant[open]').forEach((d) => d.removeAttribute('open'))
  }, [lieu.pathname])

  useEffect(() => demarrerAnimations(), [])

  // Le fil d'or du haut de page se remplit au fil de la lecture.
  useEffect(() => {
    let image = 0
    const maj = () => {
      image = 0
      const h = document.documentElement
      const total = h.scrollHeight - h.clientHeight
      h.style.setProperty('--progres', total > 0 ? String(Math.min(1, h.scrollTop / total)) : '0')
    }
    const surDefilement = () => { if (!image) image = requestAnimationFrame(maj) }
    window.addEventListener('scroll', surDefilement, { passive: true })
    maj()
    return () => { window.removeEventListener('scroll', surDefilement); cancelAnimationFrame(image) }
  }, [])

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
      <div className="progres-fil no-print" aria-hidden="true" />
      <a className="lien-evitement" href="#contenu">Aller au contenu</a>
      <BandeauAndroid />
      <div className={`entete-bloc no-print ${menuOuvert ? 'ouvert' : ''}${dansEspace ? ' espace' : ''}`}>
        <header className="entete">
          <div className="interieur">
            <Link to="/" className="logo" aria-label="Fil d'Or, accueil"><Logo /></Link>
            <div className="entete-action">
              {!session && !dansFamille && <Link className="bouton-entete principal" to="/connexion">Se connecter</Link>}
              {session && !dansEspace && <Link className="bouton-entete principal" to={ACCUEIL_ROLE[session.role] ?? '/'}>Mon espace</Link>}
              {(session || dansFamille) && dansEspace && <Link className="bouton-entete principal" to="/">Accueil</Link>}
              {(session || dansFamille) && dansEspace && (
                <>
                  {dansFamille ? <NotificationsFamille compte={compteFamille} /> : <Notifications role={session.role} />}
                  <span className={`etat-reseau-entete ${enLigne ? 'en' : 'hors'}`} role="status" title={enLigne ? 'Connecté au serveur' : 'Hors ligne : les saisies sont gardées sur cet appareil'}>
                    <i aria-hidden="true" />{enLigne ? 'En ligne' : 'Hors ligne'}
                  </span>
                </>
              )}
              {session && <MenuProfil />}
              {dansFamille && <MenuProfilFamille compte={compteFamille} />}
            </div>
            <button className="menu-bouton" aria-label="Menu" aria-expanded={menuOuvert} aria-controls="navigation" onClick={() => setMenuOuvert((o) => !o)}>
              <IconeMenu /> <span className="txt-menu">Menu</span>
            </button>
            <nav id="navigation" className="nav-principale" aria-label="Navigation principale">
              <div className="nav-liens">
                <NavLink to="/" end className="lien-accueil">Accueil</NavLink>
                <NavLink to="/parcours">Un enfant, un parcours</NavLink>
                <NavLink to="/impact">Innovation et impact</NavLink>
                <NavLink to="/projet">Le projet</NavLink>
                <details className="menu-deroulant">
                  <summary>Essayer</summary>
                  <div className="menu-liste">
                    <Link to="/visite"><b>Visite guidée</b><small>Parcourir la plateforme en 3 minutes</small></Link>
                    <Link to="/famille"><b>Espace famille</b><small>Rappels, notifications, dossier de naissance</small></Link>
                    <Link to="/assistant"><b>Assistant</b><small>Poser une question de santé de l'enfant</small></Link>
                    <Link to="/whatsapp"><b>Assistant WhatsApp</b><small>La même conversation, version chat</small></Link>
                    <Link to="/telephone"><b>Simulateur de téléphone</b><small>SMS, appel vocal et USSD *789#</small></Link>
                    <Link to="/jeux"><b>Jeux d'éveil</b><small>Des jeux simples à faire à la maison</small></Link>
                    <Link to="/grossesse"><b>Ma grossesse, mois par mois</b><small>CPN, exercices, signes d'alerte, kit d'accouchement</small></Link>
                  </div>
                </details>
                <details className="menu-deroulant">
                  <summary>Ressources</summary>
                  <div className="menu-liste">
                    <Link to="/fonctionnement"><b>Fonctionnement</b><small>Comment circulent les informations</small></Link>
                    <Link to="/acte"><b>Acte de naissance</b><small>Les étapes, les délais, la gratuité</small></Link>
                    <Link to="/annuaire"><b>Annuaire des structures</b><small>Centres de santé, crèches, état civil</small></Link>
                    <Link to="/ecoute"><b>Point d'écoute</b><small>Pour les familles sans téléphone</small></Link>
                    <Link to="/creches"><b>Crèches solidaires</b><small>Formation des femmes leaders</small></Link>
                    <Link to="/adolescents"><b>Adolescents</b><small>Informations et orientation</small></Link>
                    <Link to="/signalement"><b>Une situation inquiétante ?</b><small>Qui prévenir, tout de suite</small></Link>
                  </div>
                </details>
                <NavLink to="/hors-reseau" className="lien-logiciel"><svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><path d="M10 3v9m0 0-3.5-3.5M10 12l3.5-3.5M4 15.5h12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>Logiciel hors réseau</NavLink>
              </div>
              <div className="nav-actions">
                {!session && !dansFamille && <span className={`etat-reseau-entete ${enLigne ? 'en' : 'hors'}`} role="status" title={enLigne ? 'Connecté au serveur' : 'Hors ligne : les saisies sont gardées sur cet appareil'}>
                  <i aria-hidden="true" />{enLigne ? 'En ligne' : 'Hors ligne'}
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
        <BarriereErreur>
        <Suspense fallback={<Chargement texte="Ouverture de la page…" />}>
        <div className="page-entree" key={lieu.pathname.split("/")[1] || "/"}>
        <Routes location={lieu}>
          <Route path="/" element={enApplicationFamille() && !session ? <Navigate to="/famille" replace /> : <Accueil />} />
          <Route path="/preparation" element={<Preparation />} />
          <Route path="/projet" element={<Projet />} />
          <Route path="/impact" element={<Impact />} />
          <Route path="/territoire" element={<Territoire />} />
          <Route path="/connexion" element={<Connexion />} />
          <Route path="/telephone" element={<Telephone />} />
          <Route path="/ecoute" element={<Ecoute />} />
          <Route path="/assistant" element={<Assistant />} />
          <Route path="/whatsapp" element={<WhatsApp />} />
          <Route path="/annuaire" element={<Annuaire />} />
          <Route path="/acte" element={<ActeNaissance />} />
          <Route path="/fonctionnement" element={<Fonctionnement />} />
          <Route path="/visite" element={<Visite />} />
          <Route path="/hors-reseau" element={<HorsReseau />} />
          <Route path="/telecharger" element={<Telecharger />} />
          <Route path="/parcours" element={<Parcours />} />
          <Route path="/parcours/:etape" element={<EtapeParcours />} />
          <Route path="/famille" element={<Famille />} />
          <Route path="/famille/messages" element={<Famille onglet="messages" />} />
          <Route path="/famille/lieux" element={<Famille onglet="creches" />} />
          <Route path="/famille/dossier" element={<Famille onglet="dossier" />} />
          <Route path="/famille/compte" element={<Famille onglet="compte" />} />
          <Route path="/famille/creche" element={<FamilleSousPage><FamilleCreche /></FamilleSousPage>} />
          <Route path="/famille/grossesse" element={<FamilleSousPage><Grossesse /></FamilleSousPage>} />
          <Route path="/famille/jeux" element={<FamilleSousPage><Jeux /></FamilleSousPage>} />
          <Route path="/famille/jeux/:jeu" element={<FamilleSousPage><Jeux /></FamilleSousPage>} />
          <Route path="/famille/assistant" element={<FamilleSousPage><Assistant /></FamilleSousPage>} />
          <Route path="/famille/acte" element={<FamilleSousPage><ActeNaissance /></FamilleSousPage>} />
          <Route path="/famille/developpement" element={<FamilleSousPage><DeveloppementFamille /></FamilleSousPage>} />
          <Route path="/famille/bras" element={<FamilleSousPage><MesureBras /></FamilleSousPage>} />
          <Route path="/famille/bien-etre" element={<FamilleSousPage><BienEtreMere /></FamilleSousPage>} />
          <Route path="/famille/voix" element={<FamilleSousPage><MessagesParles /></FamilleSousPage>} />
          <Route path="/creches" element={<Creches />} />
          <Route path="/adolescents" element={<Adolescents />} />
          <Route path="/signalement" element={<Signalement />} />
          <Route path="/jeux" element={<Jeux />} />
          <Route path="/jeux/:jeu" element={<Jeux />} />
          <Route path="/grossesse" element={<Grossesse />} />
          <Route path="/agent/*" element={<Protegee page="agent"><EspaceAgent /></Protegee>} />
          <Route path="/structure/*" element={<Protegee page="structure"><EspaceStructure /></Protegee>} />
          <Route path="/mairie/*" element={<Protegee page="mairie"><EspaceMairie /></Protegee>} />
          <Route path="/carte/*" element={<Protegee page="carte"><EspaceDecideur /></Protegee>} />
          <Route path="/admin/*" element={<Protegee page="admin"><EspaceAdmin /></Protegee>} />
          <Route path="/carnet/:code" element={<Protegee page="agent"><Carnet /></Protegee>} />
          <Route path="/portail/:code" element={<PortailFamille />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </div>
        </Suspense>
        </BarriereErreur>
      </div>

      <footer className={`pied no-print${dansEspace ? ' compact' : ''}`}>
        <div className="pied-interieur">
          <div className="pied-ligne">
            <Link to="/" className="logo" aria-label="Fil d'Or, accueil"><Logo /></Link>
            <span className="pied-unicef"><img src="/partenaires/unicef-logo.png" alt="UNICEF" height="44" /><small>Concours Hack4Children Togo 2026</small></span>
            <nav className="pied-liens" aria-label="Liens du site">
              <Link to="/parcours">Un enfant, un parcours</Link>
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
            Aucune photo, aucune adresse, aucun nom sans accord · Loi n° 2019-014 du 29 octobre 2019 · Fil d'Or informe et oriente, il ne pose aucun
            diagnostic · Version de démonstration, données fictives · Projet candidat au concours Hack4Children Togo 2026, pas un service
            officiel de l'UNICEF · © 2026 Fil d'Or
          </p>
        </div>
      </footer>
    </div>
  )
}
