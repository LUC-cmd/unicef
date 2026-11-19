import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { api } from '../lib/api.js'
import { useAuth } from '../lib/contexte.jsx'
import { lireFile, nombreEnAttente } from '../lib/offline.js'
import Avatar from './Avatar.jsx'

export const ContexteShell = createContext(false)
export const useDansShell = () => useContext(ContexteShell)

const TRACES = {
  accueil: 'M3 11 12 3l9 8M5 10v10h5v-6h4v6h5V10',
  liste: 'M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01',
  plus: 'M12 5v14M5 12h14',
  cle: 'M7 14a4 4 0 1 1 3.9-5H21v3h-2v2h-3v-2h-5.1A4 4 0 0 1 7 14z',
  livre: 'M5 4.5A1.5 1.5 0 0 1 6.5 3H19v16H6.5A1.5 1.5 0 0 0 5 20.5zM5 20.5A1.5 1.5 0 0 0 6.5 22H19',
  carte: 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14',
  graphe: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  boite: 'M3 13h5l1 3h6l1-3h5M5 13 7 5h10l2 8v6H5z',
  batiment: 'M4 21V7l8-4 8 4v14M9 21v-5h6v5M8 10h.01M12 10h.01M16 10h.01',
  horloge: 'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
  bouclier: 'M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6zM9 12l2 2 4-4',
  aide: 'M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7M12 17h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
  coche: 'M5 12l4 4 10-10',
  carnet: 'M7 3h10a2 2 0 0 1 2 2v16l-7-4-7 4V5a2 2 0 0 1 2-2z',
}

export function IconeShell({ nom }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d={TRACES[nom] ?? TRACES.accueil} />
    </svg>
  )
}

function IconeCloche() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8M10.3 21a2 2 0 0 0 3.4 0" />
    </svg>
  )
}

/** Ce qui demande l'attention du rôle connecté : données réelles, rien d'inventé. */
async function chargerNotifications(role) {
  try {
    if (role === 'AGENT' || role === 'ADMIN') {
      const items = []
      const n = nombreEnAttente(lireFile())
      if (n > 0) items.push({ texte: `${n} saisie(s) en attente d'envoi vers la base`, to: role === 'AGENT' ? '/agent/synchronisation' : '/admin/cles' })
      try {
        const alertes = await api.get('/api/agent/alertes')
        const actives = (alertes ?? []).filter((a) => a.statut !== 'CLOTUREE')
        if (actives.length > 0) items.push({ texte: `${actives.length} alerte(s) urgence à traiter`, to: '/agent' })
      } catch { /* pas d'accès ou hors ligne */ }
      return items
    }
    if (role === 'MAIRIE') {
      const liste = await api.get('/api/mairie/declarations?statut=ENVOYEE')
      return liste.length
        ? [{ texte: `${liste.length} déclaration(s) de naissance à traiter`, to: '/mairie/declarations' }]
        : []
    }
    if (role === 'STRUCTURE') {
      const liste = await api.get('/api/structure/demandes?statut=NOUVELLE')
      return liste.length
        ? [{ texte: `${liste.length} demande(s) de familles sans réponse`, to: '/structure/demandes' }]
        : []
    }
    if (role === 'DECIDEUR') {
      const zones = await api.get('/api/decideur/zones')
      const urgentes = zones.filter((z) => !z.masquee && (z.indiceOubli ?? 0) >= 60)
      return urgentes.length
        ? [{ texte: `${urgentes.length} zone(s) à indice d'oubli élevé : une équipe en priorité`, to: '/carte/carte' }]
        : []
    }
  } catch { /* hors ligne ou service indisponible : pas de notification */ }
  return []
}

export function Notifications({ role }) {
  const [ouvert, setOuvert] = useState(false)
  const [items, setItems] = useState([])
  const bloc = useRef(null)
  const lieu = useLocation()

  useEffect(() => {
    let annule = false
    chargerNotifications(role).then((n) => { if (!annule) setItems(n) })
    return () => { annule = true }
  }, [role, lieu.pathname])

  useEffect(() => {
    if (!ouvert) return undefined
    const fermer = (e) => { if (bloc.current && !bloc.current.contains(e.target)) setOuvert(false) }
    const echap = (e) => { if (e.key === 'Escape') setOuvert(false) }
    document.addEventListener('click', fermer)
    document.addEventListener('keydown', echap)
    return () => { document.removeEventListener('click', fermer); document.removeEventListener('keydown', echap) }
  }, [ouvert])

  const total = items.length
  return (
    <div className="notifications" ref={bloc}>
      <button type="button" className="cloche" aria-label={total ? `${total} notification(s)` : 'Notifications'} aria-expanded={ouvert} onClick={() => setOuvert((o) => !o)}>
        <IconeCloche />
        {total > 0 && <b className="cloche-badge">{total}</b>}
      </button>
      {ouvert && (
        <div className="cloche-panneau" role="menu">
          <p className="cloche-titre">Notifications</p>
          {items.length === 0 && <p className="petit">Aucune notification pour le moment.</p>}
          <ul>
            {items.map((n, i) => (
              <li key={i}><Link to={n.to} onClick={() => setOuvert(false)}>{n.texte}</Link></li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

/**
 * Cadre commun des espaces professionnels : menu vertical à gauche, barre horizontale en haut.
 * teinte : la couleur de l'espace (cyan, vert, bleu, orange, nuit) — chaque rôle reconnaît le sien d'un coup d'œil.
 * groupes : [{ titre, liens: [{ to, nom, icone, fin?, badge? }] }]
 */
export default function Shell({ titre, teinte = 'cyan', groupes, children }) {
  const { session } = useAuth()
  const lieu = useLocation()
  const [ouvert, setOuvert] = useState(false)
  const tous = groupes.flatMap((g) => g.liens)
  const actif = [...tous].sort((a, b) => b.to.length - a.to.length)
    .find((l) => (l.fin ? lieu.pathname === l.to : lieu.pathname === l.to || lieu.pathname.startsWith(`${l.to}/`)))

  return (
    <div className={`shell teinte-${teinte}`}>
      <aside className={`shell-menu${ouvert ? ' ouvert' : ''}`} aria-label={`Menu ${titre}`}>
        <div className="shell-entete">
          <Avatar username={session?.username} nom={session?.nomComplet || titre} taille={40} />
          <div><p className="shell-role">{session?.nomComplet || titre}</p><p className="shell-sous">{titre}</p></div>
        </div>
        {groupes.map((g) => (
          <div key={g.titre} className="shell-groupe">
            <p className="shell-groupe-titre">{g.titre}</p>
            <ul>
              {g.liens.map((l) => (
                <li key={l.to}>
                  <NavLink to={l.to} end={l.fin} onClick={() => setOuvert(false)}>
                    <IconeShell nom={l.icone} /><span>{l.nom}</span>{l.badge ? <b className="shell-badge">{l.badge}</b> : null}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </aside>

      <div className="shell-corps">
        <div className="shell-barre shell-barre-mobile">
          <button className="shell-hamburger" type="button" aria-expanded={ouvert} onClick={() => setOuvert((o) => !o)}>Menu</button>
          <p className="shell-fil"><span>{titre}</span><span aria-hidden="true"> › </span><b>{actif?.nom ?? ''}</b></p>
        </div>
        <ContexteShell.Provider value={true}>
          <div className="shell-contenu">{children}</div>
        </ContexteShell.Provider>
      </div>
    </div>
  )
}
