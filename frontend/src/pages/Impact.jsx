import { useState } from 'react'
import { Link } from 'react-router-dom'
import Bandeau from '../components/Bandeau.jsx'
import EchelleFilles from '../components/EchelleFilles.jsx'
import { ETAPES_PARCOURS, SOURCE_BRIEFING } from '../lib/etapes.js'

// Ce qui est décrit existe dans le prototype et se teste avec les comptes de démonstration. Les effets sur la santé des
// enfants ne sont pas mesurés : le prototype n'a pas été évalué sur le terrain, toutes les données sont fictives.
const PRIX = [
  { id: 'innovation', nom: 'L’innovation', question: 'Qu’est-ce qui n’existe pas déjà ?', lignes: [
    ['Le fil d’or de chaque enfant', 'Un seul dossier suit l’enfant de la grossesse à 5 ans : la famille voit où il en est et son prochain pas, l’agent sait qui visiter, le responsable voit où ça se perd.', '/'],
    ['Les ruptures entre deux services', 'Le tableau du responsable compte les enfants perdus entre deux services : grossesse suivie sans naissance notée, acte prêt jamais retiré, vacciné jamais orienté vers l’éveil.', '/connexion'],
    ['L’acte de naissance en trois états', 'Pas d’acte, acte établi mais non retiré, acte retiré : chaque famille n’est relancée que pour ce qui lui manque.', '/acte'],
    ['Le suivi du nouveau-né fragile', 'Visites aux jours 1, 3 et 7, bracelet de température et de pouls, alerte hors des repères.', '/connexion'],
    ['La mallette de la crèche', 'Les femmes qui tiennent les crèches ont les jeux par âge, le menu local, l’hygiène, les signes d’alerte et de petites formations, au même endroit.', '/connexion'],
    ['Le bilan de développement à la maison', 'Quatre questions par tranche d’âge, de 0 à 5 ans : la famille sait si son enfant avance bien, et l’agent de santé est prévenu si plusieurs repères manquent.', '/famille/developpement'],
    ['La mesure du bras', 'Un ruban de couleur et une mesure en millimètres disent si un enfant de 6 mois à 5 ans manque de nourriture, et quoi faire.', '/famille/bras'],
    ['Des messages parlés, dans la langue de la famille', 'Un relais communautaire enregistre sa voix pour chaque conseil : la mère écoute au lieu de lire.', '/famille/voix'],
    ['Des conseils de saison', 'Moustiquaire avant les pluies, eau propre, harmattan : la famille reçoit le bon conseil au bon moment de l’année.', '/famille'],
    ['Suivi de la croissance par l’agent', 'La mesure du bras à chaque visite : les enfants à risque remontent en tête de liste, avec le prochain pas.', '/connexion'],
    ['Un export prêt pour le système de santé', 'Huit indicateurs agrégés, sans nom d’enfant, au format d’échange DHIS2 : de quoi brancher Fil d’Or aux statistiques nationales.', '/connexion'],
    ['Un téléphone basique suffit', 'SMS, appel vocal et *789# : aucune application nécessaire pour la famille.', '/telephone'],
    ['Hors réseau, par clé USB', 'L’agent saisit au village sans réseau, puis les données partent par réseau ou par clé USB.', '/hors-reseau'],
    ['Un carnet signé, vérifiable', 'Un QR signé numériquement prouve l’authenticité du carnet, sans afficher de nom.', '/projet'],
  ] },
  { id: 'filles', nom: 'L’impact pour les filles', question: 'Que change Fil d’Or pour les filles et les jeunes mères ?', lignes: [
    ['Les jeunes mères repérées dès l’inscription', 'Une case dédiée augmente la priorité de suivi et oriente vers la santé et l’école.', '/connexion'],
    ['Un tableau « filles et jeunes mères »', 'Le responsable régional voit les jeunes mères suivies par zone, sans identité, avec masquage des petites zones.', '/connexion'],
    ['Les adolescentes : repères et orientation', 'Informations simples sur le corps et la planification familiale, et orientation vers le centre de santé, sans jugement.', '/adolescents'],
    ['L’acte de naissance des filles', 'Sans acte, une fille a plus de mal à entrer à l’école et à accéder aux services. L’acte est suivi jusqu’au retrait.', '/acte'],
    ['La crèche pour reprendre l’école', 'Une réservation en ligne offre un lieu sûr pour l’enfant : la jeune mère peut retourner en classe ou travailler.', '/creches'],
    ['Les petites sœurs qui gardent les petits', 'Une crèche fiable libère une grande sœur de 8 à 14 ans pour l’école. Le scénario chiffré est dans le tableau du responsable.', '/carte/ecole'],
    ['Mon espace adolescente, privé et sur le téléphone', 'Comprendre son cycle avec un calendrier, choisir une protection, et être guidée pas à pas si elle est enceinte : consultations renforcées avant 18 ans, signes de danger, plan d’accouchement. Aucune donnée envoyée.', '/connexion'],
    ['Le bien-être de la jeune mère', 'Deux questions de repérage après la naissance, avec une orientation vers l’agent de santé : une mère soutenue soutient mieux son enfant.', '/famille/bien-etre'],
    ['Signaler une situation inquiétante', 'Un chemin direct, anonyme et sans diagnostic, pour une fille en danger.', '/signalement'],
  ] },
  { id: 'gagnant', nom: 'Prêt à déployer', question: 'Est-ce solide, utilisable, prêt à passer à l’échelle ?', lignes: [
    ['Utilisable dès maintenant', 'Site en ligne, application Android et logiciel Windows, avec des comptes de démonstration pour chaque rôle.', '/telecharger'],
    ['Chaque rôle voit ce qu’il doit voir', 'L’administrateur crée les responsables régionaux, qui créent les agents, états civils, centres et crèches de leur région.', '/connexion'],
    ['Consentement d’abord', 'Rien n’est enregistré sans l’accord de la famille ; aucune photo, aucun nom nécessaire, des codes seulement.', '/projet'],
    ['Journal des accès', 'Chaque consultation est inscrite ; les zones de moins de cinq familles sont masquées sur la carte.', '/fonctionnement'],
    ['Pensé pour la région', 'Un déploiement par région ; les zones oubliées sont classées pour envoyer une équipe en premier.', '/connexion'],
    ['Ce qui reste à faire, dit honnêtement', 'Validation par des professionnels de santé, essai sur le terrain, branchement aux services de l’État.', '/projet'],
  ] },
]

