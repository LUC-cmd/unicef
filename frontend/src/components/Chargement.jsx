/** Indicateurs de chargement : roue, écran complet avec logo, et blocs « squelette » pendant que les données arrivent. */

export function Roue({ petite = false }) {
  return <span className={`roue${petite ? ' petite' : ''}`} role="progressbar" aria-label="Chargement" />
}

/** Le logo entouré d'un fil d'or qui tourne : même signature que l'écran de démarrage. */
function Chargeur({ taille }) {
  return (
    <span className="chargeur" style={{ '--t': `${taille}px` }} aria-hidden="true">
      <svg viewBox="0 0 128 128"><circle className="chargeur-piste" cx="64" cy="64" r="58" /><circle className="chargeur-fil" cx="64" cy="64" r="58" /></svg>
      <img src="/logo-rond.png" alt="" />
    </span>
  )
}

/** Zone de contenu en cours de chargement, avec le logo et son fil d'or. */
export default function Chargement({ texte = 'Chargement…', pleinEcran = false }) {
  return (
    <div className={pleinEcran ? 'chargement-plein' : 'chargement-zone'} role="status" aria-live="polite">
      <Chargeur taille={pleinEcran ? 112 : 64} />
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
