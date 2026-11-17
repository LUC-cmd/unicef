import { Link } from 'react-router-dom'


const CONSTATS = [
  ['Retard de croissance', '23,8 %', "Près d'un enfant sur quatre grandit moins bien qu'il ne le devrait. Le repérer tôt change la suite."],
  ['Acte de naissance', '17,7 % sans acte', "17,7 % des moins de 5 ans n'ont pas d'acte de naissance (UNICEF Togo, octobre 2026). À Vo, 184 actes sur 454 n'étaient pas retirés (40 %). Sans acte, l'accès à l'école et aux services est plus difficile."],
  ['Préscolaire', '27,6 %', "Seuls 27,6 % des enfants entrent au préscolaire (UNICEF Togo, octobre 2026). Fil d'Or prépare le passage dès 30 mois."],
  ['Vaccination', '34 496', 'Enfants de 0 à 11 mois sans la 3e dose des vaccins contre cinq maladies.'],
  ['Téléphone et internet', '100,31 % de SIM · 4,93 M internet', "Presque une carte SIM par habitant, mais seulement 4,93 millions d'abonnements internet mobile (fin septembre 2025, ARCEP). Le téléphone est répandu, pas internet."],
]

const HORS_RADAR = [
  'Des villages sans réseau ou avec un réseau instable.',
  'Des familles avec un téléphone basique, pas de smartphone.',
  'Des familles avec un seul téléphone partagé, ou sans téléphone.',
  'Des parents qui lisent peu ou parlent surtout une langue locale.',
]

const PORTES = [
  ['Téléphone basique ou smartphone', '1 · Voix et SMS', "La mère appelle (ou fait un appel manqué pour être rappelée), choisit un sujet et écoute un message court dans sa langue. SMS avant chaque rendez-vous. Aucune application ni data."],
  ['Un seul téléphone dans la famille ou chez un proche', '1 et 2', "La famille désigne un numéro relais, avec son accord. Les messages restent généraux ; le détail passe par l'agent."],
  ['Village sans réseau ou réseau instable', "2 · L'agent de santé", "L'agent saisit tout hors ligne pendant sa visite et synchronise dès qu'il retrouve le réseau ou arrive au centre de santé."],
  ['Pas de téléphone du tout', '3 · Le carnet illustré', "Il reste à la maison : pictogrammes des rendez-vous, vaccins et jeux, cases à cocher, code famille. Il se lit sans savoir lire et sans électricité."],
  ['Parents qui lisent peu ou parlent une langue locale', "4 · Le point d'écoute", 'Centre de santé, radio communautaire, causerie, marché : messages audio, histoires et chansons en langue locale pour toutes les familles.'],
]

const PILIERS = [
  ['Santé', "Assistant vocal : on appelle, on choisit un sujet (grossesse, nouveau-né, allaitement, vaccins, hygiène, développement) et on écoute un message court. Rappels de rendez-vous.", "L'agent suit grossesse et vaccins en visite, coche le carnet illustré et repère les signes d'urgence."],
  ['Nutrition', "Conseils d'alimentation selon l'âge, en audio dans sa langue.", 'Mesure au ruban, démonstrations au village, images dans le carnet.'],
  ['Protection', "Déclaration de naissance dès le jour 1 (gratuite sous 45 jours) : reçu horodaté et dossier pré-rempli envoyé à la mairie.", "L'agent ou l'accoucheuse lance la déclaration depuis le village, même hors ligne. L'état civil valide, la famille est prévenue."],
  ['Services sociaux', "Annuaire des structures proches ; la famille demande à être rappelée ou orientée. Rappels aussi pour le père et les grands-parents.", "L'agent relie la famille aux services. Les zones où seul l'agent peut aller apparaissent sur la carte."],
  ['Éveil, préscolaire', "Un jeu par jour avec des objets de la maison (fruits, graines, feuilles). Histoires et chansons en langue locale.", "Cartes de jeux dans le carnet, fiches imprimables, histoires à la radio ou au point d'écoute."],
]

