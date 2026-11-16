import { useDansShell } from './Shell.jsx'

/** Titre de page. Dans un espace professionnel, c'est un titre compact ; ailleurs, le grand bandeau. */
export default function Bandeau({ surtitre, titre, children, actions }) {
  const dansShell = useDansShell()
  if (dansShell) {
    return (
      <header className="titre-vue">
        <div>
          <h1>{titre}</h1>
          {children && <p>{children}</p>}
        </div>
        {actions && <div className="bandeau-actions">{actions}</div>}
      </header>
    )
  }
  return (
    <section className="bandeau">
      <div className="interieur">
        <div>
          {surtitre && <span className="bandeau-sur">{surtitre}</span>}
          <h1>{titre}</h1>
          {children && <p>{children}</p>}
        </div>
        {actions && <div className="bandeau-actions">{actions}</div>}
      </div>
    </section>
  )
}
