// Ce que chaque personne fait dans Fil d'Or : une seule source pour la page « Fonctionnement » et les guides des tableaux de bord.

export const ROLES = {
  FAMILLE: {
    titre: 'Famille ou proche',
    qui: 'Mère, père, grand-parent, relais d’une famille sans téléphone.',
    connexion: 'Pas de compte. Elle appelle ou envoie un SMS depuis un téléphone basique, quand elle veut.',
    saisit: ['Le sujet qui l’intéresse (grossesse, vaccins, nutrition…)', 'OK pour confirmer un rendez-vous', 'Une demande à un centre de santé'],
    voit: ['Messages vocaux et SMS dans sa langue', 'Le jeu du jour avec les objets de la maison', 'Le résultat de la déclaration de naissance'],
    envoi: 'Reconnue par son numéro, enregistré uniquement sous forme chiffrée. Rien n’est stocké sans son accord.',
  },
  AGENT: {
    titre: 'Agent de santé',
    qui: 'Agent de santé communautaire ou infirmier, dans une zone précise.',
    connexion: 'Au village, avec ou sans réseau. Il se connecte une fois, puis travaille sur son téléphone.',
    saisit: ['Inscription d’une famille (un code, jamais de nom)', 'Visite : date, poids en g, périmètre brachial en mm, signe de danger', 'Rendez-vous faits (vaccins, consultations)', 'Naissance : lieu, certificat d’accouchement vu ou non'],
    voit: ['Seulement les familles de sa zone', 'Liste classée par priorité : un rappel sans réponse remonte en premier', 'Le carnet de chaque enfant, imprimable'],
    envoi: 'Sans réseau, la saisie reste sur le téléphone. Au retour du réseau elle part toute seule, une seule fois, sans doublon.',
  },
  MAIRIE: {
    titre: 'État civil',
    qui: 'Agent de la mairie ou du centre d’état civil.',
    connexion: 'Au bureau, quand des déclarations arrivent. Il consulte la liste des déclarations envoyées.',
    saisit: ['Valide la déclaration de naissance', 'Ou la rejette avec un motif obligatoire : l’agent sait quoi corriger'],
    voit: ['Code enfant, zone, date, lieu de naissance', 'Certificat d’accouchement : oui ou non', 'Déclaration dans les 45 jours (gratuite) ou hors délai', 'Jamais de nom, de photo ni d’adresse'],
    envoi: 'À la validation, un SMS part vers la famille avec le numéro de preuve et son code de vérification.',
  },
  STRUCTURE: {
    titre: 'Structure d’accueil',
    qui: 'Centre de santé, crèche, centre social.',
    connexion: 'Au centre, plusieurs fois par semaine, pour répondre aux demandes des familles.',
    saisit: ['Réponse à une demande de rappel ou d’orientation', 'Horaires, services et accueil des besoins spécifiques de la structure'],
    voit: ['Code famille, zone et langue de la famille qui demande', 'Jamais le nom ni le numéro de téléphone'],
    envoi: 'La réponse part par SMS à la famille. Les mises à jour apparaissent aussitôt dans l’annuaire public.',
  },
  DECIDEUR: {
    titre: 'Responsable régional',
    qui: 'Responsable de santé ou de protection de l’enfance d’une région.',
    connexion: 'Pour préparer ses tournées et suivre l’évolution zone par zone.',
    saisit: ['Rien : il consulte et décide où envoyer une équipe mobile'],
    voit: ['Un indice d’oubli par zone, jamais un enfant', 'Rendez-vous réalisés, naissances déclarées, éveil, rappels sans réponse', 'Les zones de moins de 5 familles ne sont pas détaillées'],
    envoi: 'Les chiffres sont calculés par zone à partir des saisies des agents. Aucune donnée individuelle ne sort.',
  },
  ADMIN: {
    titre: 'Administrateur',
    qui: 'Équipe technique de Fil d’Or (démonstration).',
    connexion: 'Pour préparer et présenter la démonstration.',
    saisit: ['Avance le temps pour montrer les rappels sans réponse', 'Contrôle l’état des services'],
    voit: ['Les quatre services : site, serveur, assistant, base de données', 'Le journal des consultations'],
    envoi: 'Chaque consultation de dossier est inscrite dans un journal : qui, quand, quoi.',
  },
}

export const JAMAIS_ENREGISTRE = [
  'Le nom des enfants et des parents',
  'Les photos',
  'Les adresses et les points GPS précis',
  'Le numéro de téléphone en clair',
]
