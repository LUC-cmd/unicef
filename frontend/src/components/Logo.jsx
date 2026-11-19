/** Marque Fil d'Or : logo mère–enfant avec fil d'or. Image internationale. */
export function Marque({ taille = 44 }) {
  return (
    <img
      src="/logo-fildor.png"
      alt="Fil d'Or"
      width={taille}
      height={taille}
      className="marque-logo"
      style={{ objectFit: 'contain', borderRadius: '50%' }}
    />
  )
}

export default function Logo() {
  return (
    <>
      <Marque />
      <span>
        Fil d'Or
        <small>Suivi de l'enfant, de 0 à 5 ans</small>
      </span>
    </>
  )
}
