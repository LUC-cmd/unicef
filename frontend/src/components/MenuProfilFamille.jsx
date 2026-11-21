import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { definirSecretFamille } from '../lib/api.js'
import { ecrireCompte } from '../lib/famille.js'
import { useReseau } from '../lib/contexte.jsx'
import ConfirmerSortie from './ConfirmerSortie.jsx'
import Avatar, { ecrirePhoto, lirePhoto, preparerPhoto } from './Avatar.jsx'

/** Le compte de la famille connectée : photo (gardée sur l'appareil), accès à son espace, déconnexion. */
export default function MenuProfilFamille({ compte }) {
  const { enLigne } = useReseau()
  const nav = useNavigate()
  const utilisateur = `famille-${compte.codeFamille}`
  const nom = `Famille ${compte.codeFamille}`
  const [ouvert, setOuvert] = useState(false)
  const [erreur, setErreur] = useState('')
  const [confirmer, setConfirmer] = useState(false)
  const [aPhoto, setAPhoto] = useState(() => Boolean(lirePhoto(utilisateur)))
  const ref = useRef(null)
  useEffect(() => {
    const maj = () => setAPhoto(Boolean(lirePhoto(utilisateur)))
    window.addEventListener('fildor-photo', maj)
    return () => window.removeEventListener('fildor-photo', maj)
  }, [utilisateur])
  useEffect(() => {
    if (!ouvert) return undefined
    const dehors = (e) => { if (ref.current && !ref.current.contains(e.target)) setOuvert(false) }
    const echap = (e) => { if (e.key === 'Escape') setOuvert(false) }
    document.addEventListener('mousedown', dehors); document.addEventListener('keydown', echap)
    return () => { document.removeEventListener('mousedown', dehors); document.removeEventListener('keydown', echap) }
  }, [ouvert])

  async function choisir(e) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (!f.type.startsWith('image/')) { setErreur('Choisissez une image.'); return }
    try { ecrirePhoto(utilisateur, await preparerPhoto(f)); setErreur('') } catch (x) { setErreur(x.message) }
  }
  const sortir = () => { setConfirmer(false); definirSecretFamille(''); ecrireCompte(null); nav('/connexion', { state: { sortie: true } }) }

  return (
    <div className="profil" ref={ref}>
      <button type="button" className="profil-bouton" aria-haspopup="menu" aria-expanded={ouvert} onClick={() => setOuvert((o) => !o)} aria-label={`Compte de ${nom}`}>
        <Avatar username={utilisateur} nom={nom} taille={40} />
      </button>
      {ouvert && (
        <div className="profil-menu" role="menu">
          <div className="profil-tete">
            <Avatar username={utilisateur} nom={nom} taille={56} />
            <div>
              <b>{nom}</b>
              <span>Espace famille · numéro {compte.telephone}</span>
              <span className={`profil-reseau ${enLigne ? 'en' : 'hors'}`}>{enLigne ? 'En ligne' : 'Hors ligne'}</span>
            </div>
          </div>
          <Link role="menuitem" to="/famille" onClick={() => setOuvert(false)}>Mon espace famille</Link>
          <Link role="menuitem" to="/famille/compte" onClick={() => setOuvert(false)}>Mon compte</Link>
          <Link role="menuitem" to="/" onClick={() => setOuvert(false)}>Accueil du site</Link>
          <label role="menuitem" className="profil-photo">
            {aPhoto ? 'Changer la photo' : 'Ajouter une photo'}
            <input type="file" accept="image/*" onChange={choisir} hidden />
          </label>
          {aPhoto && <button type="button" role="menuitem" onClick={() => ecrirePhoto(utilisateur, '')}>Retirer la photo</button>}
          <p className="profil-note">La photo reste sur cet appareil.</p>
          {erreur && <p className="erreur" role="alert">{erreur}</p>}
          <button type="button" role="menuitem" className="profil-sortie" onClick={() => { setOuvert(false); setConfirmer(true) }}>Se déconnecter</button>
        </div>
      )}
      <ConfirmerSortie ouvert={confirmer} onAnnuler={() => setConfirmer(false)} onConfirmer={sortir} />
    </div>
  )
}
