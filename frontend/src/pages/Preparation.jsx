import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { api } from '../lib/api.js'
import { useAuth } from '../lib/contexte.jsx'
import Logo from '../components/Logo.jsx'

const LIBELLE = { AGENT: 'Agent de santé', MAIRIE: 'État civil', STRUCTURE: "Structure d'accueil", DECIDEUR: 'Responsable régional', ADMIN: 'Administrateur' }
// Ce qu'on charge d'avance pour que l'espace s'ouvre déjà rempli
const DONNEES = {
  AGENT: ['/api/agent/visites', '/api/agent/structures'],
  MAIRIE: ['/api/mairie/declarations', '/api/mairie/actes'],
  STRUCTURE: ['/api/structure/moi', '/api/structure/demandes?statut=NOUVELLE'],
  DECIDEUR: ['/api/decideur/zones', '/api/decideur/actes'],
  ADMIN: ['/api/public/sujets'],
}
const ETAPES = ['Connexion sécurisée', 'Vérification de vos droits', 'Chargement de vos données', 'Ouverture de votre espace']
const ACCUEIL = { AGENT: '/agent', MAIRIE: '/mairie', DECIDEUR: '/carte', STRUCTURE: '/structure', ADMIN: '/admin' }

/** Page de passage après la connexion : on voit le chargement, puis l'espace s'ouvre. */
export default function Preparation() {
  const { session } = useAuth()
  const lieu = useLocation()
  const navigate = useNavigate()
  const [etape, setEtape] = useState(0)

  useEffect(() => {
    if (!session) return undefined
    let annule = false
    const cible = lieu.state?.cible || ACCUEIL[session.role] || '/'
    const pause = (ms) => new Promise((r) => setTimeout(r, ms))
    ;(async () => {
      setEtape(1); await pause(450)
      if (annule) return
      setEtape(2)
      await Promise.allSettled([pause(700), ...(DONNEES[session.role] ?? []).map((u) => api.get(u))])
      if (annule) return
      setEtape(3); await pause(450)
      if (!annule) navigate(cible, { replace: true })
    })()
    return () => { annule = true }
  }, [session, lieu.state, navigate])

  if (!session) return <Navigate to="/connexion" replace />

  return (
    <main className="preparation" aria-live="polite">
      <div className="preparation-carte">
        <div className="prep-logo"><Logo /></div>
        <h1>Bonjour {session.nomComplet}</h1>
        <p className="petit">{LIBELLE[session.role]} : nous préparons votre espace.</p>
        <div className="progression" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(((etape + 1) / ETAPES.length) * 100)}>
          <span style={{ width: `${((etape + 1) / ETAPES.length) * 100}%` }} />
        </div>
        <ol className="etapes-chargement">
          {ETAPES.map((nom, i) => (
            <li key={nom} className={i < etape ? 'fait' : i === etape ? 'en-cours' : ''}>
              <i aria-hidden="true" />{nom}
            </li>
          ))}
        </ol>
      </div>
    </main>
  )
}
