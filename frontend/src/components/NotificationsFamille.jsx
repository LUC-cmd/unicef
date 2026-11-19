import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { api } from '../lib/api.js'

function IconeCloche() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8M10.3 21a2 2 0 0 0 3.4 0" />
    </svg>
  )
}

/** Cloche de la famille : les rappels qui attendent sa réponse. */
export default function NotificationsFamille({ compte }) {
  const [ouvert, setOuvert] = useState(false)
  const [items, setItems] = useState([])
  const bloc = useRef(null)
  const lieu = useLocation()

  useEffect(() => {
    let annule = false
    api.post('/api/public/sms', { telephone: compte.telephone })
      .then((r) => { if (!annule) setItems((Array.isArray(r?.messages) ? r.messages : []).filter((m) => m.type === 'RAPPEL' && m.statut !== 'ACQUITTE')) })
      .catch(() => { if (!annule) setItems([]) })
    return () => { annule = true }
  }, [compte.telephone, lieu.pathname])

  useEffect(() => {
    if (!ouvert) return undefined
    const fermer = (e) => { if (bloc.current && !bloc.current.contains(e.target)) setOuvert(false) }
    const echap = (e) => { if (e.key === 'Escape') setOuvert(false) }
    document.addEventListener('click', fermer); document.addEventListener('keydown', echap)
    return () => { document.removeEventListener('click', fermer); document.removeEventListener('keydown', echap) }
  }, [ouvert])

  const total = items.length
  return (
    <div className="notifications" ref={bloc}>
      <button type="button" className="cloche" aria-label={total ? `${total} rappel(s) à confirmer` : 'Notifications'} aria-expanded={ouvert} onClick={() => setOuvert((o) => !o)}>
        <IconeCloche />
        {total > 0 && <b className="cloche-badge">{total}</b>}
      </button>
      {ouvert && (
        <div className="cloche-panneau" role="menu">
          <p className="cloche-titre">Notifications</p>
          {total === 0 && <p className="petit">Aucun rappel en attente.</p>}
          <ul>
            {items.map((m) => <li key={m.id}><Link to="/famille/messages" onClick={() => setOuvert(false)}>{m.message}</Link></li>)}
          </ul>
        </div>
      )}
    </div>
  )
}
