/** Résultat d'un repérage : une couleur, un titre, un conseil. L'information ne repose jamais sur la couleur seule. */
export default function ResultatSoins({ niveau, titre, texte, children }) {
  return (
    <div className={`soin-resultat soin-${niveau}`} role="status" aria-live="polite">
      <b>{titre}</b>
      <p>{texte}</p>
      {children}
    </div>
  )
}
