import { Link } from 'react-router-dom'

/** Boutons d'action bien visibles en haut d'un tableau de bord : ce que ce compte peut faire tout de suite. */
export default function ActionsRapides({ actions }) {
  return (
    <section className="carte" aria-label="Actions de cet espace" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', alignItems: 'center' }}>
      <b style={{ marginRight: '0.4rem' }}>Agir maintenant</b>
      {actions.map(([to, nom, principal]) => (
        <Link key={to + nom} className={principal ? 'bouton' : 'bouton secondaire'} to={to}>{nom}</Link>
      ))}
    </section>
  )
}
