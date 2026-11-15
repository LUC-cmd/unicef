import { Link } from 'react-router-dom'
import { IconeAccord, IconeAgent, IconeBouclier, IconeCarnet, IconeEcoute, IconeTelephone, IconeZone } from '../components/Icones.jsx'

const ETAPES = [
  ['Grossesse', 'Rendez-vous prénataux et signes de danger'],
  ['Naissance', "Déclaration à l'état civil, gratuite sous 45 jours"],
  ['0 à 2 ans', 'Vaccins rappelés par SMS, visite si silence'],
  ['5 ans', 'Nutrition, jeux d’éveil, entrée au préscolaire'],
]

const PORTES = [
  { Icone: IconeTelephone, titre: 'Voix et SMS', texte: "Un téléphone basique suffit. La mère appelle, choisit un sujet et écoute un message court dans sa langue. Un SMS rappelle chaque rendez-vous.", lien: '/telephone', action: 'Essayer le téléphone' },
  { Icone: IconeAgent, titre: "L'agent de santé", texte: "Il saisit tout au village, sans réseau, et synchronise au retour. Les familles qui ne répondent pas passent en tête de sa liste.", lien: '/connexion', action: "Entrer comme agent" },
  { Icone: IconeCarnet, titre: 'Le carnet illustré', texte: "Il reste à la maison : pictogrammes, cases à cocher, code famille. Il se lit sans savoir lire et sans électricité.", lien: '/connexion', action: 'Voir un carnet' },
  { Icone: IconeEcoute, titre: "Le point d'écoute", texte: "Centre de santé, radio, causerie : le même message, à voix haute, pour les familles sans téléphone.", lien: '/ecoute', action: 'Ouvrir une séance' },
]

const FAMILLES = [
  {
    nom: 'Akouvi',
    situation: 'Enceinte de 7 mois, un téléphone simple, un peu de réseau.',
    etapes: [
      'Elle appelle Fil d’Or, choisit sa langue et un sujet : grossesse, allaitement, vaccins.',
      'Une voix lui rappelle son rendez-vous, un SMS le lui redit la veille. Signe de danger : on l’oriente vers le centre de santé.',
      'Après la naissance, la déclaration est lancée dès le premier jour.',
      'Chaque semaine, un jeu à faire avec des objets de la maison. Son mari et sa mère reçoivent aussi les rappels.',
    ],
  },
  {
    nom: 'Kokou et Abla',
    situation: 'Pas de téléphone, village sans réseau. Leur fille a 8 mois.',
    etapes: [
      'L’agent leur laisse un carnet en images : rendez-vous et vaccins dessinés.',
      'Il mesure l’enfant au ruban, coche le vaccin sur le carnet et note tout sur son téléphone, sans réseau.',
      'Au centre de santé, tout se synchronise. Un rendez-vous manqué place la famille en haut de sa liste.',
      'Histoires et chansons passent à la radio communautaire.',
    ],
  },
]

const PARCOURS = [
  ["Appeler le 90000031 dans le simulateur", "Choisissez Vaccins, puis Signes de danger. En éwé, la voix n'est pas encore enregistrée et l'application le dit."],
  ['Se connecter en administrateur', 'Avancez le temps de 5 jours : des rendez-vous deviennent manqués et des rappels restent sans réponse.'],
  ["Se connecter en agent de Vo", "La liste est triée par priorité. Cochez « village sans réseau », saisissez un périmètre brachial de 112 mm, lancez une déclaration de naissance."],
  ['Retrouver le réseau', "Décochez « village sans réseau » : la synchronisation part toute seule. La relancer ne crée aucun doublon."],
  ["Valider côté état civil, puis voir la carte", "Le compte mairie valide le dossier pré-rempli. Le compte responsable régional voit l'indice d'oubli par zone."],
]

