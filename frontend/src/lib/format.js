// Petites fonctions d'affichage, sans dépendance, faciles à tester.

export function formaterDate(iso) {
  if (!iso) return '—'
  const [a, m, j] = iso.slice(0, 10).split('-')
  return `${j}/${m}/${a}`
}

export function aujourdhuiIso(d = new Date()) {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const j = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${j}`
}

/** Âge lisible : « 8 mois », « 2 ans 3 mois », « 12 jours ». */
export function ageLisible(naissanceIso, aujourdhui = new Date()) {
  if (!naissanceIso) return ''
  const n = new Date(naissanceIso + 'T00:00:00')
  const jours = Math.floor((aujourdhui - n) / 86400000)
  if (jours < 0) return ''
  if (jours < 60) return `${jours} jour${jours > 1 ? 's' : ''}`
  // Mois calendaires entiers (et non jours / 30,4) pour qu'un anniversaire tombe pile
  let mois = (aujourdhui.getFullYear() - n.getFullYear()) * 12 + (aujourdhui.getMonth() - n.getMonth())
  if (aujourdhui.getDate() < n.getDate()) mois -= 1
  if (mois < 24) return `${mois} mois`
  const ans = Math.floor(mois / 12)
  const reste = mois % 12
  return reste ? `${ans} ans ${reste} mois` : `${ans} ans`
}

/** Périmètre brachial (mm) : mêmes seuils que le serveur (OMS). Oriente, ne diagnostique pas. */
export function classerPB(mm) {
  if (mm === null || mm === undefined || mm === '' || Number.isNaN(Number(mm))) return 'NON_MESURE'
  const v = Number(mm)
  if (v < 115) return 'SEVERE'
  if (v < 125) return 'MODEREE'
  return 'NORMALE'
}

export const MESSAGE_PB = {
  SEVERE: 'Très bas : orienter tout de suite vers le centre de santé.',
  MODEREE: 'Bas : conseils de nutrition et nouvelle mesure bientôt.',
  NORMALE: 'Normal.',
  NON_MESURE: '',
}

export const LIBELLE_PORTE = {
  VOIX_SMS: 'Voix et SMS',
  AGENT: "Agent de santé",
  CARNET: 'Carnet illustré',
  POINT_ECOUTE: "Point d'écoute",
}

export const LIBELLE_SUJET = {
  GROSSESSE: 'Grossesse',
  NOUVEAU_NE: 'Nouveau-né',
  ALLAITEMENT: 'Allaitement',
  VACCINS: 'Vaccins',
  NUTRITION: 'Nutrition',
  HYGIENE: 'Hygiène',
  NAISSANCE: 'Déclarer la naissance',
  EVEIL: 'Un jeu par jour',
  DANGER: 'Signes de danger',
}

export const LIBELLE_LANGUE = { fr: 'Français', ewe: 'Éwé', kabye: 'Kabyè', tem: 'Tem' }

/** Couleur de l'indice d'oubli (0 bien suivie, 100 oubliée). */
export function couleurIndice(indice) {
  if (indice === null || indice === undefined) return '#777779'
  if (indice >= 60) return '#e2231a'
  if (indice >= 35) return '#f26a21'
  return '#00833d'
}

export const LIBELLE_ROLE_PROCHE = {
  RELAIS: 'Numéro relais',
  PERE: 'Père',
  GRAND_PARENT: 'Grand-parent',
  AUTRE_PROCHE: 'Autre proche',
}

export const LIBELLE_TYPE_STRUCTURE = {
  CENTRE_SANTE: 'Centre de santé',
  CRECHE: 'Crèche',
  PRESCOLAIRE: 'Préscolaire (3 à 5 ans)',
  CENTRE_SOCIAL: 'Centre social',
  ETAT_CIVIL: 'État civil',
}

export const LIBELLE_REPONSE = {
  RDV_PROPOSE: 'Rendez-vous proposé',
  PAS_DE_PLACE: 'Pas de place',
  AUTRE_STRUCTURE: 'Autre structure conseillée',
}

/** Zones de la démonstration (codes de la base). En production, elles viennent du serveur. */
export const ZONES = [
  ['GOLFE', 'Golfe (Lomé)'], ['AGOE', 'Agoè-Nyivé'], ['ZIO', 'Zio (Tsévié)'],
  ['VO', 'Vo (Vogan)'], ['YOTO', 'Yoto (Tabligbo)'], ['LACS', 'Lacs (Aného)'],
  ['AVE', 'Avé (Kévé)'], ['BASMONO', 'Bas-Mono (Afagnan)'],
]

const NOMS_JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
export const nomDuJour = (i) => NOMS_JOURS[i]

/** Âge en mois entiers (0 si la date est absente). */
export function ageEnMois(naissanceIso, aujourdhui = new Date()) {
  if (!naissanceIso) return 0
  const n = new Date(naissanceIso)
  let m = (aujourdhui.getFullYear() - n.getFullYear()) * 12 + aujourdhui.getMonth() - n.getMonth()
  if (aujourdhui.getDate() < n.getDate()) m -= 1
  return Math.max(0, m)
}
