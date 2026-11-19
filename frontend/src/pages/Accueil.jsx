import { Link } from 'react-router-dom'
import { useAuth } from '../lib/contexte.jsx'
import { LIBELLE_REGION, regionDeploiement } from '../lib/region.js'

const ESPACE = { AGENT: '/agent', MAIRIE: '/mairie', DECIDEUR: '/carte', STRUCTURE: '/structure', ADMIN: '/admin' }
import ParcoursCartes from '../components/ParcoursCartes.jsx'
import { MereEtEnfant } from '../components/Illustrations.jsx'
import { IconeAccord, IconeBouclier, IconeZone } from '../components/Icones.jsx'

const TRACES_ETAPE = {
  Grossesse: 'M12 21s-7-4.6-9.2-9A5.3 5.3 0 0 1 12 6.5 5.3 5.3 0 0 1 21.2 12C19 16.4 12 21 12 21z',
  Naissance: 'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6',
  '0 à 2 ans': 'M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6zM9 12l2 2 4-4',
  '5 ans': 'M3 9l9-5 9 5-9 5zM7 11.5V16c0 1.4 2.2 3 5 3s5-1.6 5-3v-4.5',
}
const ETAPES = [
  ['Grossesse', 'Rendez-vous prénataux et signes de danger'],
  ['Naissance', "Déclaration à l'état civil, gratuite sous 45 jours"],
  ['0 à 2 ans', 'Vaccins rappelés par SMS, visite si silence'],
  ['5 ans', 'Nutrition, jeux d’éveil, entrée au préscolaire'],
]

/** Le titre arrive mot par mot ; « fil » est souligné d'un trait d'or qui se trace. */
function TitreAnime() {
  const mots = ['Ne', 'perdons', 'le', 'fil', "d'aucun", 'enfant.']
  return (
    <h1 id="titre-accueil" className="titre-mots">
      {mots.map((m, i) => (
        <span key={m} className={`mot${m === 'fil' ? ' mot-fil' : ''}`} style={{ '--i': i }}>{m}</span>
      ))}
    </h1>
  )
}

