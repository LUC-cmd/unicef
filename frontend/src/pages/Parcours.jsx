import { useState } from 'react'
import { Link } from 'react-router-dom'
import Bandeau from '../components/Bandeau.jsx'

const ETAPES = [
  { code: 'adolescence', nom: 'Adolescence', sous: 'Santé sexuelle et reproductive' },
  { code: 'grossesse', nom: 'Grossesse', sous: 'Soins prénataux, nutrition de la mère' },
  { code: 'naissance', nom: 'Naissance', sous: 'Accouchement sûr, acte de naissance' },
  { code: 'petite', nom: 'Petite enfance', sous: 'Vaccins, nutrition, croissance' },
  { code: 'eveil', nom: 'Éveil précoce', sous: 'Stimulation, parentalité' },
  { code: 'prescolaire', nom: 'Préscolaire', sous: 'Crèches, jardins d’enfants' },
]
const DOMAINES = ['Santé', 'Nutrition', 'Protection', 'Services sociaux', 'Préscolaire et éveil']

// Pour chaque étape et chaque domaine : ce que Fil d'Or fait déjà, et où le voir.
const MATRICE = {
  adolescence: {
    'Santé': ['Informations sur la puberté, la planification familiale et la grossesse précoce ; orientation vers le centre de santé.', '/adolescents'],
    'Nutrition': ['Conseils de nutrition pour la future mère, par la voix et le SMS.', '/telephone'],
    'Protection': ['Signalement sûr d’une situation inquiétante : qui prévenir, tout de suite.', '/signalement'],
    'Services sociaux': ['Jeune mère : case à l’inscription, suivi renforcé, centre social pour rester à l’école.', '/adolescents'],
    'Préscolaire et éveil': ['Préparer la mère à jouer avec son bébé dès la grossesse.', '/jeux'],
  },
  grossesse: {
    'Santé': ['Rendez-vous prénataux rappelés par SMS ou appel, signes de danger, centre le plus proche.', '/telephone'],
    'Nutrition': ['Conseils d’alimentation de la mère, en audio dans sa langue.', '/telephone'],
    'Protection': ['Déclaration de naissance préparée avant l’accouchement : le dossier est déjà pré-rempli.', '/acte'],
    'Services sociaux': ['Besoins de la famille notés par l’agent : eau, hygiène, protection sociale, parentalité.', '/fonctionnement'],
    'Préscolaire et éveil': ['Premiers jeux et chansons avant la naissance.', '/jeux'],
  },
  naissance: {
    'Santé': ['Accouchement noté, poids de naissance, petit poids suivi à J1, J3 et J7.', '/fonctionnement'],
    'Nutrition': ['Allaitement dès la première heure : message court dans la langue de la mère.', '/telephone'],
    'Protection': ['Déclaration lancée le jour 1, reçu horodaté, validation par la mairie, acte retiré, procédure de nationalité.', '/acte'],
    'Services sociaux': ['La famille est orientée vers le centre social si elle n’a pas de pièces.', '/annuaire'],
    'Préscolaire et éveil': ['Le carnet de l’enfant est ouvert : il le suivra jusqu’à l’école.', '/fonctionnement'],
  },
  petite: {
    'Santé': ['Vaccins rappelés ; un rendez-vous manqué place la famille en haut de la liste de l’agent.', '/fonctionnement'],
    'Nutrition': ['Mesure au ruban (périmètre brachial) à chaque visite, alerte si trop bas.', '/fonctionnement'],
    'Protection': ['Acte de naissance suivi jusqu’au retrait par la famille.', '/acte'],
    'Services sociaux': ['Eau, hygiène et aides : l’agent coche le besoin, l’orientation s’affiche.', '/fonctionnement'],
    'Préscolaire et éveil': ['Jeu de la semaine envoyé aux parents et aux proches.', '/jeux'],
  },
  eveil: {
    'Santé': ['Un enfant vacciné jamais orienté vers l’éveil est signalé comme rupture.', '/fonctionnement'],
    'Nutrition': ['Diversification alimentaire à partir de 6 mois : conseils par l’assistant.', '/assistant'],
    'Protection': ['Environnement sûr : conseils et signes à surveiller.', '/signalement'],
    'Services sociaux': ['Causeries de parents au centre social ou à la crèche solidaire.', '/creches'],
    'Préscolaire et éveil': ['Un jeu par jour avec des objets de la maison ; histoires et chansons en langue locale.', '/jeux'],
  },
  prescolaire: {
    'Santé': ['Le suivi de santé continue jusqu’à 5 ans.', '/fonctionnement'],
    'Nutrition': ['Repas équilibrés à la crèche solidaire, fiches pour les femmes leaders.', '/creches'],
    'Protection': ['Acte de naissance et nationalité : conditions pour entrer à l’école.', '/acte'],
    'Services sociaux': ['Crèche solidaire : 300 FCFA par jour, un lieu tenu par des femmes leaders.', '/creches'],
    'Préscolaire et éveil': ['Orientation vers un jardin d’enfants proche à partir de 3 ans, enregistrée sur la fiche.', '/annuaire'],
  },
}

