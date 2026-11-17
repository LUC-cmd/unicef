import { Link } from 'react-router-dom'
import { useAuth } from '../lib/contexte.jsx'
import { LIBELLE_REGION, regionDeploiement } from '../lib/region.js'

const ESPACE = { AGENT: '/agent', MAIRIE: '/mairie', DECIDEUR: '/carte', STRUCTURE: '/structure', ADMIN: '/admin' }
import { MereEtEnfant } from '../components/Illustrations.jsx'
import { IconeAccord, IconeBouclier, IconeZone } from '../components/Icones.jsx'

const ETAPES = [
  ['Grossesse', 'Rendez-vous prénataux et signes de danger'],
  ['Naissance', "Déclaration à l'état civil, gratuite sous 45 jours"],
  ['0 à 2 ans', 'Vaccins rappelés par SMS, visite si silence'],
  ['5 ans', 'Nutrition, jeux d’éveil, entrée au préscolaire'],
]

export default function Accueil() {
  const { session } = useAuth()
  return (
    <>
      <section className="heros-accueil" aria-labelledby="titre-accueil">
        <div className="interieur">
          <div className="heros-grille">
            <div>
              <span className="mention-concours">Hack4Children Togo 2026</span> <span className="mention-concours region">{LIBELLE_REGION[regionDeploiement()]}</span>
              <h1 id="titre-accueil">Ne perdons le fil d'aucun enfant.</h1>
              <p className="chapeau-heros">
                Fil d'Or suit chaque enfant du premier rendez-vous de grossesse jusqu'à 5 ans, avec ou sans téléphone,
                avec ou sans réseau. Quand une famille ne répond plus, le système va la chercher.
              </p>
              <div className="heros-actions">
                <Link className="bouton clair" to="/visite">Essayer en 5 minutes</Link>
                <Link className="bouton contour-clair" to={session ? (ESPACE[session.role] ?? '/connexion') : '/connexion'}>{session ? 'Ouvrir mon tableau de bord' : 'Ouvrir un tableau de bord'}</Link>
              </div>
            </div>

            <figure className="sms-demo" style={{ margin: 0 }} aria-label="Exemple de SMS reçu par une famille">
              <div className="en-tete"><span>Fil d'Or</span><span>SMS</span></div>
              <div className="fil-sms">
                <div className="bulle recue">
                  Rappel : un rendez-vous de vaccination approche, jeudi au centre de santé. Répondez OK pour confirmer.
                  <small>Jeudi 7 h 30</small>
                </div>
                <div className="bulle envoyee">OK<small>Jeudi 7 h 42</small></div>
                <div className="bulle recue">
                  Merci, rendez-vous noté. Jeu du jour : cacher un objet sous un tissu et le faire chercher.
                  <small>Jeudi 7 h 42</small>
                </div>
              </div>
              <figcaption className="legende-sms">Un téléphone basique suffit. Jamais de nom d'enfant dans un SMS.</figcaption>
            </figure>
          </div>

          <ol className="fil-vie" aria-label="Le fil, de la grossesse à cinq ans">
            {ETAPES.map(([titre, detail]) => (
              <li key={titre}><strong>{titre}</strong><span>{detail}</span></li>
            ))}
          </ol>
        </div>
        <div style={{ height: '3.5rem' }} />
      </section>

      <section className="section blanc" aria-labelledby="titre-entrees">
        <div className="interieur">
          <h2 id="titre-entrees" className="titre-section">Trois portes, selon qui vous êtes</h2>
          <p className="chapeau">Chaque page du site appartient à l'une de ces portes. On ne cherche plus le même sujet à trois endroits.</p>
          <div className="portes-site">
            <article>
              <h3>Une famille</h3>
              <p>Téléphone, jeu du jour, question à l'assistant, centre le plus proche, acte de naissance.</p>
              <Link to="/telephone">Ouvrir le téléphone</Link>
            </article>
            <article>
              <h3>Le terrain</h3>
              <p>Agent, état civil, structure, responsable. Saisie hors réseau, crèches, suivi des adolescentes.</p>
              <Link to="/connexion">Ouvrir un tableau de bord</Link>
            </article>
            <article>
              <h3>Le projet</h3>
              <p>Le parcours de l'enfant, le dossier du concours, la visite guidée en cinq minutes.</p>
              <Link to="/visite">Commencer la visite</Link>
            </article>
          </div>
        </div>
      </section>

      <section className="section blanc" aria-labelledby="titre-constat">
        <div className="interieur">
          <div className="essai-grille"><div className="illustration-bloc"><MereEtEnfant /></div><div><h2 id="titre-constat" className="titre-section">Beaucoup d'enfants se perdent entre deux rendez-vous</h2>
          <p className="chapeau">Un enfant manque un vaccin ou son acte de naissance, et personne ne le voit. Voici les chiffres.</p>
          </div></div>
          <div className="chiffres">
            <div className="chiffre"><b>23,8 %</b><span>des enfants de moins de 5 ans en retard de croissance</span></div>
            <div className="chiffre"><b>17,7 %</b><span>des moins de 5 ans n'ont pas d'acte de naissance</span></div>
            <div className="chiffre"><b>34 496</b><span>enfants de 0 à 11 mois sans la 3e dose de vaccin</span></div>
            <div className="chiffre"><b>27,6 %</b><span>des enfants entrent au préscolaire</span></div>
          </div>
          <p className="source">Sources : dossier de candidature et fiche thématique UNICEF Togo, octobre 2026. Les données de la démonstration sont fictives.</p>
        </div>
      </section>

      <section className="section blanc" aria-labelledby="titre-protection">
        <div className="interieur">
          <h2 id="titre-protection" className="titre-section">La protection de l'enfant passe avant tout</h2>
          <p className="chapeau">Fil d'Or ne garde que ce dont le suivi a besoin, et seulement avec l'accord de la famille.</p>
          <div className="garanties">
            <div className="garantie"><span className="icone"><IconeBouclier /></span><h3>Aucune identité</h3><p>Pas de nom, de photo, d'adresse ni de point GPS précis. Les familles et les enfants sont suivis par un code.</p></div>
            <div className="garantie"><span className="icone"><IconeAccord /></span><h3>Accord de la famille</h3><p>Rien n'est enregistré sans consentement, et la famille peut le retirer à tout moment. Ses données sont alors effacées.</p></div>
            <div className="garantie"><span className="icone"><IconeZone /></span><h3>Accès par rôle et par zone</h3><p>Chaque agent voit sa zone. Chaque consultation est inscrite dans un journal. La carte masque les zones de moins de 5 familles.</p></div>
          </div>
        </div>
      </section>

      <section className="bande-final" aria-label="Entrer dans la démonstration">
        <div className="interieur">
          <div>
            <h2>Voir Fil d'Or fonctionner</h2>
            <p>Le <Link to="/parcours">parcours complet</Link>, le <Link to="/projet">dossier du concours</Link> et la <Link to="/visite">visite en cinq minutes</Link> restent sur leurs pages. Ici, on entre dans un tableau de bord.</p>
          </div>
          <Link className="bouton clair" to="/connexion">Entrer dans la démonstration</Link>
        </div>
      </section>
    </>
  )
}
