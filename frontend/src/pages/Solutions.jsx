import { Link } from 'react-router-dom'
import Bandeau from '../components/Bandeau.jsx'

const ETAPES = [
  { t: 'La jeune fille, avant une grossesse', pb: 'Peu d’endroits où poser ses questions sans être jugée, difficulté à obtenir des produits de protection, règles et cycle mal compris.',
    sol: ['Un espace privé sur son téléphone : cycle noté sur plusieurs mois, alertes si retard, méthodes expliquées.', 'La borne du village : questions illustrées, produits non médicamenteux avec une carte à gratter, bon de consultation anonyme.', 'Boîte à questions anonyme et menu SMS pour les téléphones simples.'],
    mesure: 'Nombre de cartes utilisées, de bons de consultation présentés, de questions posées.' },
  { t: 'La grossesse', pb: 'Consultations commencées trop tard, risques non repérés, surtout chez les adolescentes.',
    sol: ['Carte de risque de grossesse et lieu d’accouchement conseillé.', 'Rappels des consultations et signes de danger.', 'Mesure de la tension et de la température à la borne.', 'Réseau nutrition : nutritionniste et boutiques contrôlées.'],
    mesure: 'Part des femmes qui font 4 consultations ou plus, grossesses à risque repérées avant le terme.' },
  { t: 'L’accouchement', pb: 'Les décès viennent surtout d’un retard : on part trop tard, on ne sait pas où aller, le centre n’est pas prévenu.',
    sol: ['Plan d’accouchement préparé : lieu, transport, argent de côté, personne de confiance.', 'Ceinture de grossesse avec QR et pastille de risque.', 'Orientation et alerte envoyée au centre avant l’arrivée, urgences en premier.'],
    mesure: 'Temps entre le premier signe de danger et l’arrivée au centre, accouchements assistés.' },
  { t: 'Après la naissance', pb: 'La mère et le bébé sont peu suivis, la naissance n’est pas déclarée à temps, la jeune mère quitte l’école.',
    sol: ['Signes de danger du nouveau-né et de la mère.', 'Bracelet du nouveau-né avec QR vers le carnet.', 'Rappels de déclaration aux jours 7, 20, 30 et 40.', 'Crèche communautaire et retour aux études.'],
    mesure: 'Naissances déclarées dans les 45 jours, mères revues dans la première semaine, retour en classe.' },
  { t: 'L’enfant de 0 à 5 ans', pb: 'Vaccins manqués, malnutrition repérée tard, maladies graves qui arrivent trop tard au centre.',
    sol: ['Carnet signé qui marche sans réseau et rappelle les vaccins.', 'Ruban MUAC avec QR : zone jaune ou rouge, orientation vers le nutritionniste.', 'Poste de mesures de la borne : fièvre, oxygène, orientation immédiate.', 'Boutiques partenaires contrôlées, visites des agents.'],
    mesure: 'Enfants à jour de leurs vaccins, enfants en zone jaune ou rouge suivis, délai avant consultation.' },
]
const CANAUX = [
  ['Smartphone', 'Application installée, espace privé, fonctionne sans internet une fois installée. Pensé pour Lomé et les villes.'],
  ['Téléphone simple', 'Menu court et SMS, sans internet. Pour celles qui n’ont pas de smartphone.'],
  ['Borne de village', 'Pour celles qui n’ont pas de téléphone ou qui ne lisent pas : pictogrammes, voix en langue locale, produits, mesures.'],
  ['Agent de santé', 'Orientation, dashboard des cas, visites, contrôle des boutiques.'],
  ['Boutique et nutritionniste', 'Produits conseillés remis sur bon, contrôlés à chaque passage.'],
]

export default function Solutions() {
  return (
    <>
      <Bandeau surtitre="Du premier jour à cinq ans" titre="Problèmes et solutions, étape par étape">Pour chaque moment de la vie d’une fille puis de son enfant : le problème, ce que fait Fil d’Or, et ce qu’il faudra mesurer pour savoir si cela réduit la mortalité.</Bandeau>
      <main className="page ado">
        {ETAPES.map((e, i) => (
          <section className="carte" key={e.t}>
            <h2>{i + 1}. {e.t}</h2>
            <h3>Le problème</h3><p>{e.pb}</p>
            <h3>Ce que fait Fil d’Or</h3>
            <ul className="liste-coches">{e.sol.map((x) => <li key={x}>{x}</li>)}</ul>
            <h3>Ce qu’on mesurera</h3><p>{e.mesure}</p>
          </section>
        ))}
        <section className="carte">
          <h2>Qui utilise quoi</h2>
          <ul className="liste-coches">{CANAUX.map(([n, d]) => <li key={n}><b>{n}</b> : {d}</li>)}</ul>
          <p>Voir les objets en 3D et leur fabrication : <Link to="/objets">les objets Fil d’Or</Link>.</p>
        </section>
        <section className="carte">
          <h2>Ce que nous n’affirmons pas</h2>
          <p>Nous ne promettons aucun chiffre de baisse de la mortalité. Un projet pilote dans quelques villages permettrait de mesurer les indicateurs ci-dessus avant d’annoncer un effet. Les repères de santé sont à valider par le ministère de la Santé.</p>
        </section>
      </main>
    </>
  )
}
