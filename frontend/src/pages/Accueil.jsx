import { Link } from 'react-router-dom'

const PORTES = [
  ['1', 'Voix et SMS', "Un téléphone basique suffit. La mère appelle, choisit un sujet, écoute un message court dans sa langue. Un SMS rappelle chaque rendez-vous.", '/telephone', 'Essayer le simulateur'],
  ['2', "L'agent de santé", "Il saisit tout hors ligne, au village, et synchronise au retour du réseau. Les familles sans réponse passent en tête de sa liste.", '/agent', "Ouvrir l'appli de l'agent"],
  ['3', 'Le carnet illustré', "Il reste à la maison : pictogrammes, cases à cocher, code famille. Il se lit sans savoir lire et sans électricité.", '/connexion', 'Voir un carnet'],
  ['4', "Le point d'écoute", "Centre de santé, radio, causerie : le même message, à voix haute, pour les familles sans téléphone.", '/ecoute', 'Ouvrir une séance'],
]

const ETAPES = [
  ['Grossesse', 'Rendez-vous et signes de danger'],
  ['Naissance', 'Déclaration gratuite sous 45 jours'],
  ['Vaccins', 'Rappels, puis visite si silence'],
  ['5 ans', 'Nutrition, jeux, préscolaire'],
]

export default function Accueil() {
  return (
    <main className="page">
      <section className="heros">
        <p className="surtitre">Hack4Children Togo 2026</p>
        <h1>Ne perdons le fil d'aucun enfant.</h1>
        <p>
          Fil d'Or suit chaque enfant de la grossesse à 5 ans. Avec ou sans téléphone, avec ou sans réseau,
          le même carnet suit l'enfant et rien ne se perd en route.
        </p>
        <div className="actions-heros">
          <Link className="bouton" to="/telephone">Ouvrir le téléphone</Link>
          <Link className="bouton secondaire" to="/assistant">Poser une question</Link>
          <Link className="bouton secondaire" to="/connexion">Entrer dans la démo</Link>
        </div>
      </section>

      <ol className="fil-vie" aria-label="Le fil, de la grossesse à cinq ans">
        {ETAPES.map(([titre, detail]) => (
          <li key={titre}><strong>{titre}</strong><span>{detail}</span></li>
        ))}
      </ol>

      <section className="chiffres" aria-label="Ce que disent les chiffres du dossier">
        <article className="chiffre"><b>23,8 %</b><span>des enfants en retard de croissance</span></article>
        <article className="chiffre"><b>≥ 59 %</b><span>des moins de 5 ans avec un acte de naissance (2017)</span></article>
        <article className="chiffre"><b>34 496</b><span>enfants de 0 à 11 mois sans la 3e dose</span></article>
        <article className="chiffre"><b>4 portes</b><span>un seul carnet, même sans réseau</span></article>
      </section>
      <p className="petit">Chiffres du dossier de candidature (sources UNICEF et ARCEP, page 7). Données de la démo : fictives.</p>

      <div className="piliers" aria-label="Cinq piliers">
        {['Santé', 'Nutrition', 'Protection', 'Services sociaux', 'Éveil'].map((p) => <span className="pilier" key={p}>{p}</span>)}
      </div>

      <section className="grille">
        {PORTES.map(([n, titre, texte, lien, action]) => (
          <article className="carte porte" key={n}>
            <span className="numero">{n}</span>
            <h2>{titre}</h2>
            <p>{texte}</p>
            <Link className="bouton secondaire" to={lien}>{action}</Link>
          </article>
        ))}
      </section>

      <div className="deux-colonnes">
        <section className="carte">
          <h2>Parcours du jury, cinq minutes</h2>
          <ol className="scenario">
            <li>Téléphone <b>90000031</b> : appeler Vaccins, puis Signes de danger. En éwé, la voix n'est pas encore enregistrée et l'application le dit.</li>
            <li>Compte <b>admin</b> : avancer de 5 jours. Des rendez-vous deviennent manqués.</li>
            <li>Compte <b>agent.vo</b> : la liste est triée. Cocher « village sans réseau », saisir un périmètre brachial de 112 mm, lancer une déclaration.</li>
            <li>Décocher « village sans réseau » : la synchronisation part. La relancer ne crée aucun doublon.</li>
            <li>Compte <b>mairie</b> pour valider, puis <b>decideur</b> pour la carte. L'assistant répond sans ouvrir de dossier.</li>
          </ol>
        </section>
        <section className="carte">
          <h2>Ce qui change tout</h2>
          <p>
            Si un rappel reste sans réponse, la famille passe en haut de la liste de l'agent.
            <strong> Le système va chercher les enfants qui ne répondent pas.</strong>
          </p>
          <p>Un jeu par jour, avec des objets de la maison. Un annuaire des structures proches. Le père ou un grand-parent reçoit un rappel général, jamais le détail.</p>
          <p><Link className="bouton" to="/annuaire">Voir l'annuaire</Link></p>
          <p className="petit">
            Fil d'Or informe et oriente. Il ne pose aucun diagnostic. Aucun nom, aucune photo, aucun point GPS précis.
            Les contenus de santé doivent être validés avant tout usage réel.
          </p>
        </section>
      </div>
    </main>
  )
}
