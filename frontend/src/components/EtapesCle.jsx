import { taille } from '../lib/usbLocal.js'

/** Trois étapes, la bonne est en couleur. */
export function EtapesCle({ courante, etapes }) {
  return (
    <ol className="etapes-cle-visuel" aria-label="Étapes">
      {etapes.map(([titre, aide], i) => (
        <li key={titre} className={i + 1 < courante ? 'fait' : i + 1 === courante ? 'en-cours' : ''} aria-current={i + 1 === courante ? 'step' : undefined}>
          <i aria-hidden="true">{i + 1 < courante ? '✓' : i + 1}</i>
          <span><b>{titre}</b><small>{aide}</small></span>
        </li>
      ))}
    </ol>
  )
}

/** Une clé détectée, ou l'explication pour la trouver. */
export function CleDetectee({ cle, children }) {
  return (
    <div className="cle-detectee">
      <svg viewBox="0 0 48 48" width="44" height="44" aria-hidden="true"><rect x="14" y="4" width="20" height="10" rx="2" fill="#374EA2" /><rect x="10" y="14" width="28" height="30" rx="5" fill="#1CABE2" /><rect x="18" y="8" width="4" height="4" fill="#fff" /><rect x="26" y="8" width="4" height="4" fill="#fff" /></svg>
      <div>
        <b>{cle.nom} ({cle.id})</b>
        <p className="petit">{cle.libre ? `${taille(cle.libre)} libres` : 'Prête'}{cle.fichiers?.length ? ` · ${cle.fichiers.length} fichier(s) Fil d'Or` : ''}</p>
      </div>
      {children}
    </div>
  )
}

export function AucuneCle() {
  return (
    <div className="aucune-cle" role="status">
      <div className="cle-pulse" aria-hidden="true" />
      <div>
        <b>En attente d'une clé USB…</b>
        <p className="petit">Branchez la clé sur l'ordinateur. Elle apparaît dans l'explorateur, sous « Ce PC », comme un lecteur amovible (E:, F:…). Cet écran la détecte tout seul.</p>
      </div>
    </div>
  )
}
