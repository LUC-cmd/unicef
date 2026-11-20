import { useState } from 'react'
import { Link } from 'react-router-dom'
import Bandeau from '../components/Bandeau.jsx'

// « Dans le prototype » : ce qui se teste déjà sur ce site, avec des données fictives.
// « À construire » : ce qui est une idée ou demande une validation (santé, droit, terrain). Rien n'est mesuré sur le terrain.
const PARTIES = {
  fille: {
    nom: 'La jeune fille',
    probleme: 'Beaucoup de jeunes filles n’osent pas demander des protections, n’ont pas de réponse à leurs questions et arrivent tard au centre de santé, parfois déjà enceintes.',
    fait: [
      ['Un compte privé, sans nom', 'Un pseudo, un code personnel et un QR. Tout reste sur le téléphone.', '/connexion'],
      ['Une discussion qui conseille et oriente', 'Elle décrit une douleur de règles : l’assistant pose des questions de sécurité, puis dit quoi faire et envoie vers la borne ou l’hôpital.', '/connexion'],
      ['Son cycle suivi sur plusieurs mois', 'Le calendrier repère un retard ou des cycles irréguliers et suggère d’en parler à une agente de santé.', '/connexion'],
      ['La borne avec son code', 'Elle tape son numéro ou montre son QR : serviettes, préservatifs, bon de consultation anonyme ou antalgique sortent selon sa carte, avec des conseils.', '/borne'],
      ['Questions anonymes par SMS', 'Sans smartphone, avec un numéro pour lire la réponse plus tard.', '/sms'],
    ],
    aconstruire: [
      'Des cartes remises par l’école, l’agent ou le village, avec un droit adapté à chaque âge, fixé avec le ministère de la Santé.',
      'Des codes plus longs et un contrôle de la borne par l’agent, pour éviter qu’on devine un numéro.',
      'Des pairs éducatrices formées, qui répondent aux questions anonymes.',
    ],
  },
  grossesse: {
    nom: 'La grossesse et l’accouchement',
    probleme: 'Les décès de mères et de nouveau-nés viennent souvent d’un retard : on ne sait pas où aller, comment y aller, ni qui prévenir.',
    fait: [
      ['La carte de risque', 'Âge, antécédents, signes de danger : la femme est classée et orientée vers le bon niveau de centre.', '/maternite'],
      ['Le plan d’accouchement', 'Centre prévu, transport, personne de confiance, argent et sac prêts avant la date.', '/maternite'],
      ['Le centre est prévenu avant l’arrivée', 'Un cas urgent apparaît sur le tableau de l’hôpital avec le village d’origine.', '/orientation'],
      ['Les rendez-vous de grossesse rappelés', 'Calendrier des consultations prénatales, renforcé pour les adolescentes, et rappels par SMS.', '/grossesse'],
      ['La ceinture de grossesse', 'Un objet porté à partir du 7e mois : un QR ouvre le plan d’accouchement dans n’importe quel centre.', '/objets'],
    ],
    aconstruire: [
      'Un transport d’urgence organisé avec les villages (moto-ambulance, taxi conventionné), à définir avec les communautés.',
      'Une règle claire avec les centres pour recevoir une adolescente sans lui demander son nom.',
      'La validation de la carte de risque par des sages-femmes et le ministère de la Santé.',
    ],
  },
  maman: {
    nom: 'Après l’accouchement',
    probleme: 'La mère est souvent oubliée après la naissance, alors que les complications graves peuvent arriver dans les premiers jours.',
    fait: [
      ['Les signes de danger pour la mère', 'Saignement important, forte fièvre, maux de tête violents : va tout de suite au centre.', '/maternite'],
      ['Le bien-être de la jeune mère', 'Deux questions de repérage et une orientation vers l’agent de santé.', '/famille/bien-etre'],
      ['Le suivi du nouveau-né fragile', 'Visites aux jours 1, 3 et 7, bracelet, alerte hors des repères.', '/connexion'],
      ['Choisir quand avoir un autre enfant', 'Les méthodes expliquées sans jugement, et l’orientation vers le centre.', '/connexion'],
      ['La crèche pour reprendre l’école ou le travail', 'Un lieu sûr pour l’enfant, pour que la jeune mère ne décroche pas.', '/creches'],
    ],
    aconstruire: [
      'Des visites de la mère, pas seulement du bébé : repères habituels à 24 heures, 3 jours, 7 à 14 jours et 6 semaines, à faire valider.',
      'Un lien avec le retour à l’école des adolescentes, à construire avec les établissements.',
    ],
  },
  enfant: {
    nom: 'L’enfant de 0 à 5 ans',
    probleme: 'Des enfants se perdent entre deux rendez-vous : vaccin manqué, acte jamais retiré, malnutrition vue trop tard.',
    fait: [
      ['Le fil d’or de chaque enfant', 'Un dossier par code, sans nom : vaccins, croissance, éveil, prochain pas.', '/parcours'],
      ['Le ruban MUAC avec QR', 'Mesure du bras, zone de couleur, conseil et orientation vers un nutritionniste.', '/muac'],
      ['Le réseau nutrition', 'Boutiques de produits validés par un agent, nutritionniste, itinéraire depuis le téléphone.', '/nutrition'],
      ['Le bilan de développement', 'Quelques questions par âge à la maison, et un agent prévenu si plusieurs repères manquent.', '/famille/developpement'],
      ['Les messages dans la langue de la famille', 'Voix enregistrées en éwé, kabiyè, mina avec des locuteurs du village.', '/borne'],
    ],
    aconstruire: [
      'Des traductions validées par des locuteurs et des soignants (aucune n’est inventée ici).',
      'Une évaluation sur le terrain avant tout chiffre d’impact.',
    ],
  },
  etat: {
    nom: 'La mairie et la nationalité',
    probleme: 'Sans acte de naissance puis sans nationalité reconnue, un enfant a du mal à entrer à l’école et à accéder aux services.',
    fait: [
      ['La déclaration dans les 45 jours', 'Gratuite dans ce délai : la famille voit les pièces, l’état civil valide ou rejette avec un motif.', '/acte'],
      ['La mairie valide, la nationalité s’ouvre', 'Dès qu’une naissance est validée, un dossier de nationalité s’ouvre avec les pièces à réunir selon la situation des parents.', '/connexion'],
      ['Trois états de l’acte', 'Pas d’acte, acte établi mais non retiré, acte retiré : chaque famille n’est relancée que pour ce qui manque.', '/acte'],
      ['Un SMS de preuve', 'Un numéro de preuve et un code de vérification partent vers la famille à la validation.', '/fonctionnement'],
    ],
    aconstruire: [
      'Les règles exactes de nationalité sont à confirmer avec un juriste et la juridiction compétente avant tout usage réel.',
      'Un branchement aux registres de l’État, décidé par les autorités, pas par ce projet.',
    ],
  },
  donnees: {
    nom: 'Centres de santé et données',
    probleme: 'Des données de santé d’enfants et de jeunes filles ne doivent jamais être exposées, mais elles peuvent aider à mieux planifier si elles sont protégées.',
    fait: [
      ['Des codes, pas des noms', 'Aucun nom, aucune photo, aucune adresse sans accord de la personne.', '/projet'],
      ['Consentement d’abord', 'Rien n’est enregistré sans l’accord de la famille ou de la jeune fille.', '/projet'],
      ['Chaque rôle voit sa zone', 'L’agent voit ses familles, le centre ses cas, le responsable seulement des chiffres par zone.', '/fonctionnement'],
      ['Journal des accès', 'Chaque consultation de dossier est inscrite : qui, quand, quoi.', '/fonctionnement'],
      ['Petites zones masquées', 'Une zone de moins de cinq familles n’est pas détaillée.', '/carte'],
      ['Export agrégé DHIS2', 'Des indicateurs sans nom d’enfant, au format d’échange du système de santé.', '/connexion'],
    ],
    aconstruire: [
      'La loi togolaise n° 2019-014 du 29 octobre 2019 protège les données personnelles. Pour une vraie utilisation : un juriste doit confirmer la base légale, la déclaration à l’autorité de protection des données, la durée de conservation et l’hébergement.',
      'Réutiliser plus tard les données (recherche, planification) : d’abord en agrégé et anonyme. Des données individuelles seulement avec un consentement précis pour cet usage, ou l’autorisation de l’autorité et d’un comité d’éthique, dans une convention écrite avec le ministère de la Santé.',
      'Droits des personnes : voir, corriger et faire effacer ses données, avec une personne à contacter dans chaque centre.',
    ],
  },
  hors: {
    nom: 'Hors réseau, de la grossesse à l’accouchement',
    probleme: 'Dans beaucoup de villages, il n’y a ni réseau ni électricité fiable. Une jeune fille enceinte doit pourtant être suivie jusqu’au bout.',
    fait: [
      ['La borne garde tout en local', 'Elle fonctionne au solaire, garde l’empreinte des cartes et le stock, et envoie des totaux sans nom quand l’agent passe.', '/borne'],
      ['L’agent saisit sans réseau', 'Visites et inscriptions sont gardées sur le téléphone, puis envoyées une seule fois, par réseau ou par clé USB.', '/hors-reseau'],
      ['Les demandes en attente partent plus tard', 'Une alerte ou une demande sans réseau est gardée sur l’appareil et part dès que la connexion revient.', '/orientation'],
      ['Le SMS et le *789#', 'Rappels, questions anonymes et menu sur un téléphone simple.', '/telephone'],
    ],
    aconstruire: [
      'Un point d’appui par village : un relais qui connaît les cartes et peut appeler le centre par radio ou téléphone.',
      'Un essai complet avec une vraie borne et des agents avant de l’annoncer comme fonctionnel.',
    ],
  },
}