const LIEUX = [
  ['Au centre de santé', 'Un seul contact, tous les services', ['Un seul écran par enfant : vaccins, croissance, éveil, acte, préscolaire.', 'Liste de visites classée par priorité.', 'Nouveau-nés fragiles : J1, J3, J7.', 'Planification familiale : orientation notée pour les jeunes mères.'], '/agent'],
  ['À la mairie', 'Une identité dès la naissance', ['La déclaration part de la maternité ou du village, même sans réseau.', 'Validation à distance, SMS à la famille avec preuve horodatée.', 'Suivi du retrait de l’acte et procédure de nationalité.', 'Rappels vaccinaux dans le même message.'], '/mairie'],
  ['Dans la communauté', 'Des crèches solidaires', ['Fiches de formation pour les femmes leaders : santé, nutrition, éveil, hygiène, protection.', 'Cahier de la journée à imprimer.', 'Jeux, histoires et chansons en langue locale.', 'Crèches et jardins d’enfants dans l’annuaire.'], '/creches'],
]

const PISTES = [
  ['L’acte de naissance non retiré', 'Le tableau des actes prêts et jamais retirés, par zone, et la relance de la famille.', '/carte/ruptures', 'Tableau du responsable'],
  ['Le préscolaire, trop rare', 'À 3 ans, l’enfant sans préscolaire est signalé. L’agent note l’orientation en un clic ; la part d’enfants au préscolaire est suivie par zone.', '/carte/ruptures', 'Tableau du responsable'],
  ['Les crèches communautaires', 'Cinq fiches de formation simples pour les femmes leaders, avec un cahier de la journée.', '/creches', 'Page crèches'],
  ['Le nouveau-né de petit poids', 'Suivi à J1, J3 et J7 après le retour à la maison, avec une alerte si une visite manque.', '/agent/fragiles', 'Espace agent'],
  ['Les jeunes mères adolescentes', 'Case à l’inscription, suivi renforcé (+20 de priorité), orientation santé, école et protection.', '/adolescents', 'Page adolescentes'],
  ['Des progrès encore lents', 'Hygiène, vaccination et nutrition suivies trimestre après trimestre, par zone.', '/carte/ruptures', 'Tableau du responsable'],
]

const INNOVATIONS = [
  ['Le fil qui va chercher l’enfant', 'Un rappel sans réponse place la famille en haut de la liste de l’agent. On n\u2019attend pas la famille : le système la rejoint.'],
  ['Quatre portes, un seul carnet', 'Voix et SMS, agent, carnet illustré, point d’écoute : si une porte est fermée, une autre s’ouvre, et tout arrive au même carnet.'],
  ['Les passages d’une étape à l’autre', 'Six ruptures calculées automatiquement : c’est là que l’enfant se perd, et c’est là que Fil d’Or agit.'],
  ['La carte de famille qui voyage', 'Une mère de Kara qui arrive à Lomé donne son numéro : l’agent retrouve le carnet, les vaccins et les consultations, avec son accord.'],
  ['De la naissance à la nationalité', 'Après la validation de l’état civil, la procédure de nationalité s’ouvre, même sans pièces des parents.'],
  ['Marche sans réseau', 'Saisie hors ligne, clé USB entre deux postes, synchronisation sans doublon. Logiciel Windows et application Android.'],
  ['Identité par consentement', 'Un code, jamais un nom. Le nom n’est noté qu’avec l’accord de la famille, et la carte masque les zones de moins de 5 familles.'],
]

