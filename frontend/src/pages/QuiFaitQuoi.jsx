import Bandeau from '../components/Bandeau.jsx'
import { A_VALIDER, CHAINE, DEPLOIEMENT, HORS_LIGNE, ROLES, ROLES_EXTRA } from '../lib/quiFaitQuoi.js'

/** Qui crée, qui envoie, qui reçoit, qui fait quoi, et comment on déploie, hors ligne comme en ligne. */
export default function QuiFaitQuoi({ dans = false }) {
  return (
    <>
      <Bandeau surtitre="Fonctionnement" titre="Qui fait quoi, et comment on déploie">De l’agent dans le village jusqu’au responsable national : qui crée, qui envoie, qui reçoit, qui décide. Et comment tout marche avec ou sans réseau.</Bandeau>
      <main className={dans ? '' : 'page'}>
        <section className="carte">
          <h2>La chaîne, du terrain au pays</h2>
          <ol className="chaine">{CHAINE.map(([qui, quoi]) => <li key={qui}><b>{qui}</b><span>{quoi}</span></li>)}</ol>
        </section>
        <section className="carte">
          <h2>Chaque rôle</h2>
          <div className="roles-grille">
            {[...ROLES, ...ROLES_EXTRA].map((r) => (
              <article key={r.id} className="role">
                <h3>{r.nom}</h3>
                <p className="petit">{r.ou}</p>
                <dl>
                  <dt>Crée</dt><dd>{r.cree}</dd>
                  <dt>Envoie</dt><dd>{r.envoie}</dd>
                  <dt>Reçoit</dt><dd>{r.recoit}</dd>
                  <dt>Fait</dt><dd>{r.fait}</dd>
                  <dt>Ne fait pas</dt><dd>{r.pas}</dd>
                  <dt>Sans réseau</dt><dd>{r.horsLigne}</dd>
                </dl>
              </article>
            ))}
          </div>
        </section>
        <section className="carte">
          <h2>Hors ligne, en ligne : ce qui se passe</h2>
          <dl className="doc-liste">{HORS_LIGNE.map(([t, x]) => <div key={t}><dt>{t}</dt><dd>{x}</dd></div>)}</dl>
        </section>
        <section className="carte">
          <h2>Comment on déploie</h2>
          <ol className="etapes-deploiement">{DEPLOIEMENT.map(([t, x]) => <li key={t}><b>{t}</b><p>{x}</p></li>)}</ol>
        </section>
        <section className="carte">
          <h2>Ce qui reste à valider</h2>
          <ul className="liste-coches">{A_VALIDER.map((x) => <li key={x}>{x}</li>)}</ul>
        </section>
      </main>
    </>
  )
}