const CHAINE = [
  ['Elle a un doute', 'Un retard de règles : elle en parle en privé dans son espace ou à la borne.', '/connexion'],
  ['Bon de consultation anonyme', 'La borne remet un bon : le centre la reçoit sans demander son nom.', '/borne'],
  ['Test et accord', 'Au centre, test de grossesse. Elle donne son accord avant tout enregistrement : un code, jamais un nom.', '/projet'],
  ['Consultations renforcées', 'Calendrier adapté aux adolescentes, rappels par SMS, signes de danger expliqués.', '/grossesse'],
  ['Sans réseau, rien ne s’arrête', 'L’agent saisit sur son téléphone ; la clé USB ou le réseau envoie ensuite.', '/hors-reseau'],
  ['Carte de risque et plan d’accouchement', 'Centre prévu, transport, personne de confiance. Ceinture avec QR à partir du 7e mois.', '/maternite'],
  ['Le centre est prévenu', 'Au premier signe de danger, l’hôpital voit le cas arriver avant elle.', '/orientation'],
  ['Naissance déclarée', 'La mairie valide la déclaration, gratuite dans les 45 jours.', '/acte'],
  ['Nationalité', 'Le dossier de nationalité s’ouvre aussitôt, avec les pièces à réunir.', '/connexion'],
  ['Après la naissance', 'Visites de la mère et du bébé, vaccins, crèche pour reprendre l’école.', '/parcours'],
]

