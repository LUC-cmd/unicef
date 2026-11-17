import { Link } from 'react-router-dom'
import Bandeau from '../components/Bandeau.jsx'

const SUJETS = [
  ['Rester à l’école', "Chaque année à l'école compte. Une fille enceinte ou jeune mère garde le droit d'étudier : en parler au directeur et au centre social avant d'arrêter."],
  ['Grossesse et santé', "Une grossesse avant 18 ans présente plus de risques pour la mère et le bébé. Dès les premiers signes, aller au centre de santé : la consultation prénatale protège les deux."],
  ['Parler à quelqu’un de confiance', "Un parent, un enseignant, une agente de santé, un centre social. Aucune question n'est interdite et personne n'a à subir une pression ou une violence."],
  ['Mon corps, mes droits', "Les centres de santé conseillent sur la puberté, les règles et la prévention. Un conseil donné tôt évite bien des difficultés plus tard."],
]

export default function Adolescents() {
  return (
    <>
      <Bandeau surtitre="12 à 17 ans" titre="Adolescentes et adolescents">
        Le fil continue après 5 ans, pour les jeunes mères et les adolescents.
      </Bandeau>
      <main className="page">
        <div className="grille">
          {SUJETS.map(([titre, texte]) => (
            <article className="carte" key={titre}><h2>{titre}</h2><p>{texte}</p></article>
          ))}
        </div>

        <section className="carte">
          <h2>Choisir quand avoir un enfant</h2>
          <p>Au Togo, 17 % des décès de mères touchent des adolescentes de 12 à 19 ans, et 60,9 % des 15-19 ans sexuellement actives n'ont pas de contraception adaptée à leurs besoins (UNICEF Togo, briefing Hack4Children 2026).</p>
          <ul className="liste-coches">
            <li>Il existe plusieurs méthodes de planification familiale. Un professionnel de santé aide à choisir, sans jugement et dans la confidentialité.</li>
            <li>Le préservatif protège aussi des infections. Le centre de santé donne les informations et oriente.</li>
            <li>Après une naissance, attendre avant une nouvelle grossesse protège la mère et le bébé : en parler au centre de santé.</li>
            <li>Personne n'a à subir une pression ou une violence. En cas de doute : <Link to="/signalement">qui prévenir</Link>.</li>
          </ul>
        </section>

        <section className="carte">
          <h2>Quand une adolescente attend un enfant</h2>
          <ul className="liste-coches">
            <li>L'agent la signale comme grossesse à suivre de près : consultations prénatales rapprochées.</li>
            <li>Elle est orientée vers le centre social pour rester à l'école ou apprendre un métier.</li>
            <li>Sa famille est accompagnée : ses proches reçoivent les rappels, avec son accord.</li>
            <li>Après la naissance, la déclaration et le carnet de l'enfant suivent le même chemin que pour toutes les familles.</li>
          </ul>
          <p className="petit">Ces contenus sont des repères de prévention. Ils doivent être validés par le ministère de la Santé et un professionnel de la protection de l'enfance avant diffusion.</p>
        </section>

        <p>
          <Link className="bouton" to="/annuaire">Trouver un centre de santé ou un centre social</Link>{' '}
          <Link className="bouton secondaire" to="/signalement">Une situation inquiétante ?</Link>
        </p>
      </main>
    </>
  )
}
