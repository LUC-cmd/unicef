/** Bandeau de titre commun à toutes les pages : même allure partout. */
export default function Bandeau({ surtitre, titre, children, actions }) {
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