const INDICATEURS = [
  ['Plus d’enfants vaccinés et suivis à temps', 'Rendez-vous et vaccins réalisés après un rappel, par rapport au départ du pilote.'],
  ['Plus de naissances déclarées dans les 45 jours', 'Nombre de naissances déclarées dans le délai gratuit, par zone pilote.'],
  ['Une malnutrition repérée plus tôt', 'Enfants mesurés au ruban et orientés vers un centre de santé si besoin.'],
  ['Plus de jeux d’éveil à la maison', 'Activités faites et part des familles qui font le jeu de la semaine.'],
  ['Des structures qui orientent les familles', 'Demandes adressées aux structures, réponses obtenues, satisfaction des utilisateurs.'],
  ['Aucune famille laissée hors du fil', 'Part des familles atteintes par chaque porte, et nombre de familles passées de « sans réponse » à « visitées ».'],
]

const ROUTE = [
  ['Prototype', 'Demi-finale du 23 novembre, données fictives'],
  ['Version jury', 'Finale du 10 décembre, retours intégrés'],
  ['Pilote', 'Zone de Grand Lomé et villages ; accord des autorités de santé, contenus validés'],
  ['Extension', 'Plus de langues locales, nutrition approfondie'],
  ['Protection', 'Module confidentiel, avec partenaire institutionnel et protocole officiel'],
  ['Afrique', 'Pays où le mobile est répandu et le réseau inégal'],
]

const EQUIPE = [
  ['Voix et SMS', 'Serveur vocal, rappels SMS, appel manqué, messages en langues locales.'],
  ['Application et données', "Appli de l'agent hors ligne, carnet unique, carte, sécurité des données."],
  ['Contenus et terrain', "Messages de santé validés, jeux d'éveil, carnet illustré, tests avec agents et familles."],
  ['Partenariats et pilotage', 'Centres de santé, mairies, associations, démarches légales, pilote, budget.'],
]

const DROITS_ENFANT = [
  "Fil d'Or informe et oriente. Il ne pose aucun diagnostic et ne prescrit aucun traitement.",
  'Les contenus de santé sont validés par des professionnels avant diffusion.',
  "En cas de signe d'urgence, on invite à contacter un professionnel ou un centre de santé.",
  "Jamais de nom, de photo, d'adresse, de position exacte ni d'histoire personnelle d'un enfant sur la carte ou en public.",
  "Le suivi des signalements est réservé aux professionnels autorisés. Ce n'est pas une application publique de dénonciation.",
  "Toute intervention suit les procédures officielles de protection de l'enfance, avec respect de sa dignité et de sa parole selon son âge.",
]

const DROITS_DONNEES = [
  'Cadre : loi n° 2019-014 du 29 octobre 2019 sur les données à caractère personnel, contrôlée par l’IPDCP. Les données de santé sont sensibles (art. 21 et 24).',
  'Avant tout test réel : déclaration à l’IPDCP (art. 6) et, pour la santé, demande d’autorisation (art. 8). Accord écrit des familles, aucun appel enregistré.',
  'Minimum de données : code famille plutôt que nom, accès par rôle, journal des accès, chiffrement, sauvegardes, durée de conservation limitée.',
  'Hébergement : transfert hors du Togo seulement avec information préalable de l’IPDCP et pays offrant une protection suffisante (art. 28).',
  'Partenaires officiels : ministère de la Santé, mairies, action sociale. Sans eux, aucun vrai dossier de protection ni d’état civil n’est traité.',
]

const SOURCES = [
  ['UNICEF Togo : survie et développement de l’enfant', 'Retard de croissance de 23,8 % ; 34 496 enfants de 0 à 11 mois sans la 3e dose des vaccins contre cinq maladies. Aucune année n’est indiquée sur la page.'],
  ['UNICEF Togo : « Vers l’enregistrement universel des naissances » (5 avril 2024)', 'Au moins 59 % des moins de 5 ans avec acte de naissance (MICS 2017, à actualiser) ; déclaration gratuite depuis le 1er janvier 2022, délai de 45 jours ; jugement supplétif à 6 000 FCFA.'],
  ['Téléphonie mobile au Togo (données ARCEP, Bénin Web TV)', '100,31 % de pénétration en cartes SIM, environ 8,69 millions d’abonnés, 4,93 millions d’abonnements internet mobile (fin septembre 2025). Mesure des cartes SIM, pas des personnes.'],
  ['Loi n° 2019-014 du 29 octobre 2019 (Journal officiel)', 'Données personnelles : sensibles (art. 21, 24), déclaration (art. 6), autorisation (art. 8), transferts (art. 28).'],
]

