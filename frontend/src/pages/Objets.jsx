import { useState } from 'react'
import { Link } from 'react-router-dom'
import Bandeau from '../components/Bandeau.jsx'
import Borne3D, { Carte3D } from '../components/Borne3D.jsx'
import { Bracelet3D, Ceinture3D } from '../components/Objets3D.jsx'

const OBJETS = {
  borne: {
    nom: 'Borne de village', vue: () => <Borne3D />, lien: ['/borne', 'Essayer la borne'],
    sert: 'Un point où chacune peut poser ses questions, se mesurer (température, tension, oxygène) et retirer des produits avec une carte à gratter. Elle dit où aller selon l’urgence et prévient le centre. Elle marche sans réseau grâce au panneau solaire.',
    qui: 'Jeunes filles, mamans, enfants accompagnés, y compris celles qui n’ont pas été à l’école : écran à pictogrammes et voix en langue locale.',
    etapes: [
      'Faire une maquette en carton et en bois pour tester la taille, l’écran et le clavier avec des jeunes filles et des mamans.',
      'Assembler l’électronique : petit ordinateur, écran, clavier robuste, haut-parleur, batterie et panneau solaire.',
      'Acheter des appareils de mesure homologués (thermomètre sans contact, tensiomètre, oxymètre) auprès de fournisseurs agréés.',
      'Fabriquer le coffre en métal ou en bois traité, avec une trappe verrouillée, à l’abri de la pluie et de la poussière.',
      'Installer une première borne dans un village, avec un agent de santé qui la recharge et la surveille.',
      'Faire valider les produits, les seuils et les règles par le ministère de la Santé, puis produire une petite série avec des artisans locaux.',
    ],
  },
  carte: {
    nom: 'Carte à gratter', vue: () => <Carte3D code="48271639" quota="4 serviettes, 4 préservatifs, 1 bon : exemple fictif" />, lien: ['/borne', 'Essayer avec la borne'],
    sert: 'Donner à chaque jeune fille un numéro rien qu’à elle, avec un droit de retrait limité par produit. Rien sur la carte n’indique la santé : elle ressemble à une carte de recharge.',
    qui: 'Jeunes filles, remise par une agente de santé, une école ou un village, sans noter de nom.',
    etapes: [
      'Concevoir une carte neutre, avec une zone à gratter qui cache le numéro et un QR pour la borne.',
      'Générer des lots de numéros avec chiffre de contrôle, et charger leur empreinte dans la borne, jamais les numéros.',
      'Décider avec le ministère et les centres quel droit chaque carte donne, selon l’âge.',
      'Imprimer par petites séries chez un imprimeur local, avec un suivi des lots par l’agent.',
      'Tester la remise et la lecture avec des jeunes filles et des agentes, puis corriger.',
    ],
  },
  muac: {
    nom: 'Ruban MUAC avec QR', vue: null, lien: ['/muac', 'Voir le ruban en 3D'],
    sert: 'Mesurer le tour de bras d’un enfant de 6 à 59 mois. Trois zones de couleur indiquent s’il va bien. Le code QR ouvre le conseil et oriente vers un nutritionniste.',
    qui: 'Mamans, agents de santé, nutritionnistes. Utilisable sans savoir lire grâce aux couleurs.',
    etapes: [
      'Partir du ruban MUAC standard de l’OMS : mêmes seuils (115 et 125 mm), même couleurs.',
      'Imprimer le ruban sur une matière souple non extensible, avec le code QR, chez un imprimeur local.',
      'Tester la lecture avec 20 mamans et 5 agents : la mesure est-elle comprise sans explication ?',
      'Faire confirmer les seuils et les textes par un nutritionniste.',
      'Distribuer aux agents de santé et aux nutritionnistes, puis aux familles.',
    ],
  },
  bracelet: {
    nom: 'Bracelet du nouveau-né', vue: () => <Bracelet3D />, lien: null,
    sert: 'Relier le bébé à son carnet par un code QR, dès la maternité. Toute équipe qui le reçoit retrouve son histoire et ses vaccins, même sans réseau.',
    qui: 'Nouveau-nés, maternités, agents de santé. Un capteur de température pourrait être ajouté plus tard, après homologation.',
    etapes: [
      'Choisir une matière douce et sans danger pour la peau d’un nouveau-né (silicone médical ou tissu).',
      'Imprimer ou graver le code QR, et vérifier qu’il se lit même mouillé ou froissé.',
      'Tester le confort et la lecture avec une maternité, sur quelques dizaines de bébés, avec l’accord des mères.',
      'Faire valider avec la maternité : taille, sécurité, pose et retrait.',
      'Produire par petites séries, en lien avec l’enregistrement du bébé dans Fil d’Or.',
    ],
  },
  ceinture: {
    nom: 'Ceinture de grossesse', vue: () => <Ceinture3D />, lien: ['/maternite', 'Voir la carte de risque'],
    sert: 'Réduire le retard qui tue : en quelques secondes, toute équipe voit le centre d’accouchement prévu, la personne de confiance et le niveau de suivi. Le QR ouvre le plan d’accouchement.',
    qui: 'Femmes enceintes à partir du 7e mois, surtout les adolescentes et les grossesses à risque. Elle est portée avec l’accord de la femme.',
    etapes: [
      'Dessiner la ceinture avec des couturières locales : coton, sangle réglable, poche pour la carte, rabat avec pastille de couleur.',
      'La sage-femme remplit la carte (centre prévu, personne de confiance) et colle la pastille selon la carte de risque.',
      'Tester le confort et la discrétion avec 20 femmes enceintes : la porteraient-elles en public ?',
      'Vérifier que le QR se lit bien en urgence, de jour comme de nuit, avec un téléphone simple ou une application.',
      'Valider avec une sage-femme et la maternité de référence, puis coudre en petite série.',
    ],
  },
}

