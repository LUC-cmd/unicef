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
      <main className="page">
        <div className="carte erreur">Votre compte n'a pas accès à cette page.</div>
      </main>
    )
  }
  return children
}

export default function App() {
  const { session, deconnexion } = useAuth()
  const peut = (page) => session && ROLES_PAR_PAGE[page].includes(session.role)

  return (
    <div className="coque">
      <header className="entete no-print">
        <Link to="/" className="logo" aria-label="Fil d'Or, accueil">
          <span className="fil" aria-hidden="true" />
          Fil d'Or
        </Link>
        <nav aria-label="Navigation principale">
          <NavLink to="/telephone">Téléphone</NavLink>
          <NavLink to="/ecoute">Écoute</NavLink>
          <NavLink to="/assistant">Assistant</NavLink>
          <NavLink to="/annuaire">Annuaire</NavLink>
          {peut('agent') && <NavLink to="/agent">Agent</NavLink>}
          {peut('mairie') && <NavLink to="/mairie">Mairie</NavLink>}
          {peut('carte') && <NavLink to="/carte">Carte</NavLink>}
          {peut('structure') && <NavLink to="/structure">Structure</NavLink>}
          {peut('admin') && <NavLink to="/admin">Coulisses</NavLink>}
        </nav>
        <div className="session">
          {session ? (
            <>
              <span className="petit">{session.nomComplet}</span>
              <button className="lien" onClick={deconnexion}>Quitter</button>
            </>
          ) : (
            <Link to="/connexion">Se connecter</Link>
          )}
        </div>
      </header>

      <div className="bandeau-demo no-print">Prototype Hack4Children Togo 2026 · données fictives · aucun vrai enfant, aucun vrai SMS</div>

      <div className="contenu">
      <Routes>
        <Route path="/" element={<Accueil />} />
        <Route path="/connexion" element={<Connexion />} />
        <Route path="/telephone" element={<Telephone />} />
        <Route path="/ecoute" element={<Ecoute />} />
        <Route path="/assistant" element={<Assistant />} />
        <Route path="/annuaire" element={<Annuaire />} />
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
        <div className="pied-grille">
          <div>
            <h2>Fil d'Or</h2>
            <p>Un carnet, de la grossesse à 5 ans. Quatre portes : voix et SMS, agent, carnet illustré, point d'écoute.</p>
          </div>
          <div>
            <h2>Services</h2>
            <ul>
              <li>Site — cette interface</li>
              <li>API — dossiers, rôles, rappels</li>
              <li>Base — PostgreSQL, données fictives</li>
              <li>Assistant — questions, sans dossier</li>
            </ul>
          </div>
          <div>
            <h2>Aller</h2>
            <ul>
              <li><Link to="/telephone">Téléphone</Link></li>
              <li><Link to="/assistant">Poser une question</Link></li>
              <li><Link to="/annuaire">Annuaire</Link></li>
              <li><Link to="/connexion">Connexion</Link></li>
            </ul>
          </div>
        </div>
        <p className="mention">
          Informe et oriente, ne diagnostique pas. Contenus à valider par des professionnels avant tout usage réel.
          Loi n° 2019-014 du 29 octobre 2019. Aucun nom, aucune photo, aucun point GPS précis.
        </p>
      </footer>
    </div>
  )
}