const JURY = [
  ['Répond à « Un enfant, un parcours »', 'Les six étapes sont reliées sur une seule fiche par enfant.'],
  ['Problème concret', 'Actes non retirés, préscolaire rare, nouveau-nés fragiles : chacun a sa vue.'],
  ['Connecte plusieurs domaines', 'Santé, nutrition, protection, services sociaux et préscolaire, dans la même fiche.'],
  ['Innovant', 'Voir les sept points ci-dessous.'],
  ['Adapté au Togo', 'Téléphone basique, USSD, éwé, kabyè et tem, hors réseau, 5 régions et 39 préfectures.'],
  ['Déployable', 'Site, logiciel Windows et application Android ; démonstration sur données fictives, pilote à prévoir avec les autorités.'],
]
const DROITS = [
  ['Droits de l’enfant', 'Fil d’Or informe et oriente. Il ne pose aucun diagnostic.'],
  ['Protection', 'Aucune photo, adresse ni position précise. Le suivi des signalements est réservé aux professionnels.'],
  ['Confidentialité', 'Minimum de données, accès par rôle et par zone, journal des consultations.'],
  ['Inclusion', 'Téléphone basique, carnet en images pour qui ne lit pas, annuaire des structures pour enfants à besoins spécifiques.'],
]

export default function Parcours() {
  const [etape, setEtape] = useState('grossesse')
  return (
    <>
      <Bandeau surtitre="Thématique" titre="Un enfant, un parcours">
        Six étapes, cinq domaines, trois lieux : tout ce que Fil d'Or relie autour d'un même enfant.
      </Bandeau>
      <main className="page">
        <section className="carte" aria-labelledby="t-matrice">
          <h2 id="t-matrice">Les six étapes de la vie de l'enfant</h2>
          <p className="petit">Choisissez une étape : pour chaque domaine, ce que Fil d'Or fait et où le voir.</p>
          <div className="etapes-onglets" role="tablist">
            {ETAPES.map((e, i) => (
              <button key={e.code} role="tab" aria-selected={etape === e.code} className={etape === e.code ? 'actif' : ''} onClick={() => setEtape(e.code)}>
                <span>{i + 1}</span><b>{e.nom}</b><small>{e.sous}</small>
              </button>
            ))}
          </div>
          <ul className="matrice">
            {DOMAINES.map((d) => (
              <li key={d}><b>{d}</b><span>{MATRICE[etape][d][0]}</span><Link to={MATRICE[etape][d][1]}>Voir</Link></li>
            ))}
          </ul>
          <p className="petit">Les passages d'une étape à l'autre sont surveillés : une mère suivie dont le bébé n'est jamais enregistré, un enfant vacciné jamais orienté vers l'éveil.</p>
        </section>

        <h2 className="titre-section">Trois lieux où le parcours se reconnecte</h2>
        <div className="grille">
          {LIEUX.map(([nom, sous, pts, lien]) => (
            <article className="carte" key={nom}>
              <h3>{nom}</h3><p><b>{sous}</b></p>
              <ul className="liste-coches">{pts.map((p) => <li key={p}>{p}</li>)}</ul>
              <Link className="bouton secondaire petit-bouton" to={lien}>Ouvrir</Link>
            </article>
          ))}
        </div>

        <h2 className="titre-section">Les six pistes de réflexion, une par une</h2>
        <div className="tableau-conteneur"><table>
          <thead><tr><th>Piste</th><th>Ce que fait Fil d'Or</th><th>Où</th></tr></thead>
          <tbody>{PISTES.map(([p, t, l, o]) => <tr key={p}><td><b>{p}</b></td><td>{t}</td><td><Link to={l}>{o}</Link></td></tr>)}</tbody>
        </table></div>

        <h2 className="titre-section">Ce que le jury attend</h2>
        <div className="grille">{JURY.map(([t, d]) => <article className="carte" key={t}><h3>{t}</h3><p>{d}</p></article>)}</div>
        <div className="grille">{DROITS.map(([t, d]) => <article className="carte" key={t}><h3>{t}</h3><p>{d}</p></article>)}</div>

        <h2 className="titre-section">Ce que Fil d'Or apporte de nouveau</h2>
        <ol className="innovations">{INNOVATIONS.map(([t, d]) => <li key={t}><b>{t}</b><p>{d}</p></li>)}</ol>
        <p className="petit">Démonstration sur données fictives. Fil d'Or n'est pas un service officiel de l'UNICEF.</p>
      </main>
    </>
  )
}
