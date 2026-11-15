import { Link } from 'react-router-dom'
import { useAuth } from '../lib/contexte.jsx'
import Bandeau from '../components/Bandeau.jsx'

const LIBELLE = {
  AGENT: 'Agent de santé',
  MAIRIE: 'État civil',
  DECIDEUR: 'Responsable régional',
  STRUCTURE: 'Structure',
  ADMIN: 'Administrateur',
}

const ESPACES = {
  AGENT: {
    phrase: 'Votre liste est classée : les familles silencieuses passent en premier. La saisie reste sur le téléphone s’il n’y a pas de réseau.',
    actions: [
      { to: '/agent', titre: 'Mes visites', texte: 'Ouvrir la liste priorisée, la fiche enfant et la saisie hors ligne.' },
      { to: '/agent/inscription', titre: 'Inscrire une famille', texte: 'Un code, un accord, une langue. Jamais de nom ni d’adresse.' },
      { to: '/jeux', titre: 'Jeux d’éveil', texte: 'Compter, suites logiques, mémoire. Ça marche sans compte et sans réseau.' },
    ],
  },
  MAIRIE: {
    phrase: 'Les dossiers arrivent déjà remplis. Vous validez, ou vous refusez en disant ce qui manque. Fil d’Or prépare la preuve, il ne délivre pas l’acte.',
    actions: [
      { to: '/mairie', titre: 'Déclarations de naissance', texte: 'Voir les dossiers du jour, valider ou rejeter avec un motif.' },
      { to: '/fonctionnement', titre: 'Le chemin jusqu’à l’acte', texte: 'Grossesse, naissance, reçu, contrôle au guichet.' },
    ],
  },
  STRUCTURE: {
    phrase: 'Une famille demande un rappel ou une orientation. Vous répondez avec le code famille. Le numéro de téléphone ne s’affiche pas.',
    actions: [
      { to: '/structure', titre: 'Demandes reçues', texte: 'Répondre, et mettre à jour les horaires de la structure.' },
      { to: '/annuaire', titre: 'Annuaire public', texte: 'Vérifier ce que les familles voient de votre structure.' },
    ],
  },
  DECIDEUR: {
    phrase: 'La carte montre des zones, jamais des enfants. En dessous de cinq familles, le détail est masqué.',
    actions: [
      { to: '/carte', titre: 'Carte des zones', texte: 'Voir où les rappels restent sans réponse, et où envoyer une équipe.' },
      { to: '/projet', titre: 'Le dossier du projet', texte: 'Les cinq piliers, les portes d’entrée, la protection des données.' },
    ],
  },
  ADMIN: {
    phrase: 'Vous voyez l’ensemble de la démonstration : le temps, les services, et chaque espace professionnel.',
    actions: [
      { to: '/admin', titre: 'Coulisses', texte: 'État des services et horloge de démonstration.' },
      { to: '/agent', titre: 'Espace agent', texte: 'Visites, inscription, saisie hors ligne.' },
      { to: '/mairie', titre: 'État civil', texte: 'Dossiers de naissance à valider.' },
      { to: '/carte', titre: 'Carte', texte: 'Indice d’oubli par zone.' },
    ],
  },
}

const PRINCIPES = [
  { titre: 'Un code, pas une identité', texte: 'Pas de nom, de photo, d’adresse ni de point GPS. Le téléphone est conservé sous forme d’empreinte, jamais en clair.' },
  { titre: 'L’accord avant la donnée', texte: 'Rien n’est écrit sans le consentement de la famille. Elle peut le retirer : les données du suivi sont alors effacées.' },
  { titre: 'Grossesse, puis nationalité', texte: 'Le suivi commence au rendez-vous prénatal. À la naissance, le dossier prépare l’acte d’état civil, preuve d’identité. Fil d’Or ne délivre pas la nationalité.' },
]

export default function Tableau() {
  const { session } = useAuth()
  const espace = ESPACES[session.role] ?? ESPACES.ADMIN
  const prenom = (session.nomComplet || '').split(' ')[0] || 'Bonjour'

  return (
    <>
      <Bandeau surtitre={LIBELLE[session.role] ?? 'Espace professionnel'} titre={`Bonjour ${prenom}`}>
        {espace.phrase}
      </Bandeau>
      <main className="page">
        <div className="tableau-actions">
          {espace.actions.map((a) => (
            <Link key={a.to + a.titre} to={a.to} className="tableau-action">
              <b>{a.titre}</b>
              <span>{a.texte}</span>
              <em>Ouvrir</em>
            </Link>
          ))}
        </div>

        <section className="principes" aria-labelledby="titre-principes">
          <h2 id="titre-principes" className="sr-seulement">Ce que le tableau de bord protège</h2>
          {PRINCIPES.map((p) => (
            <article key={p.titre} className="principe">
              <h3>{p.titre}</h3>
              <p>{p.texte}</p>
            </article>
          ))}
        </section>

        <p className="petit principe-note">
          Cadre visé : loi n° 2019-014 du 29 octobre 2019. Les contenus de santé doivent être validés avant tout usage réel.
          Les jeux d’éveil n’ouvrent aucun dossier enfant.
        </p>
      </main>
    </>
  )
}
