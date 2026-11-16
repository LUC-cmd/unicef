// Repères de développement par âge (mois). Contenu à faire valider par un professionnel de santé de l'enfant
// avant toute utilisation réelle : il aide à repérer, il ne pose pas de diagnostic.
export const TRANCHES = [
  { de: 0, a: 3, jalons: [
    ['sourit', 'Sourit en réponse à un visage ou une voix'],
    ['suit', 'Suit un objet ou un visage des yeux'],
    ['sursaute', 'Réagit à un bruit fort'],
  ] },
  { de: 4, a: 6, jalons: [
    ['tete', 'Tient sa tête droite quand on le porte'],
    ['rit', 'Rit, gazouille'],
    ['attrape', 'Attrape un objet qu’on lui tend'],
  ] },
  { de: 7, a: 12, jalons: [
    ['assis', 'Reste assis sans aide'],
    ['babille', 'Fait des syllabes (ba-ba, ma-ma)'],
    ['rampe', 'Se déplace en rampant ou à quatre pattes'],
  ] },
  { de: 13, a: 24, jalons: [
    ['marche', 'Marche seul ou avec un appui'],
    ['mots', 'Dit quelques mots'],
    ['montre', 'Montre du doigt ce qu’il veut'],
  ] },
  { de: 25, a: 36, jalons: [
    ['phrases', 'Fait des phrases de deux ou trois mots'],
    ['court', 'Court, monte une marche'],
    ['imite', 'Imite les gestes des adultes (balayer, cuisiner)'],
  ] },
  { de: 37, a: 60, jalons: [
    ['histoire', 'Raconte ce qui s’est passé, pose des questions'],
    ['saute', 'Saute à pieds joints, lance une balle'],
    ['jeu', 'Joue avec d’autres enfants'],
  ] },
]

export function trancheDe(ageMois) {
  return TRANCHES.find((t) => ageMois >= t.de && ageMois <= t.a) ?? null
}

/** Un seul repère « à surveiller » ne dit rien ; deux ou plus justifient une orientation vers le centre de santé. */
export function aOrienter(etats) {
  return Object.values(etats).filter((v) => v === 'surveiller').length >= 2
}
