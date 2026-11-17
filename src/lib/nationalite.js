// Procédure de nationalité d'un enfant né au Togo. Les listes de pièces sont provisoires :
// l'état civil et la justice doivent les confirmer avant l'usage réel.
export const ETAPES_NATIONALITE = [
  ['Naissance validée', 'L’acte est établi'],
  ['Pièces réunies', 'Le dossier est complet'],
  ['Dossier déposé', 'Auprès du service compétent'],
  ['Nationalité reconnue', 'Certificat remis'],
]

export const VOIES = {
  FILIATION: { nom: 'Un parent togolais', aide: 'L’enfant est togolais par son parent.',
    pieces: [['ACTE_ENFANT', 'Acte de naissance de l’enfant'], ['PIECE_PARENT', 'Pièce du parent togolais']] },
  SANS_PAPIERS: { nom: 'Parents sans papiers', aide: 'On reconstitue les preuves avec la communauté.',
    pieces: [['ACTE_ENFANT', 'Acte de naissance de l’enfant'], ['ATTESTATION_CHEF', 'Attestation du chef de quartier ou de village'],
      ['TEMOINS', 'Deux témoins qui connaissent la famille'], ['JUGEMENT', 'Jugement supplétif si un parent n’a pas d’acte']] },
  PARENTS_ETRANGERS: { nom: 'Parents étrangers', aide: 'Né au Togo : on regarde les options ouvertes à l’enfant.',
    pieces: [['ACTE_ENFANT', 'Acte de naissance de l’enfant'], ['PIECE_PARENTS', 'Pièces des parents (consulat)'],
      ['RESIDENCE', 'Preuve de résidence au Togo']] },
  A_PRECISER: { nom: 'À préciser', aide: 'Demander la nationalité des parents à la famille.',
    pieces: [['ACTE_ENFANT', 'Acte de naissance de l’enfant']] },
}

export const piecesFaites = (d) => (d.piecesOk || '').split(',').filter(Boolean)
export const complet = (d) => (VOIES[d.voie] ?? VOIES.A_PRECISER).pieces.every(([k]) => piecesFaites(d).includes(k))