export default function Impact() {
  const [prix, setPrix] = useState('innovation')
  const p = PRIX.find((x) => x.id === prix)
  return (
    <>
      <Bandeau surtitre="Hack4Children Togo 2026" titre="Innovation et impact">
        Ce que Fil d'Or apporte, étape par étape, et ce qu'on peut l'essayer dès maintenant.
      </Bandeau>
      <main className="page impact">
        <section aria-labelledby="t-prix">
          <h2 id="t-prix">Trois questions du jury, trois réponses</h2>
          <div className="impact-onglets" role="tablist" aria-label="Les trois prix">
            {PRIX.map((x) => (
              <button key={x.id} role="tab" aria-selected={x.id === prix} className={x.id === prix ? 'actif' : ''} onClick={() => setPrix(x.id)}>{x.nom}</button>
            ))}
          </div>
          <div role="tabpanel" className="impact-panneau" key={p.id}>
            <p className="impact-question">{p.question}</p>
            <ul className="impact-liste">
              {p.lignes.map(([t, d, to]) => (
                <li key={t}><div><b>{t}</b><span>{d}</span></div><Link to={to} className="bouton secondaire petit-bouton">Voir</Link></li>
              ))}
            </ul>
            {p.id === 'filles' && <EchelleFilles />}
          </div>
        </section>

        <section aria-labelledby="t-six">
          <h2 id="t-six">Les six étapes : le problème, ce que Fil d'Or invente, qui en profite</h2>
          <div className="impact-etapes">
            {ETAPES_PARCOURS.map((e) => (
              <article key={e.code} style={{ '--c': e.couleur }}>
                <h3><Link to={`/parcours/${e.code}`}>{e.nom}</Link> <small>{e.age}</small></h3>
                <p><b>Le problème.</b> {e.probleme}</p>
                <p><b>Ce que Fil d'Or invente.</b> {e.innovation}</p>
                <p><b>Qui en profite.</b> {e.aide}</p>
              </article>
            ))}
          </div>
          <p className="petit">Chiffres : {SOURCE_BRIEFING}.</p>
        </section>

        <section className="carte attention" aria-labelledby="t-honnete">
          <h2 id="t-honnete">Ce que nous ne prétendons pas</h2>
          <p>Fil d'Or est un prototype de concours, avec des données fictives. Les effets sur la santé des enfants ne sont pas mesurés. Les contenus de santé, de nutrition et d'éveil sont à faire valider par des professionnels avant tout usage réel, et le projet n'est pas un service officiel de l'UNICEF.</p>
        </section>
      </main>
    </>
  )
}
