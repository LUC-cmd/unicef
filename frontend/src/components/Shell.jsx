import { createContext, useContext, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth, useReseau } from '../lib/contexte.jsx'
import Avatar from './Avatar.jsx'
import Notifications from './Notifications.jsx'

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

/**
 * Cadre commun des espaces professionnels : menu vertical à gauche, barre horizontale en haut.
 * groupes : [{ titre, liens: [{ to, nom, icone, fin?, badge? }] }]
 */
export default function Shell({ titre, groupes, children }) {
  const { session } = useAuth()
  const { enLigne } = useReseau()
  const lieu = useLocation()
  const [ouvert, setOuvert] = useState(false)
  const tous = groupes.flatMap((g) => g.liens)
  const actif = [...tous].sort((a, b) => b.to.length - a.to.length)
    .find((l) => (l.fin ? lieu.pathname === l.to : lieu.pathname === l.to || lieu.pathname.startsWith(`${l.to}/`)))

  return (
    <div className="shell">
      <aside className={`shell-menu${ouvert ? ' ouvert' : ''}`} aria-label={`Menu ${titre}`}>
        <div className="shell-entete">
          <Avatar username={session?.username} nom={session?.nomComplet || titre} taille={44} />
          <div>
            <p className="shell-role">{session?.nomComplet || titre}</p>
            <p className="shell-sous">{titre}{session?.region ? ` · ${session.region}` : ''}</p>
          </div>
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
        <div className="shell-pied">
          <p className="petit">La photo et la déconnexion sont dans le compte, en haut à droite de la page.</p>
        </div>
      </aside>

      <div className="shell-corps">
        <div className="shell-barre">
          <button className="shell-hamburger" type="button" aria-expanded={ouvert} onClick={() => setOuvert((o) => !o)}>Menu</button>
          <p className="shell-fil"><span>{titre}</span><span aria-hidden="true"> › </span><b>{actif?.nom ?? ''}</b></p>
          <div className="shell-outils">
            <span className={`shell-reseau ${enLigne ? 'en' : 'hors'}`} role="status">{enLigne ? 'En ligne' : 'Hors ligne'}</span>
            <Notifications role={session?.role} />
            <div className="shell-identite">
              <div>
                <b>{session?.nomComplet || titre}</b>
                <span>{titre}</span>
              </div>
              <Avatar username={session?.username} nom={session?.nomComplet || titre} taille={36} />
            </div>
          </div>
        </div>
        <ContexteShell.Provider value={true}>
          <div className="shell-contenu">{children}</div>
        </ContexteShell.Provider>
      </div>
    </div>
  )
}
