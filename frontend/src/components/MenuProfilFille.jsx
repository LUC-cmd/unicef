import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Avatar, { ecrirePhoto, lirePhoto, preparerPhoto } from './Avatar.jsx'
import ConfirmerSortie from './ConfirmerSortie.jsx'
import { aUnPin, definirPin, modifierPseudo, retirerPin } from '../lib/fille.js'

/** Le compte de la jeune fille : surnom, photo (gardée sur le téléphone), code secret facultatif, déconnexion. Aucun nom demandé. */
export default function MenuProfilFille({ fille, onSortie }) {
  const utilisateur = `fille-${fille.pseudo}`
  const [ouvert, setOuvert] = useState(false)
  const [msg, setMsg] = useState(null)
  const [confirmer, setConfirmer] = useState(false)
  const [pseudo, setPseudo] = useState(fille.pseudo)
  const [pin, setPin] = useState('')
  const [avecPin, setAvecPin] = useState(aUnPin)
  const [aPhoto, setAPhoto] = useState(() => Boolean(lirePhoto(utilisateur)))
  const ref = useRef(null)
  useEffect(() => { setPseudo(fille.pseudo); setAPhoto(Boolean(lirePhoto(utilisateur))) }, [fille.pseudo, utilisateur])
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
    const f = e.target.files?.[0]; e.target.value = ''
    if (!f) return
    if (!f.type.startsWith('image/')) { setMsg({ ok: false, texte: 'Choisis une image.' }); return }
    try { ecrirePhoto(utilisateur, await preparerPhoto(f)); setMsg({ ok: true, texte: 'Photo ajoutée sur ce téléphone.' }) } catch (x) { setMsg({ ok: false, texte: x.message }) }
  }
  const surnom = (e) => { e.preventDefault(); try { modifierPseudo(pseudo); setMsg({ ok: true, texte: 'Surnom modifié.' }) } catch (x) { setMsg({ ok: false, texte: x.message }) } }
  const code = async (e) => { e.preventDefault(); try { await definirPin(pin); setPin(''); setAvecPin(true); setMsg({ ok: true, texte: 'Code secret enregistré : il sera demandé à la prochaine ouverture.' }) } catch (x) { setMsg({ ok: false, texte: x.message }) } }
  return (
    <div className="profil" ref={ref}>
      <button type="button" className="profil-bouton" aria-haspopup="menu" aria-expanded={ouvert} onClick={() => setOuvert((o) => !o)} aria-label={`Mon compte, ${fille.pseudo}`}>
        <Avatar username={utilisateur} nom={fille.pseudo} taille={40} />
      </button>
      {ouvert && (
        <div className="profil-menu" role="menu">
          <div className="profil-tete">
            <Avatar username={utilisateur} nom={fille.pseudo} taille={56} />
            <div><b>{fille.pseudo}</b><span>Compte jeune fille · anonyme</span></div>
          </div>
          <Link role="menuitem" to="/fille" onClick={() => setOuvert(false)}>Mon espace</Link>
          <Link role="menuitem" to="/fille/accompagnement" onClick={() => setOuvert(false)}>Être accompagnée (facultatif)</Link>
          <label role="menuitem" className="profil-photo">{aPhoto ? 'Changer la photo' : 'Ajouter une photo'}<input type="file" accept="image/*" onChange={choisir} hidden /></label>
          {aPhoto && <button type="button" role="menuitem" onClick={() => ecrirePhoto(utilisateur, '')}>Retirer la photo</button>}
          <form className="profil-form" onSubmit={surnom}>
            <label>Mon surnom<input value={pseudo} maxLength={24} onChange={(e) => setPseudo(e.target.value)} /></label>
            <button className="bouton secondaire petit-bouton" type="submit">Changer</button>
          </form>
          <form className="profil-form" onSubmit={code}>
            <label>{avecPin ? 'Nouveau code secret' : 'Code secret (4 à 6 chiffres)'}<input type="password" inputMode="numeric" autoComplete="new-password" value={pin} maxLength={6} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} /></label>
            <button className="bouton secondaire petit-bouton" type="submit" disabled={pin.length < 4}>{avecPin ? 'Modifier le code' : 'Protéger mon espace'}</button>
          </form>
          {avecPin && <button type="button" role="menuitem" onClick={() => { retirerPin(); setAvecPin(false); setMsg({ ok: true, texte: 'Code secret retiré.' }) }}>Retirer le code secret</button>}
          <p className="profil-note">La photo et le code restent sur ce téléphone.</p>
          {msg && <p className={msg.ok ? 'succes' : 'erreur'} role="status">{msg.texte}</p>}
          <button type="button" role="menuitem" className="profil-sortie" onClick={() => { setOuvert(false); setConfirmer(true) }}>Se déconnecter</button>
        </div>
      )}
      <ConfirmerSortie ouvert={confirmer} onAnnuler={() => setConfirmer(false)} onConfirmer={() => { setConfirmer(false); onSortie() }} />
    </div>
  )
}
