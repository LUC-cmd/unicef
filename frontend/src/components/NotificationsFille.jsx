import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ajouterJours, ecartJours, lireEspace } from '../lib/adolescente.js'
import { lireMesPartages, lireVus } from '../lib/fille.js'
import { reseau } from '../lib/reseauClient.js'

function IconeCloche() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8M10.3 21a2 2 0 0 0 3.4 0" />
    </svg>
  )
}

/** Cloche de la jeune fille : réponses à ses messages, prochaines règles. Tout se calcule sur ce téléphone ou depuis l'espace de partage, sans nom. */
export default function NotificationsFille() {
  const [ouvert, setOuvert] = useState(false)
  const [items, setItems] = useState([])
  const bloc = useRef(null)
  const lieu = useLocation()
  useEffect(() => {
    let annule = false
    const liste = []
    const e = lireEspace()
    if (e.debut) {
      const prochaines = ajouterJours(e.debut, Number(e.duree) || 28)
      const j = ecartJours(new Date().toISOString().slice(0, 10), prochaines)
      if (j >= 0 && j <= 3) liste.push({ id: 'cycle', texte: j === 0 ? 'Tes règles sont prévues aujourd’hui environ.' : `Tes prochaines règles sont prévues dans environ ${j} jour${j > 1 ? 's' : ''}.`, to: '/fille/cycle' })
    }
    const mes = lireMesPartages()
    const fin = () => { if (!annule) setItems(liste) }
    if (!mes.length) { fin(); return () => { annule = true } }
    reseau.post('partages/suivi', { ids: mes }, '').then((r) => {
      const vus = lireVus()
      for (const [id, s] of Object.entries(r.suivi)) {
        const neuf = s.commentaires - (vus[id] ?? 0)
        if (neuf > 0) liste.push({ id, texte: s.agent ? 'Une agente de santé a répondu à ton message.' : `${neuf} fille${neuf > 1 ? 's ont' : ' a'} répondu à ton message.`, to: '/fille/partage' })
      }
    }).catch(() => {}).finally(fin)
    return () => { annule = true }
  }, [lieu.pathname])
  useEffect(() => {
    if (!ouvert) return undefined
    const fermer = (e) => { if (bloc.current && !bloc.current.contains(e.target)) setOuvert(false) }
    const echap = (e) => { if (e.key === 'Escape') setOuvert(false) }
    document.addEventListener('click', fermer); document.addEventListener('keydown', echap)
    return () => { document.removeEventListener('click', fermer); document.removeEventListener('keydown', echap) }
  }, [ouvert])
  return (
    <div className="notifications" ref={bloc}>
      <button type="button" className="cloche" aria-label={items.length ? `${items.length} notification(s)` : 'Notifications'} aria-expanded={ouvert} onClick={() => setOuvert((o) => !o)}>
        <IconeCloche />
        {items.length > 0 && <b className="cloche-badge">{items.length}</b>}
      </button>
      {ouvert && (
        <div className="cloche-panneau" role="menu">
          <p className="cloche-titre">Notifications</p>
          {items.length === 0 && <p className="petit">Rien de nouveau pour l’instant.</p>}
          <ul>{items.map((n) => <li key={n.id}><Link to={n.to} onClick={() => setOuvert(false)}>{n.texte}</Link></li>)}</ul>
        </div>
      )}
    </div>
  )
}
