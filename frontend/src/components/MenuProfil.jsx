import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth, useReseau } from '../lib/contexte.jsx'
import ConfirmerSortie from './ConfirmerSortie.jsx'
import Avatar, { ecrirePhoto, lirePhoto, preparerPhoto } from './Avatar.jsx'

const ROLES = { AGENT: 'Agent de santé', MAIRIE: 'État civil', STRUCTURE: 'Structure d’accueil', DECIDEUR: 'Responsable régional', ADMIN: 'Administrateur' }
const ESPACE = { AGENT: '/agent', MAIRIE: '/mairie', DECIDEUR: '/carte', STRUCTURE: '/structure', ADMIN: '/admin' }

/** Le compte de la personne connectée : photo, rôle, retour à son espace, déconnexion. */
export default function MenuProfil() {
  const { session, deconnexion } = useAuth()
  const nav = useNavigate()
  const { enLigne } = useReseau()
  const [ouvert, setOuvert] = useState(false)
  const [erreur, setErreur] = useState('')
  const [confirmer, setConfirmer] = useState(false)
  const [aPhoto, setAPhoto] = useState(() => Boolean(lirePhoto(session?.username)))
  const ref = useRef(null)
  useEffect(() => {
    const maj = () => setAPhoto(Boolean(lirePhoto(session?.username)))
    window.addEventListener('fildor-photo', maj)
    return () => window.removeEventListener('fildor-photo', maj)
  }, [session?.username])
  useEffect(() => {
    if (!ouvert) return undefined
    const dehors = (e) => { if (ref.current && !ref.current.contains(e.target)) setOuvert(false) }
    const echap = (e) => { if (e.key === 'Escape') setOuvert(false) }
    document.addEventListener('mousedown', dehors)
    document.addEventListener('keydown', echap)
    return () => { document.removeEventListener('mousedown', dehors); document.removeEventListener('keydown', echap) }
  }, [ouvert])
  if (!session) return null

  async function choisir(e) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (!f.type.startsWith('image/')) { setErreur('Choisissez une image.'); return }
    try { ecrirePhoto(session.username, await preparerPhoto(f)); setErreur('') } catch (x) { setErreur(x.message) }
  }

  return (
    <div className="profil" ref={ref}>
      <button type="button" className="profil-bouton" aria-haspopup="menu" aria-expanded={ouvert} onClick={() => setOuvert((o) => !o)} aria-label={`Compte de ${session.nomComplet}`}>
        <Avatar username={session.username} nom={session.nomComplet} taille={40} />
      </button>
      {ouvert && (
        <div className="profil-menu" role="menu">
          <div className="profil-tete">
            <Avatar username={session.username} nom={session.nomComplet} taille={56} />
            <div>
              <b>{session.nomComplet}</b>
              <span>{ROLES[session.role] ?? session.role}{session.zone ? ` · ${session.zone}` : ''}</span>
              <span className={`profil-reseau ${enLigne ? 'en' : 'hors'}`}>{enLigne ? 'En ligne' : 'Hors ligne'}</span>
            </div>
          </div>
          <Link role="menuitem" to={ESPACE[session.role] ?? '/'} onClick={() => setOuvert(false)}>Mon tableau de bord</Link>
          <Link role="menuitem" to="/" onClick={() => setOuvert(false)}>Accueil du site</Link>
          <label role="menuitem" className="profil-photo">
            {aPhoto ? 'Changer la photo' : 'Ajouter une photo'}
            <input type="file" accept="image/*" onChange={choisir} hidden />
          </label>
          {aPhoto && <button type="button" role="menuitem" onClick={() => ecrirePhoto(session.username, '')}>Retirer la photo</button>}
          <p className="profil-note">La photo reste sur cet appareil.</p>
          {erreur && <p className="erreur" role="alert">{erreur}</p>}
          <button type="button" role="menuitem" className="profil-sortie" onClick={() => { setOuvert(false); setConfirmer(true) }}>Se déconnecter</button>
        </div>
      )}
      <ConfirmerSortie ouvert={confirmer} onAnnuler={() => setConfirmer(false)} onConfirmer={() => { setConfirmer(false); deconnexion(); nav('/connexion', { state: { sortie: true } }) }} />
    </div>
  )
}
