/** Indicateurs de chargement : roue, écran complet avec logo, et blocs « squelette » pendant que les données arrivent. */

export function Roue({ petite = false }) {
  return <span className={`roue${petite ? ' petite' : ''}`} role="progressbar" aria-label="Chargement" />
}

/** Zone de contenu en cours de chargement — avec logo animé. */
export default function Chargement({ texte = 'Chargement…', pleinEcran = false }) {
  if (pleinEcran) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', background: 'linear-gradient(135deg, #f0f8ff 0%, #e8f4fd 100%)',
        gap: '1.2rem', padding: '2rem',
      }} role="status" aria-live="polite">
        <img src="/logo-fildor.png" alt="Fil d'Or" style={{
          width: 80, height: 80, borderRadius: '50%', objectFit: 'cover',
          animation: 'pulseLogo 1.6s ease-in-out infinite',
          boxShadow: '0 4px 20px rgba(28,171,226,0.25)',
        }} />
        <Roue />
        <p style={{ color: '#1cabe2', fontWeight: 600, fontSize: '1.05rem' }}>{texte}</p>
        <style>{`
          @keyframes pulseLogo {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.08); opacity: 0.85; }
          }
        `}</style>
      </div>
    )
  }
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