const A_VERIFIER = [
  'La couverture réseau et la part de familles sans téléphone dans les zones pilotes.',
  'Quel opérateur permet de recevoir des appels et d’envoyer des SMS au Togo ; si les voix en éwé, kabyè et tem peuvent être enregistrées avec des locuteurs natifs.',
  'Les règles sur la santé, la protection de l’enfance et l’état civil, avec des professionnels, dont la valeur légale d’un reçu horodaté.',
  'La validation des contenus de santé, et la mise à jour des chiffres UNICEF non datés.',
]

function Tableau({ colonnes, lignes }) {
  return (
    <div className="tableau-conteneur">
      <table>
        <thead><tr>{colonnes.map((c) => <th key={c}>{c}</th>)}</tr></thead>
        <tbody>
          {lignes.map((l) => (
            <tr key={l[0]}>{l.map((c, i) => (i === 0 ? <th scope="row" key={i}>{c}</th> : <td key={i}>{c}</td>))}</tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function Projet() {
  return (
    <>
      <section className="tete-page">
        <div className="interieur">
          <span className="mention-concours">Candidature Hack4Children Togo 2026</span>
          <h1>Un carnet unique, de la grossesse à 5 ans</h1>
          <p>Fil d'Or suit chaque enfant avec ou sans téléphone, avec ou sans réseau. Cette page reprend le dossier de candidature : le problème, la solution, l'impact attendu, la feuille de route, l'équipe et les garanties pour les enfants et leurs données.</p>
        </div>
      </section>

      <section className="section blanc" id="probleme">
        <div className="interieur">
          <h2 className="titre-section">Les enfants les plus fragiles sont aussi les plus loin de l'information</h2>
          <p className="chapeau">Retard de croissance, vaccins manquants, enfants sans acte de naissance : ces problèmes se cumulent, surtout là où le réseau, la route et le téléphone manquent. Un rappel au bon moment ou un conseil simple suffit souvent, mais il n'arrive pas.</p>
          <Tableau colonnes={['Constat', 'Chiffre', 'Ce que cela veut dire']} lignes={CONSTATS} />
          <p className="source">La déclaration à l'état civil est gratuite depuis le 1er janvier 2022 dans un délai de 45 jours. Passé ce délai, il faut un jugement supplétif à 6 000 FCFA. Beaucoup de familles l'ignorent.</p>
          <div className="deux-colonnes" style={{ marginTop: '2rem' }}>
            <div>
              <h3>Ce que ces chiffres cachent : les familles hors du radar</h3>
              <ul className="liste-points">{HORS_RADAR.map((t) => <li key={t}>{t}</li>)}</ul>
            </div>
            <div className="encart">
              <h3>Notre principe</h3>
              <p>Partir de la famille la plus difficile à atteindre, et non de la plus connectée. <strong>Si ça marche pour elle, ça marche pour toutes.</strong></p>
              <p>Un même enfant a besoin de cinq domaines à la fois : santé, nutrition, protection, services sociaux et préscolaire. Chacun est suivi par une structure différente qui ne se parle pas toujours. Fil d'Or les relie autour de chaque enfant.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section ciel" id="solution">
        <div className="interieur">
          <h2 className="titre-section">Quatre portes d'entrée, un seul carnet</h2>
          <p className="chapeau">Si une porte est fermée par le réseau, le téléphone ou la langue, une autre s'ouvre, et les informations convergent toujours vers le même carnet.</p>
          <Tableau colonnes={['Situation de la famille', 'Porte', 'Comment l’enfant est suivi']} lignes={PORTES} />
          <p className="source"><strong>Ce qui change tout :</strong> si un rappel reste sans réponse, la famille passe automatiquement en haut de la liste de visites de l'agent. Le système va chercher les enfants qui ne répondent pas.</p>
          <p><Link className="bouton" to="/connexion">Voir le système fonctionner</Link></p>
        </div>
      </section>

      <section className="section blanc" id="piliers">
        <div className="interieur">
          <h2 className="titre-section">Cinq piliers, deux façons de les tenir</h2>
          <p className="chapeau">Chaque pilier est couvert pour les familles qui ont un téléphone, et pour celles qui n'ont ni réseau ni téléphone.</p>
          <Tableau colonnes={['Pilier', 'Avec un téléphone', 'Sans réseau ni téléphone']} lignes={PILIERS} />
        </div>
      </section>

      <section className="section ciel" id="impact">
        <div className="interieur">
          <h2 className="titre-section">Des enfants suivis à temps, des zones oubliées enfin visibles</h2>
          <p className="chapeau">Nous n'avançons pas de chiffre cible : il n'existe pas de point de départ par zone. Le pilote l'établira avec les partenaires, puis nous fixerons des objectifs.</p>
          <Tableau colonnes={['Ce qui doit changer', 'Comment nous le mesurerons']} lignes={INDICATEURS} />
          <div className="deux-colonnes" style={{ marginTop: '2rem' }}>
            <div className="carte">
              <h3 style={{ marginTop: 0 }}>Pour les familles</h3>
              <ul className="liste-points">
                <li>Moins de déplacements inutiles et moins de rendez-vous oubliés.</li>
                <li>Un enfant qui existe légalement dès la naissance, ce qui facilite l'accès à l'école et aux services.</li>
                <li>Un jeu, une histoire, une chanson chaque semaine, même sans écran.</li>
              </ul>
            </div>
            <div className="carte">
              <h3 style={{ marginTop: 0 }}>Pour les structures et les décideurs</h3>
              <ul className="liste-points">
                <li>Moins d'enfants perdus de vue entre deux structures.</li>
                <li>Une carte pour choisir où envoyer une équipe mobile ou installer un relais.</li>
                <li>Une contribution à l'ODD 16.9, identité légale pour tous.</li>
              </ul>
            </div>
          </div>
          <p className="source"><strong>Comment le projet continue.</strong> Les contenus essentiels restent gratuits pour les familles. Subventions, partenariats avec les communes, associations, ONG et structures éducatives, et soutiens privés financent la maintenance, la validation des contenus, les supports imprimés et la formation des agents. Le développement se fait par étapes, selon les résultats du pilote.</p>
        </div>
      </section>

      <section className="section blanc" id="feuille-de-route">
        <div className="interieur">
          <h2 className="titre-section">Feuille de route</h2>
          <p className="chapeau">Nous n'avons pas encore de produit fini. La démonstration n'utilise que des données fictives.</p>
          <ol className="feuille-route">
            {ROUTE.map(([titre, detail]) => <li key={titre}><strong>{titre}</strong><span>{detail}</span></li>)}
          </ol>
        </div>
      </section>

      <section className="section ciel" id="equipe">
        <div className="interieur">
          <h2 className="titre-section">Une équipe de 4 jeunes Togolais</h2>
          <p className="chapeau">Deux filles et deux garçons, de 15 à 25 ans, avec des profils en informatique et en gestion.</p>
          <div className="portes">
            {EQUIPE.map(([titre, detail]) => (
              <article className="porte" key={titre}><h3>{titre}</h3><p>{detail}</p></article>
            ))}
          </div>
        </div>
      </section>

      <section className="section blanc" id="droits">
        <div className="interieur">
          <h2 className="titre-section">L'enfant d'abord : droits, protection et données</h2>
          <div className="deux-colonnes" style={{ marginTop: '1.5rem' }}>
            <div className="carte">
              <h3 style={{ marginTop: 0 }}>Les droits et la protection de l'enfant</h3>
              <ul className="liste-points">{DROITS_ENFANT.map((t) => <li key={t}>{t}</li>)}</ul>
              <p className="petit">Fil d'Or ne remplace ni les parents, ni les éducateurs, ni les professionnels.</p>
            </div>
            <div className="carte">
              <h3 style={{ marginTop: 0 }}>La protection des données</h3>
              <ul className="liste-points">{DROITS_DONNEES.map((t) => <li key={t}>{t}</li>)}</ul>
            </div>
          </div>
        </div>
      </section>

      <section className="section ciel" id="sources">
        <div className="interieur">
          <h2 className="titre-section">Sources et vérifications</h2>
          <p className="chapeau">Sources consultées le 8 novembre 2026.</p>
          <Tableau colonnes={['Source', 'Ce que nous en retenons']} lignes={SOURCES} />
          <h3 style={{ marginTop: '2rem' }}>Ce que nous vérifierons avant le pilote</h3>
          <ul className="liste-points">{A_VERIFIER.map((t) => <li key={t}>{t}</li>)}</ul>
          <p className="source">Fil d'Or est un prototype à construire avec les agents de santé, les services d'état civil et les familles. Nous avançons seulement quand un partenaire officiel et un protocole validé garantissent la sécurité de l'enfant.</p>
        </div>
      </section>
    </>
  )
}
