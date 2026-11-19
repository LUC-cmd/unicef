// Les six étapes du parcours de l'enfant : un seul endroit pour la page d'accueil, la page « parcours » et la page de chaque étape.
export const ETAPES_PARCOURS = [
  {
    code: 'adolescence', nom: 'Avant la grossesse', age: 'Adolescentes et jeunes femmes', couleur: '#6A4C93', icone: 'fleur',
    court: "Santé, planification familiale, rester à l'école, jeunes mères suivies de près.",
    accroche: "Un bon départ commence avant la grossesse : des repères clairs et un accompagnement sans jugement.",
    famille: "Une adolescente trouve des informations simples sur son corps, la planification familiale et les risques d'une grossesse précoce, et sait où aller.",
    agent: "L'agent oriente vers le centre de santé, note le besoin de planification familiale et marque une jeune mère : sa priorité de suivi augmente.",
    decideur: "Le responsable voit combien de jeunes mères sont suivies par zone et où elles décrochent de l'école.",
    moments: ['Information sur la puberté et la santé reproductive', 'Orientation vers le centre de santé ou le centre social', 'Case « jeune mère » à l’inscription', 'Suivi renforcé et retour à l’école'],
    actions: [['Les repères pour les adolescentes', '/adolescents', 'Informations, orientation, jeune mère'], ['Signaler une situation inquiétante', '/signalement', 'Qui prévenir, tout de suite'], ['Parler à l’assistant', '/assistant', 'Une question, une réponse simple']],
  },
  {
    code: 'grossesse', nom: 'Grossesse', age: 'Du 1er rendez-vous à l’accouchement', couleur: '#E4572E', icone: 'ventre',
    court: 'Consultations prénatales, signes de danger, préparation de la naissance.',
    accroche: "Aucun rendez-vous prénatal oublié, et la naissance est préparée avant le jour J.",
    famille: "La future mère reçoit un rappel par SMS ou appel avant chaque consultation, des conseils d'alimentation dans sa langue et la liste des signes de danger.",
    agent: "L'agent inscrit la grossesse, voit qui n'a pas répondu au dernier rappel et visite ces familles en premier.",
    decideur: "Le responsable suit la part de consultations prénatales réalisées par zone.",
    moments: ['Inscription de la grossesse', 'Rappels des consultations prénatales', 'Signes de danger expliqués', 'Dossier de déclaration de naissance pré-rempli'],
    actions: [['Essayer le téléphone', '/telephone', 'Voix, SMS et USSD'], ['Voir la visite guidée', '/visite', 'Cinq minutes, cinq étapes'], ['Trouver un centre de santé', '/annuaire', 'Annuaire des structures']],
  },
  {
    code: 'naissance', nom: 'Naissance', age: 'Les premiers jours', couleur: '#B87B00', icone: 'berceau',
    court: "Déclaration à l'état civil, preuve de naissance par SMS, acte retiré par la famille.",
    accroche: "Un enfant existe aux yeux de la loi dès ses premiers jours : déclaration, preuve, acte.",
    famille: "La famille reçoit par SMS la preuve de la déclaration, avec la date, puis l'information que l'acte est prêt à retirer.",
    agent: "L'agent lance la déclaration depuis la maternité ou le village, même sans réseau. Un bébé de petit poids est visité à J1, J3 et J7.",
    decideur: "Le responsable voit les actes prêts mais jamais retirés, par zone, et peut faire relancer les familles.",
    moments: ['Déclaration lancée le jour 1', 'Validation par la mairie', 'Preuve horodatée envoyée par SMS', 'Acte retiré, puis procédure de nationalité si besoin'],
    actions: [['Suivre les étapes de l’acte', '/acte', 'De la déclaration au retrait'], ['Les nouveau-nés fragiles', '/connexion', 'Espace agent : J1, J3, J7'], ['Qui fait quoi', '/fonctionnement', 'Le circuit complet']],
  },
  {
    code: 'petite', nom: 'Petite enfance', age: '0 à 2 ans', couleur: '#1CABE2', icone: 'biberon',
    court: 'Vaccins, pesées, allaitement, repères de développement.',
    accroche: "Chaque vaccin, chaque pesée, chaque repère de développement reste relié au même carnet.",
    famille: "Les parents reçoivent le rappel du prochain vaccin, des conseils d'allaitement puis de diversification alimentaire, dans leur langue.",
    agent: "Un rendez-vous manqué place la famille en haut de la liste de l'agent. La mesure au ruban est notée à chaque visite.",
    decideur: "Le responsable voit la couverture vaccinale et les zones où les familles ne répondent plus.",
    moments: ['Vaccins rappelés par SMS ou appel', 'Pesée et mesure du périmètre brachial', 'Visite si la famille ne répond plus', 'Carnet en images pour qui ne lit pas'],
    actions: [['Essayer le téléphone', '/telephone', 'Voir un rappel de vaccin'], ['Consulter le carnet illustré', '/visite', 'Parcours d’une famille'], ['Poser une question', '/assistant', 'Allaitement, vaccins, nutrition']],
  },
  {
    code: 'eveil', nom: 'Éveil précoce', age: 'Dès la naissance, surtout 1 à 3 ans', couleur: '#00833E', icone: 'jeu',
    court: 'Un jeu par jour avec les objets de la maison, histoires et chansons en langue locale.',
    accroche: "Jouer, chanter, raconter : l'éveil se fait à la maison, avec ce qu'on a.",
    famille: "Un jeu par jour, avec des objets de la maison, est envoyé aux parents et aux proches. Histoires et chansons existent en langue locale.",
    agent: "L'agent montre un jeu pendant la visite et note si l'enfant est orienté vers l'éveil, pour ne laisser aucun enfant sans stimulation.",
    decideur: "Le responsable repère les enfants vaccinés mais jamais orientés vers l'éveil : c'est une rupture du parcours.",
    moments: ['Jeu du jour envoyé aux parents', 'Histoires et chansons en langue locale', 'Causeries de parents', 'Orientation vers la crèche solidaire'],
    actions: [['Jouer avec l’enfant', '/jeux', 'Jeux faits avec les objets de la maison'], ['Les crèches solidaires', '/creches', 'Fiches pour les femmes leaders'], ['Écouter une histoire', '/ecoute', 'Point d’écoute']],
  },
  {
    code: 'prescolaire', nom: 'Préscolaire', age: '3 à 5 ans', couleur: '#F26A21', icone: 'ecole',
    court: "Nutrition, passage à la maternelle, crèche solidaire ou jardin d'enfants proche.",
    accroche: "L'entrée à l'école se prépare : un lieu proche, un acte de naissance, un enfant en bonne santé.",
    famille: "La famille est orientée vers un jardin d'enfants ou une crèche solidaire proche de chez elle, avec les pièces à fournir.",
    agent: "À partir de 30 mois, l'agent oriente l'enfant vers le préscolaire en un clic ; l'orientation est inscrite sur sa fiche.",
    decideur: "Le responsable suit la part d'enfants au préscolaire par zone et les progrès trimestre après trimestre.",
    moments: ['Orientation dès 30 mois', 'Crèche solidaire ou jardin d’enfants proche', 'Acte de naissance prêt pour l’entrée', 'Suivi de santé jusqu’à 5 ans'],
    actions: [['Trouver un jardin d’enfants', '/annuaire', 'Annuaire des structures'], ['Les crèches solidaires', '/creches', '300 FCFA par jour'], ['Vérifier l’acte de naissance', '/acte', 'Pièces et étapes']],
  },
]
export const etapeParCode = (c) => ETAPES_PARCOURS.find((e) => e.code === c)