export default function Accueil() {
  return (
    <>
      <section className="heros-accueil" aria-labelledby="titre-accueil">
        <div className="interieur">
          <div className="heros-grille">
            <div>
              <span className="mention-concours">Hack4Children Togo 2026</span>
              <h1 id="titre-accueil">Ne perdons le fil d'aucun enfant.</h1>
              <p className="chapeau-heros">
                Fil d'Or suit chaque enfant du premier rendez-vous de grossesse jusqu'à 5 ans, avec ou sans téléphone,
                avec ou sans réseau. Quand une famille ne répond plus, le système va la chercher.
              </p>
              <div className="heros-actions">
                <Link className="bouton clair" to="/telephone">Essayer le téléphone</Link>
                <Link className="bouton contour-clair" to="/connexion">Entrer dans la démonstration</Link>
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

      <section className="section blanc" aria-labelledby="titre-constat">
        <div className="interieur">
          <h2 id="titre-constat" className="titre-section">Beaucoup d'enfants se perdent entre deux rendez-vous</h2>
          <p className="chapeau">Un enfant manque un vaccin, une pesée ou son acte de naissance, et personne ne le voit. Voici ce que montrent les chiffres du dossier.</p>
          <div className="chiffres">
            <div className="chiffre"><b>23,8 %</b><span>des enfants de moins de 5 ans en retard de croissance</span></div>
            <div className="chiffre"><b>59 %</b><span>des moins de 5 ans seulement ont un acte de naissance (2017)</span></div>
            <div className="chiffre"><b>34 496</b><span>enfants de 0 à 11 mois sans la 3e dose de vaccin</span></div>
            <div className="chiffre"><b>5 piliers</b><span>santé, nutrition, protection, services sociaux, éveil</span></div>
          </div>
          <p className="source">Source : dossier de candidature (UNICEF et ARCEP, page 7). Les données de la démonstration sont fictives.</p>
        </div>
      </section>

      <section className="section ciel" aria-labelledby="titre-portes">
        <div className="interieur">
          <h2 id="titre-portes" className="titre-section">Quatre portes d'entrée, un seul carnet</h2>
          <p className="chapeau">Chaque famille entre par la porte qui lui convient. Les informations arrivent au même endroit, et rien ne dépend du réseau ou de la lecture.</p>
          <div className="portes">
            {PORTES.map(({ Icone, titre, texte, lien, action }) => (
              <article className="porte" key={titre}>
                <span className="icone"><Icone /></span>
                <h3>{titre}</h3>
                <p>{texte}</p>
                <Link className="bouton secondaire petit-bouton" to={lien}>{action}</Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section blanc" aria-labelledby="titre-familles">
        <div className="interieur">
          <h2 id="titre-familles" className="titre-section">Deux familles, un même fil</h2>
          <p className="chapeau">Akouvi a un téléphone, Kokou et Abla n'en ont pas. Le même carnet suit leurs enfants.</p>
          <div className="familles">
            {FAMILLES.map((f) => (
              <article className="famille" key={f.nom}>
                <h3>{f.nom}</h3>
                <p className="situation">{f.situation}</p>
                <ol>{f.etapes.map((e) => <li key={e}>{e}</li>)}</ol>
              </article>
            ))}
          </div>
          <p style={{ marginTop: '1.5rem' }}><Link className="bouton secondaire" to="/projet">Lire le dossier du projet</Link></p>
        </div>
      </section>

      <section className="section ciel" aria-labelledby="titre-parcours">
        <div className="interieur parcours">
          <div>
            <h2 id="titre-parcours" className="titre-section">Parcourir la démonstration en cinq minutes</h2>
            <p className="chapeau">Les cinq étapes montrent le cœur du système : un rappel sans réponse devient une visite.</p>
            <ol className="scenario">
              {PARCOURS.map(([titre, detail]) => (
                <li key={titre}><div><strong>{titre}</strong><br /><span className="petit">{detail}</span></div></li>
              ))}
            </ol>
          </div>
          <aside className="encart">
            <h3>Ce qui change tout</h3>
            <p>Si un rappel reste sans réponse, la famille passe en haut de la liste de l'agent. <strong>Le système va chercher les enfants qui ne répondent pas.</strong></p>
            <p>Un jeu par jour avec des objets de la maison. Un annuaire des structures proches. Le père ou un grand-parent reçoit un rappel général, jamais le détail.</p>
            <Link className="bouton clair" to="/annuaire">Voir l'annuaire des structures</Link>
          </aside>
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
