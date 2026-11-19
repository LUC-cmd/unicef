// Emplacements des vidéos d'éveil. Chaque jeu pourra avoir sa vraie vidéo tournée avec des
// locuteurs natifs (éwé, kabyè, tem, français) : déposez le fichier dans frontend/public/videos/
// et mettez son nom ici. Tant que la valeur est null, la page affiche la fiche illustrée
// « vidéo à venir » au lieu d'un lecteur vide.

const FICHIERS = {
  compter: null,   // ex : 'eveil-compter-ewe.mp4'
  couleurs: null,
  formes: null,
  taille: null,
  assiette: null,
  memoire: null,
  mains: null,
  opposes: null,
  corps: null,
  sons: null,
}

export function videoDe(jeuId) {
  const nom = FICHIERS[jeuId]
  return nom ? `/videos/${nom}` : null
}

export const JEUX_ATTENDUS = Object.keys(FICHIERS)
