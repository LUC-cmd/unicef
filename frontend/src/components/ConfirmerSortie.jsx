import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

/** Fenêtre de confirmation avant de quitter : évite une déconnexion par erreur. */
export default function ConfirmerSortie({ ouvert, titre = 'Se déconnecter ?', texte, onConfirmer, onAnnuler }) {
  const bouton = useRef(null)
  useEffect(() => {
    if (!ouvert) return undefined
    bouton.current?.focus()
    const echap = (e) => { if (e.key === 'Escape') onAnnuler() }
    document.addEventListener('keydown', echap)
    return () => document.removeEventListener('keydown', echap)
  }, [ouvert, onAnnuler])
  if (!ouvert) return null
  return createPortal(
    <div className="confirme-fond" onMouseDown={(e) => { if (e.target === e.currentTarget) onAnnuler() }}>
      <div className="confirme" role="alertdialog" aria-modal="true" aria-labelledby="modale-titre" aria-describedby="modale-texte">
        <h2 id="modale-titre">{titre}</h2>
        <p id="modale-texte">{texte || 'Vous quittez votre espace. Ce qui n’est pas encore envoyé reste gardé sur cet appareil.'}</p>
        <div className="confirme-actions">
          <button type="button" className="bouton secondaire" ref={bouton} onClick={onAnnuler}>Rester connecté</button>
          <button type="button" className="bouton danger" onClick={onConfirmer}>Se déconnecter</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
