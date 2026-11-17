import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

/** Ce que chaque rôle doit voir en arrivant. Ce ne sont pas des alertes inventées : des portes vers le travail déjà dans son espace. */
const PAR_ROLE = {
  AGENT: [
    ['Visites à faire en premier', 'Les familles sans réponse remontent dans la liste.', '/agent/visites'],
    ['Inscrire une famille', 'Avec son accord, même sans réseau.', '/agent/inscription'],
    ['Envoi et clé USB', 'Ce qui attend encore de partir dans la base.', '/agent/synchronisation'],
  ],
  MAIRIE: [
    ['Déclarations à traiter', 'Les dossiers arrivent déjà remplis.', '/mairie/declarations'],
    ['Actes à retirer', 'Les familles prévenues, l’acte pas encore retiré.', '/mairie/actes'],
    ['Vérifier une preuve', 'Le SMS n’est pas l’acte. La preuve se contrôle ici.', '/mairie/preuve'],
  ],
  STRUCTURE: [
    ['Demandes des familles', 'Rappel ou orientation, par code, sans numéro.', '/structure/demandes'],
    ['Fiche publique', 'Horaires et visibilité dans l’annuaire.', '/structure/fiche'],
  ],
  DECIDEUR: [
    ['Carte des zones', 'Où envoyer une équipe, jamais un enfant.', '/carte/carte'],
    ['Comparer les zones', 'Les taux, pas les noms.', '/carte/zones'],
    ['Où l’enfant se perd', 'Les ruptures entre deux services.', '/carte/ruptures'],
  ],
  ADMIN: [
    ['Services', 'Site, API, base, assistant.', '/admin'],
    ['Comptes', 'Un compte par rôle et par zone.', '/admin/acces'],
    ['Horloge', 'Avancer le temps de la démonstration.', '/admin/horloge'],
    ['Clés USB reçues', 'Les saisies faites sans réseau.', '/admin/cles'],
  ],
}

export default function Notifications({ role }) {
  const items = PAR_ROLE[role] ?? []
  const [ouvert, setOuvert] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!ouvert) return undefined
    const dehors = (e) => { if (ref.current && !ref.current.contains(e.target)) setOuvert(false) }
    const echap = (e) => { if (e.key === 'Escape') setOuvert(false) }
    document.addEventListener('mousedown', dehors)
    document.addEventListener('keydown', echap)
    return () => { document.removeEventListener('mousedown', dehors); document.removeEventListener('keydown', echap) }
  }, [ouvert])
  if (items.length === 0) return null
  return (
    <div className="notif" ref={ref}>
      <button type="button" className="notif-bouton" aria-expanded={ouvert} aria-label={`${items.length} choses à voir`} onClick={() => setOuvert((o) => !o)}>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M6 9a6 6 0 1 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9M10 20a2 2 0 0 0 4 0" strokeLinecap="round" strokeLinejoin="round" /></svg>
        <b>{items.length}</b>
      </button>
      {ouvert && (
        <div className="notif-panneau" role="menu">
          <p className="notif-titre">À voir dans cet espace</p>
          {items.map(([titre, detail, to]) => (
            <Link key={to} to={to} role="menuitem" onClick={() => setOuvert(false)}>
              <b>{titre}</b>
              <span>{detail}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
