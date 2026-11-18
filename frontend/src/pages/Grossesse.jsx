import { useState } from 'react'
import { Link } from 'react-router-dom'
import Bandeau from '../components/Bandeau.jsx'
import VideoFiche from '../components/VideoFiche.jsx'
import { KIT_ACCOUCHEMENT, MOIS_GROSSESSE, SIGNES_ALERTE_GROSSESSE } from '../lib/grossesse.js'

/** La grossesse, mois par mois : rendez-vous CPN, exercices illustrés (avec emplacements vidéo),
 *  signes d'alerte et kit d'accouchement. À informer et orienter, jamais à diagnostiquer :
 *  les contenus attendent la validation de professionnels de santé. */
export default function Grossesse() {
  const [mois, setMois] = useState(1)
  const fiche = MOIS_GROSSESSE.find((m) => m.mois === mois)

  return (
    <>
      <Bandeau surtitre="Pour les mamans enceintes" titre="Ma grossesse, mois par mois">
        Ce que le bébé fait, le rendez-vous du centre (CPN), des exercices simples et sûrs chaque mois, et ce
        qui impose d'aller au centre tout de suite. Un adulte peut lire à voix haute ; la voix lira plus tard
        en éwé, kabyè et tem.
      </Bandeau>

      <main className="page">
        <nav className="mois-grossesse" aria-label="Choisir le mois de grossesse">
          {MOIS_GROSSESSE.map((m) => (
            <button
              type="button"
              key={m.mois}
              className={`mois-bouton ${m.mois === mois ? 'actif' : ''}`}
              onClick={() => setMois(m.mois)}
              aria-current={m.mois === mois ? 'true' : undefined}
            >
              Mois {m.mois}
            </button>
          ))}
        </nav>

        <section className="carte grossesse-fiche" aria-live="polite">
          <h2 className="sans-marge">{fiche.titre}</h2>
          <p className="gros">👶 {fiche.bebe}</p>
          <p className="gros">🏥 <b>Le rendez-vous :</b> {fiche.rdv}</p>

          <h3>Les exercices de ce mois</h3>
          <p className="petit">Mouvements doux, arrêtez si ça tire. Ce ne sont pas des soins : en cas de doute, demandez au centre de santé.</p>
          <div className="exercices-grille">
            {fiche.exercices.map((e) => (
              <div className="exercice" key={e.titre}>
                <div className="exercice-texte">
                  <span className="gros-emoji" aria-hidden="true">{e.picto}</span>
                  <b>{e.titre}</b>
                  <p className="petit">{e.consigne}</p>
                  {e.materiel && <p className="petit"><em>Matériel : {e.materiel}.</em></p>}
                </div>
                <VideoFiche titre={`Vidéo : ${e.titre}`} video={fiche.video} consigne={e.consigne} materiel={e.materiel} />
              </div>
            ))}
          </div>

          <p className="carte attention sans-marge">💡 <b>Conseil du mois :</b> {fiche.conseil}</p>
        </section>

        <section className="carte" aria-labelledby="t-alerte">
          <h2 id="t-alerte">🚑 Allez au centre de santé TOUT DE SUITE si…</h2>
          <ul className="liste-points">
            {SIGNES_ALERTE_GROSSESSE.map(([p, t]) => <li key={t} className="gros"><span aria-hidden="true">{p}</span> {t}</li>)}
          </ul>
        </section>

        <section className="carte" aria-labelledby="t-kit">
          <h2 id="t-kit">🧺 Le kit d'accouchement (prêt dès le 7ᵉ mois)</h2>
          <ul className="liste-coches">
            {KIT_ACCOUCHEMENT.map((t) => <li key={t}>{t}</li>)}
          </ul>
          <p className="petit">Le carnet de CPN doit toujours partir avec vous, même la nuit.</p>
        </section>

        <section className="carte" aria-labelledby="t-suite">
          <h2 id="t-suite">Et après ?</h2>
          <p>
            Le jour de la naissance, l'agent peut enregistrer « Le bébé est né » : la déclaration part à la mairie
            (avec les noms, avec votre accord) et le plan de vaccination se crée tout seul. La déclaration est
            <strong> gratuite dans les 45 jours</strong>.
          </p>
          <div className="deux-boutons">
            <Link className="bouton" to="/acte">Les étapes de la déclaration</Link>
            <Link className="bouton secondaire" to="/jeux">Les jeux d'éveil pour le bébé</Link>
          </div>
        </section>

        <p className="source">
          Fil d'Or informe et oriente, il ne remplace jamais le personnel de santé. Ces fiches attendent la
          validation de professionnels (CPN, TPI, PEV) avant tout usage réel.
        </p>
      </main>
    </>
  )
}
