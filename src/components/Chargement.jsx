/** Indicateurs de chargement : roue, écran complet, et blocs « squelette » pendant que les données arrivent. */

export function Roue({ petite = false }) {
  return <span className={`roue${petite ? ' petite' : ''}`} role="progressbar" aria-label="Chargement" />
}

/** Zone de contenu en cours de chargement. */
export default function Chargement({ texte = 'Chargement…' }) {
  return (
    <div className="chargement-zone" role="status" aria-live="polite">
      <Roue />
      <p>{texte}</p>
    </div>
  )
}

/** Blocs gris à la place des cartes et des tuiles, le temps que les chiffres arrivent. */
export function Squelette({ tuiles = 4, cartes = 2 }) {
  return (
    <div className="squelette" role="status" aria-label="Chargement des données">
      <div className="tableau-kpi">
        {Array.from({ length: tuiles }, (_, i) => <div key={i} className="sq-bloc sq-tuile" />)}
      </div>
      <div className="grille-deux">
        {Array.from({ length: cartes }, (_, i) => <div key={i} className="sq-bloc sq-carte" />)}
      </div>
    </div>
  )
}
