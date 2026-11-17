import { useLocation, useNavigate } from 'react-router-dom'

const FLECHE = (
  <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M12 4 6 10l6 6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
)

/** Un bouton « Retour » sur chaque page : il revient à la page précédente, ou au niveau du dessus si on est arrivé directement. */
export default function BarreRetour() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  if (pathname === '/') return null
  const parent = pathname.replace(/\/[^/]+\/?$/, '') || '/'
  const retour = () => {
    if (window.history.state?.idx > 0) navigate(-1)
    else navigate(parent, { replace: true })
  }
  return (
    <div className="barre-retour no-print">
      <button type="button" className="bouton-retour" onClick={retour} aria-label="Retour à la page précédente">{FLECHE}<span>Retour</span></button>
    </div>
  )
}
