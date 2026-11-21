import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { reseau } from '../lib/reseauClient.js'

/** Cloche de notifications des espaces du réseau : ce qui demande l'attention du rôle connecté, rafraîchi toutes les 20 s. */
export default function CloucheReseau({ jeton }) {
  const [items, setItems] = useState([])
  const [ouvert, setOuvert] = useState(false)
  const bloc = useRef(null)
  useEffect(() => {
    let vivant = true
    const charger = async () => { try { const r = await reseau.get('notifications', jeton); if (vivant) setItems(r.notifications) } catch { /* hors ligne */ } }
    charger(); const t = setInterval(charger, 20000)
    return () => { vivant = false; clearInterval(t) }
  }, [jeton])
  useEffect(() => {
    if (!ouvert) return undefined
    const fermer = (e) => { if (bloc.current && !bloc.current.contains(e.target)) setOuvert(false) }
    document.addEventListener('click', fermer)
    return () => document.removeEventListener('click', fermer)
  }, [ouvert])
  const urgents = items.filter((n) => n.niveau === 'urgent').length
  return (
    <div className="cloche-reseau" ref={bloc}>
      <button type="button" className="bouton secondaire petit-bouton" aria-expanded={ouvert} onClick={() => setOuvert((o) => !o)}>
        Notifications{items.length > 0 && <b className={`cloche-n${urgents ? ' urgent' : ''}`}>{items.length}</b>}
      </button>
      {ouvert && (
        <div className="cloche-liste" role="menu">
          {items.length === 0 ? <p className="petit">Rien à signaler pour le moment.</p> : (
            <ul>{items.map((n, i) => <li key={i} className={n.niveau}><Link to={n.to} onClick={() => setOuvert(false)}>{n.texte}</Link></li>)}</ul>
          )}
        </div>
      )}
    </div>
  )
}