export default function Innovations() {
  const [id, setId] = useState('fille')
  const p = PARTIES[id]
  return (
    <>
      <Bandeau surtitre="Innovation" titre="Une chaîne qui protège, de la jeune fille à l’enfant">Ce que Fil d’Or apporte à chaque étape de la vie, ce qui se teste déjà sur ce site, et ce qu’il reste à construire et à valider.</Bandeau>
      <main className="page ado">
        <div className="borne-onglets" role="group" aria-label="Parties">
          {Object.entries(PARTIES).map(([k, v]) => <button key={k} type="button" className={id === k ? 'actif' : ''} aria-pressed={id === k} onClick={() => setId(k)}>{v.nom}</button>)}
        </div>
        <section className="carte innov-bloc" key={id}>
          <h2>{p.nom}</h2>
          <p><b>Le problème.</b> {p.probleme}</p>
          <h3>Dans le prototype, à essayer</h3>
          <ul className="innov-liste">{p.fait.map(([t, x, to]) => <li key={t}><div><b>{t}</b><p>{x}</p></div><Link className="bouton secondaire petit-bouton" to={to}>Voir</Link></li>)}</ul>
          <h3>À construire et à valider</h3>
          <ul className="liste-coches">{p.aconstruire.map((x) => <li key={x}>{x}</li>)}</ul>
        </section>
        <section className="carte">
          <h2>La chaîne complète : si une jeune fille tombe enceinte</h2>
          <p>Du premier doute jusqu’après la naissance, y compris sans réseau. Chaque étape a une page à essayer.</p>
          <ol className="innov-chaine">{CHAINE.map(([t, x, to], i) => <li key={t} style={{ '--k': i }}><span>{i + 1}</span><div><b>{t}</b><p>{x}</p></div><Link className="bouton secondaire petit-bouton" to={to}>Voir</Link></li>)}</ol>
        </section>
        <ResultatInfo />
      </main>
    </>
  )
}

function ResultatInfo() {
  return <p className="petit">Démonstration avec des données fictives. Les textes de santé, de droit et de nationalité sont des repères généraux à faire valider par des professionnels. Ce n’est pas un service officiel de l’UNICEF.</p>
}
