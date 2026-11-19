// Chansons et petits films d'apprentissage pour les 2-5 ans : 1 à 2 minutes, à regarder avec un adulte.
// Chaque film a une version française (voix du navigateur pour l'instant) et des emplacements pour les
// versions éwé, kabyè et tem, qui seront enregistrées par des locuteurs natifs et déposées dans
// frontend/public/videos/ (le nom du fichier se met dans `video`). Tant que `video` vaut null,
// la page affiche les paroles et le jeu interactif, pas un lecteur vide.

export const LANGUES_FILMS = [
  ['fr', 'Français', true],
  ['ee', 'Éwé', false],
  ['kbp', 'Kabyè', false],
  ['tem', 'Tem', false],
]

export const ALPHABET = [
  ['A', 'Avion'], ['B', 'Balle'], ['C', 'Cuillère'], ['D', 'Dent'], ['E', 'École'],
  ['F', 'Fleur'], ['G', 'Gâteau'], ['H', 'Habit'], ['I', 'Igname'], ['J', 'Jardin'],
  ['K', 'Kayak'], ['L', 'Lit'], ['M', 'Maman'], ['N', 'Nez'], ['O', 'Orange'],
  ['P', 'Papa'], ['Q', 'Quatre'], ['R', 'Riz'], ['S', 'Soleil'], ['T', 'Téléphone'],
  ['U', 'Uniforme'], ['V', 'Vélo'], ['W', 'Wagon'], ['X', 'Xylophone'], ['Y', 'Yaourt'],
  ['Z', 'Zèbre'],
]

export const NOMBRES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

export const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']

export const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août',
  'septembre', 'octobre', 'novembre', 'décembre']

export const COULEURS = [
  ['rouge', '#e2231a'], ['bleu', '#374ea2'], ['jaune', '#ffc20e'], ['vert', '#00833d'],
  ['orange', '#f26a21'], ['noir', '#2d2926'], ['blanc', '#ffffff'],
]

export const CORPS = [
  ['la tête', 'corps-tete'], ['les épaules', 'corps-epaules'], ['les genoux', 'corps-genou'], ['les pieds', 'corps-pied'],
  ['les mains', 'corps-main'], ['le ventre', 'corps-ventre'],
]

export const CHANSONS = [
  {
    id: 'alphabet',
    titre: "L'alphabet en chantant",
    icone: 'lettres',
    duree: '1 min 45',
    interaction: 'alphabet',
    age: '3 à 5 ans',
    paroles: [
      'A, B, C, D, E, F, G,',
      'H, I, J, K, L, M, N,',
      'O, P, Q, R, S, T,',
      'U, V, W, X, Y, Z !',
      'Chante avec moi, touche chaque lettre :',
      'A comme Avion, B comme Balle, C comme Cuillère…',
    ],
    video: null, // ex. : 'chanson-alphabet-fr.mp4'
  },
  {
    id: 'nombres',
    titre: 'Compter jusqu’à dix en chantant',
    icone: 'chiffres',
    duree: '1 min 30',
    interaction: 'nombres',
    age: '2 à 5 ans',
    paroles: [
      'Un, deux, trois, on frappe dans les mains,',
      'Quatre, cinq, six, on tape sur les genoux,',
      'Sept, huit, neuf, on touche son nez,',
      'Dix ! On lève les deux bras !',
      'Compte les points avec moi, un par un.',
    ],
    video: null,
  },
  {
    id: 'jours',
    titre: 'Les jours de la semaine',
    icone: 'calendrier',
    duree: '1 min 20',
    interaction: 'jours',
    age: '3 à 5 ans',
    paroles: [
      'Lundi, mardi, mercredi,',
      'Jeudi, vendredi, samedi,',
      'Et dimanche, on se repose !',
      'Quel jour sommes-nous aujourd’hui ?',
    ],
    video: null,
  },
  {
    id: 'mois',
    titre: 'Les douze mois de l’année',
    icone: 'calendrier',
    duree: '1 min 50',
    interaction: 'mois',
    age: '4 à 5 ans',
    paroles: [
      'Janvier, février, mars,',
      'Avril, mai, juin,',
      'Juillet, août, septembre,',
      'Octobre, novembre, décembre !',
      'Douze mois font une année.',
    ],
    video: null,
  },
  {
    id: 'couleurs',
    titre: 'Les couleurs autour de moi',
    icone: 'palette',
    duree: '1 min 15',
    interaction: 'couleurs',
    age: '2 à 4 ans',
    paroles: [
      'Rouge comme la tomate,',
      'Jaune comme le soleil,',
      'Vert comme la feuille,',
      'Bleu comme le ciel,',
      'Touche la couleur et dis son nom !',
    ],
    video: null,
  },
  {
    id: 'corps',
    titre: 'Tête, épaules, genoux, pieds',
    icone: 'danse',
    duree: '1 min 10',
    interaction: 'corps',
    age: '2 à 4 ans',
    paroles: [
      'Tête, épaules, genoux, pieds,',
      'Genoux, pieds !',
      'Tête, épaules, genoux, pieds,',
      'Genoux, pieds !',
      'Et on touche chaque partie du corps en chantant.',
    ],
    video: null,
  },
]

/** Le film est prêt dès qu'un fichier est déclaré (et déposé dans public/videos/). */
export function filmDe(chanson) {
  return chanson?.video ? `/videos/${chanson.video}` : null
}