/**
 * Pour chaque étape : le problème (chiffres du briefing thématique Hack4Children, UNICEF Togo, 16 novembre 2026),
 * ce que Fil d'Or invente, et qui en profite. Ce qui est décrit existe dans le prototype.
 */
export const SOURCE_BRIEFING = 'UNICEF Togo, briefing thématique Hack4Children, 16 novembre 2026'
const PLUS = {
  adolescence: {
    probleme: "17 % des décès maternels touchent des adolescentes de 12 à 19 ans, et 60,9 % des 15 à 19 ans sexuellement actives n'ont pas de contraception adaptée à leurs besoins.",
    innovation: "La jeune mère est repérée dès l'inscription et son suivi est renforcé tout seul : priorité plus haute, orientation vers la santé et l'école. Le responsable régional a un tableau « filles et jeunes mères ».",
    aide: "Les adolescentes et les jeunes mères : moins de grossesses à risque sans suivi, un retour à l'école accompagné.",
  },
  grossesse: {
    probleme: "6 530 nouveau-nés meurent chaque année au Togo. Une mère suivie pendant sa grossesse dont le bébé n'est jamais enregistré est perdue entre deux services.",
    innovation: "Le dossier de grossesse devient le début du dossier de l'enfant : si le terme est dépassé sans naissance notée, l'agent est alerté, et la déclaration est préparée avant le jour J.",
    aide: "Les futures mères, surtout les plus jeunes : des rappels dans leur langue, les signes de danger, et rien ne se perd au moment de l'accouchement.",
  },
  naissance: {
    probleme: "17,7 % des enfants de moins de 5 ans n'ont pas d'acte de naissance. À Vo, 184 actes établis sur 454 n'ont pas été retirés par les familles (40 %).",
    innovation: "La famille signale la naissance, l'agent la vérifie, la mairie dresse l'acte. Fil d'Or distingue « pas d'acte », « acte établi, non retiré » et « acte retiré », et ne relance que les familles qui en ont besoin.",
    aide: "Chaque enfant, et surtout les filles sans acte, qui auront plus de mal à entrer à l'école et à accéder aux services.",
  },
  petite: {
    probleme: "16 496 enfants de moins de 5 ans meurent chaque année, et 300 000 sont touchés par la malnutrition chronique. Le nouveau-né de petit poids est le plus exposé, surtout la première semaine à la maison.",
    innovation: "Un nouveau-né fragile garde un suivi après le retour à la maison : visites J1, J3 et J7, mesures du bracelet, alerte si la température ou le pouls sortent des repères. Un rendez-vous manqué fait remonter la famille en haut de la liste de l'agent.",
    aide: "Les nouveau-nés de petit poids et leurs mères, et les familles sans téléphone, que seule la visite peut atteindre.",
  },
  eveil: {
    probleme: "Un enfant vacciné n'est jamais orienté vers l'éveil : c'est entre deux services que l'enfant se perd.",
    innovation: "Un jeu par jour avec les objets de la maison, des chansons et de petits films, et une « mallette de la crèche » pour les femmes qui gardent les enfants : jeux par âge, menu local, hygiène, signes d'alerte, formation de deux minutes.",
    aide: "Les mères à la maison, et les femmes leaders des crèches solidaires, peu formées en santé, nutrition et éveil.",
  },
  prescolaire: {
    probleme: "Seulement 27,6 % des enfants de 3 à 5 ans vont au préscolaire.",
    innovation: "Les crèches proches s'affichent avec la route, les conditions et la réservation en ligne, et le responsable voit où les enfants de 3 à 5 ans sont hors du préscolaire.",
    aide: "Les mères qui peuvent reprendre le travail ou l'école, et les enfants, mieux préparés à entrer à l'école.",
  },
}
ETAPES_PARCOURS.forEach((e) => Object.assign(e, PLUS[e.code]))