export default function Objets() {
  const [id, setId] = useState('borne')
  const o = OBJETS[id]
  return (
    <>
      <Bandeau surtitre="Concepts à fabriquer · borne, carte, ruban, bracelet, ceinture" titre="Prototypes 3D">Ce sont des concepts : aucun n’existe encore. Chacun est montré en 3D, avec la façon de le fabriquer pas à pas.</Bandeau>
      <main className="page ado">
        <div className="borne-onglets" role="group" aria-label="Objets">
          {Object.entries(OBJETS).map(([k, v]) => <button key={k} type="button" className={id === k ? 'actif' : ''} aria-pressed={id === k} onClick={() => setId(k)}>{v.nom}</button>)}
        </div>
        <div className="borne-grille">
          <section className="carte">{o.vue ? o.vue() : <p>Ce ruban est montré en 3D sur sa propre page, avec la lecture de la mesure.</p>}{o.lien && <p><Link className="bouton secondaire" to={o.lien[0]}>{o.lien[1]}</Link></p>}</section>
          <section className="carte">
            <h2>{o.nom}</h2>
            <h3>À quoi ça sert</h3><p>{o.sert}</p>
            <h3>Qui l’utilise</h3><p>{o.qui}</p>
          </section>
        </div>
        <section className="carte">
          <h2>Comment le fabriquer</h2>
          <ol className="borne-parties">{o.etapes.map((e, i) => <li key={e}><span>{i + 1}</span><div><p>{e}</p></div></li>)}</ol>
          <p className="petit">Les coûts, les fournisseurs et les délais ne sont pas chiffrés : il faut d’abord un prototype et l’avis du ministère de la Santé. Rien de ce qui touche à la mesure de santé ne sera utilisé sans validation.</p>
        </section>
        <p className="petit">Démonstration. Ce n’est pas un service officiel de l’UNICEF.</p>
      </main>
    </>
  )
}
