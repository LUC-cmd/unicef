/** Marque Fil d'Or : un fil d'or qui part d'un point et suit son chemin. Dessin original. */
export function Marque({ taille = 40 }) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      <rect width="40" height="40" rx="10" fill="#0a74a8" />
      <path d="M8 28 C 14 28 14 13 20 13 C 26 13 26 26 32 26" fill="none" stroke="#e3a71b" strokeWidth="3.4" strokeLinecap="round" />
      <circle cx="8" cy="28" r="2.6" fill="#fff" />
      <circle cx="32" cy="26" r="3.2" fill="#fff" />
    </svg>
  )
}

export default function Logo() {
  return (
    <>
      <Marque />
      <span>
        Fil d'Or
        <small>Suivi de l’enfant, de 0 à 5 ans</small>
      </span>
    </>
  )
}