/** Plan du site : chaque page a un rôle précis, rien n'est caché. */
const PLAN = [
  ['Découvrir', [
    ['/projet', 'Le projet', 'Le problème, la solution, le carnet et le QR signé'],
    ['/parcours', 'Un enfant, un parcours', 'Les étapes, de la grossesse à 5 ans'],
    ['/fonctionnement', 'Fonctionnement', 'Comment circulent les informations'],
    ['/hors-reseau', 'Logiciel hors réseau', 'L’application bureau et la clé USB'],
  ]],
  ['Essayer', [
    ['/visite', 'Visite guidée', 'La plateforme entière en 5 minutes'],
    ['/famille', 'Espace famille', 'Rappels, notifications, naissance'],
    ['/telephone', 'Simulateur de téléphone', 'SMS, appel vocal et *789#'],
    ['/assistant', 'Assistant', 'Poser une question de santé'],
    ['/jeux', 'Jeux d’éveil', 'Un jeu par jour selon l’âge'],
    ['/grossesse', 'Ma grossesse', 'Mois par mois, CPN et exercices'],
  ]],
  ['Ressources', [
    ['/acte', 'Acte de naissance', 'Les étapes et la gratuité des 45 jours'],
    ['/annuaire', 'Annuaire', 'Centres de santé, crèches, mairies'],
    ['/ecoute', 'Point d’écoute', 'Pour les familles sans téléphone'],
    ['/creches', 'Crèches solidaires', 'La formation des femmes leaders'],
    ['/adolescents', 'Adolescents', 'Informations et orientation'],
    ['/signalement', 'Signaler', 'Une situation inquiétante, tout de suite'],
  ]],
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
              <TitreAnime />
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
                <div className="bulle recue sms-seq" style={{ '--s': 0 }}>
                  Rappel : un rendez-vous de vaccination approche, jeudi au centre de santé. Répondez OK pour confirmer.
                  <small>Jeudi 7 h 30</small>
                </div>
                <div className="bulle envoyee sms-seq" style={{ '--s': 1 }}>OK<small>Jeudi 7 h 42</small></div>
                <div className="bulle recue sms-seq" style={{ '--s': 2 }}>
                  Merci, rendez-vous noté. Jeu du jour : cacher un objet sous un tissu et le faire chercher.
                  <small>Jeudi 7 h 42</small>
                </div>
              </div>
              <figcaption className="legende-sms">Un téléphone basique suffit. Jamais de nom d'enfant dans un SMS.</figcaption>
            </figure>
          </div>

          <ol className="fil-vie" aria-label="Le fil, de la grossesse à cinq ans">
            {ETAPES.map(([titre, detail]) => (
              <li key={titre} style={{ '--k': ETAPES.findIndex((e) => e[0] === titre) }}>
                <i className="fil-puce"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={TRACES_ETAPE[titre]} /></svg></i>
                <strong>{titre}</strong><span>{detail}</span>
              </li>
            ))}
          </ol>
        </div>
        <div style={{ height: '3.5rem' }} />
      </section>

      <section className="section parcours-enfant" aria-labelledby="titre-parcours">
        <div className="interieur">
          <h2 id="titre-parcours" className="titre-section">Un enfant, un parcours</h2>
          <p className="chapeau">De la conception à l'entrée à l'école, un enfant passe d'un service à un autre. Fil d'Or garde le lien à chaque passage.</p>
          <ParcoursCartes />
          <p className="principe">Ce n'est pas l'enfant qui doit s'adapter aux institutions : ce sont les services qui se relient autour de lui.</p>
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

      <section className="section ciel" aria-labelledby="titre-essai">
        <div className="interieur">
          <div className="essai-grille">
          <div>
          <h2 id="titre-essai" className="titre-section">Essayez, tout est manipulable</h2>
          <p className="chapeau">Aucun compte à créer. Cinq étapes, un bouton chacune : appel d'une famille, agent de santé, naissance et acte, carte régionale, jeux des enfants.</p>
          <p className="heros-actions">
            <Link className="bouton" to="/visite">Essayer en 5 minutes</Link>
            <Link className="bouton secondaire" to="/hors-reseau">Voir le mode hors réseau</Link>
          </p>
          </div>
          <figure className="photo-bloc">
            <img src="/partenaires/mesure-bras.jpg" alt="Un agent de santé mesure le bras d'un enfant tenu par sa mère, avec un ruban de mesure" width="1100" height="733" />
            <figcaption>Mesure du périmètre brachial d'un enfant, au village (photo d'illustration).</figcaption>
          </figure>
          </div>
        </div>
      </section>

      <section className="section ciel" aria-labelledby="titre-plan">
        <div className="interieur">
          <h2 id="titre-plan" className="titre-section">Tout le site, en un coup d’œil</h2>
          <p className="chapeau">Chaque page a un rôle clair. Si vous cherchez quelque chose, il est ici.</p>
          <div className="plan-site">
            {PLAN.map(([groupe, liens]) => (
              <div className="plan-groupe" key={groupe}>
                <h3>{groupe}</h3>
                <ul>
                  {liens.map(([to, nom, detail]) => (
                    <li key={to}><Link to={to}><b>{nom}</b><small>{detail}</small></Link></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="petit">
            Les espaces professionnels — agent de santé, état civil (mairie), crèche et structure, responsable
            régional, administrateur — sont derrière la connexion : <Link to="/connexion">se connecter à un espace</Link>.
          </p>
        </div>
      </section>

      <section className="partenaires" aria-label="Concours">
        <div className="interieur partenaires-grille">
          <img className="partenaires-photo" src="/partenaires/enfants-unicef.png" alt="Des enfants en bleu UNICEF, les mains levées" width="390" height="256" />
          <div className="partenaires-texte">
            <img className="partenaires-logo" src="/partenaires/unicef-logo.png" alt="UNICEF" height="72" />
            <h2>Un projet pour le concours Hack4Children Togo 2026</h2>
            <p>Concours organisé avec l'UNICEF et l'ARCEP sur le thème « Un enfant, un parcours ». Fil d'Or est un prototype candidat : ce n'est pas un service officiel de l'UNICEF.</p>
          </div>
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
            <p>Connectez-vous avec un compte de démonstration : agent, état civil, structure ou responsable régional.</p>
          </div>
          <Link className="bouton clair" to="/connexion">Entrer dans la démonstration</Link>
        </div>
      </section>
    </>
  )
}
