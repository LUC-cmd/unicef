import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ecrireSessionReseau, reseau } from '../lib/reseauClient.js'
import { useReseau } from '../lib/contexte.jsx'
import Avatar from './Avatar.jsx'
import ConfirmerSortie from './ConfirmerSortie.jsx'

const ROLES = { national: 'Responsable national', district: 'Responsable de district', agent: 'Agent de santé', centre: 'Centre de santé ou hôpital', ecole: 'Crèche, jardin d’enfants, école', boutique: 'Boutique partenaire', technicien: 'Technicien des bornes', partenaire: 'Partenaire (lecture seule)' }

function IconeCloche() {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8M10.3 21a2 2 0 0 0 3.4 0" /></svg>
}
function IconeMessage() {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d="M4 5h16v11H9l-5 4z" /></svg>
}

/** Dans l'entête de la page : notifications, messages, état du réseau et compte de la personne connectée. */
export default function EnteteReseau({ s }) {
  const { enLigne } = useReseau()
  const nav = useNavigate()
  const [notifs, setNotifs] = useState([])
  const [msg, setMsg] = useState({ nonLus: 0, urgents: 0 })
  const [cloche, setCloche] = useState(false)
  const [menu, setMenu] = useState(false)
  const [confirmer, setConfirmer] = useState(false)
  const bloc = useRef(null)
  const lecture = s.role === 'partenaire'
  useEffect(() => {
    let vivant = true
    const charger = async () => {
      try {
        const n = await reseau.get('notifications', s.jeton); if (vivant) setNotifs(n.notifications)
        if (!lecture) { const m = await reseau.get('messages', s.jeton); if (vivant) setMsg({ nonLus: m.nonLus, urgents: m.urgents }) }
      } catch { /* hors ligne : on garde ce qu'on a */ }
    }
    charger(); const t = setInterval(charger, 15000)
    return () => { vivant = false; clearInterval(t) }
  }, [s.jeton, lecture])
  useEffect(() => {
    if (!cloche && !menu) return undefined
    const dehors = (e) => { if (bloc.current && !bloc.current.contains(e.target)) { setCloche(false); setMenu(false) } }
    const echap = (e) => { if (e.key === 'Escape') { setCloche(false); setMenu(false) } }
    document.addEventListener('mousedown', dehors); document.addEventListener('keydown', echap)
    return () => { document.removeEventListener('mousedown', dehors); document.removeEventListener('keydown', echap) }
  }, [cloche, menu])
  const urgents = notifs.filter((n) => n.niveau === 'urgent').length
  const sortir = () => { setConfirmer(false); ecrireSessionReseau(null); nav('/connexion', { state: { sortie: true } }) }
  return (
    <div className="entete-reseau" ref={bloc}>
      <div className="notifications">
        <button type="button" className="cloche" aria-label={notifs.length ? `${notifs.length} notification(s)` : 'Notifications'} aria-expanded={cloche} onClick={() => { setCloche((o) => !o); setMenu(false) }}>
          <IconeCloche />{notifs.length > 0 && <b className={`cloche-badge${urgents ? ' urgent' : ''}`}>{notifs.length}</b>}
        </button>
        {cloche && (
          <div className="cloche-panneau" role="menu">
            <p className="cloche-titre">Notifications</p>
            {notifs.length === 0 ? <p className="petit">Rien à signaler pour le moment.</p> : (
              <ul>{notifs.map((n, i) => <li key={i} className={n.niveau}><Link to={n.to} onClick={() => setCloche(false)}>{n.texte}</Link></li>)}</ul>
            )}
          </div>
        )}
      </div>
      {!lecture && (
        <Link className="cloche" to="/reseau/messages" aria-label={msg.nonLus ? `${msg.nonLus} message(s) non lu(s)` : 'Messagerie'}>
          <IconeMessage />{msg.nonLus > 0 && <b className={`cloche-badge${msg.urgents ? ' urgent' : ''}`}>{msg.nonLus}</b>}
        </Link>
      )}
      <span className={`etat-reseau-entete ${enLigne ? 'en' : 'hors'}`} role="status" title={enLigne ? 'Connecté au serveur' : 'Hors ligne : les saisies sont gardées sur cet appareil'}>
        <i aria-hidden="true" /><small>{enLigne ? 'en ligne' : 'hors ligne'}</small>
      </span>
      <div className="profil">
        <button type="button" className="profil-bouton" aria-haspopup="menu" aria-expanded={menu} onClick={() => { setMenu((o) => !o); setCloche(false) }} aria-label={`Compte de ${s.nom}`}>
          <Avatar username={s.identifiant} nom={s.nom} taille={40} />
        </button>
        {menu && (
          <div className="profil-menu" role="menu">
            <div className="profil-tete">
              <Avatar username={s.identifiant} nom={s.nom} taille={56} />
              <div><b>{s.nom}</b><span>{ROLES[s.role] ?? s.role}</span><span className={`profil-reseau ${enLigne ? 'en' : 'hors'}`}>{enLigne ? 'En ligne' : 'Hors ligne'}</span></div>
            </div>
            <Link role="menuitem" to="/reseau" onClick={() => setMenu(false)}>Mon tableau de bord</Link>
            {!lecture && <Link role="menuitem" to="/reseau/messages" onClick={() => setMenu(false)}>Messagerie</Link>}
            <Link role="menuitem" to="/reseau/synchro" onClick={() => setMenu(false)}>Hors réseau et synchronisation</Link>
            <button type="button" role="menuitem" className="profil-sortie" onClick={() => { setMenu(false); setConfirmer(true) }}>Se déconnecter</button>
          </div>
        )}
      </div>
      <ConfirmerSortie ouvert={confirmer} texte="Vous quittez votre espace. Ce qui n’est pas encore envoyé reste gardé sur cet appareil." onConfirmer={sortir} onAnnuler={() => setConfirmer(false)} />
    </div>
  )
}
