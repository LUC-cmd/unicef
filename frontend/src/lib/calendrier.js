// Calendrier vaccinal INDICATIF (0 à 9 mois). Miroir de CalendrierVaccinal.java côté serveur :
// à valider avec le Programme élargi de vaccination (PEV) du ministère de la Santé, et à garder identique.
// Il sert à proposer, à l'inscription, la liste des vaccins déjà passés pour cocher ceux vus sur le carnet de santé,
// y compris hors ligne.

export const ETAPES = [
  { libelle: 'BCG et polio 0 (naissance)', jours: 0 },
  { libelle: 'Penta 1, pneumo 1, polio 1, rota 1', jours: 42 },
  { libelle: 'Penta 2, pneumo 2, polio 2, rota 2', jours: 70 },
  { libelle: 'Penta 3, pneumo 3, polio 3, VPI', jours: 98 },
  { libelle: 'Rougeole-rubéole et fièvre jaune', jours: 274 },
]

export const CONSULTATIONS_PRENATALES = 4

function ajouterJours(iso, jours) {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + jours)
  return d.toISOString().slice(0, 10)
}

/** Les étapes déjà passées (ou du jour) pour un enfant né à cette date : celles que l'agent peut cocher. */
export function etapesPassees(naissanceIso, aujourdhuiIso) {
  if (!naissanceIso) return []
  return ETAPES.map((e, index) => ({ ...e, index, date: ajouterJours(naissanceIso, e.jours) }))
    .filter((e) => e.date <= aujourdhuiIso)
}
