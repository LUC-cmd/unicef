// Lecture du contenu du QR signé du carnet. Le contenu vient du serveur (déjà vérifié) :
// fam = code famille, e[] = un objet par enfant (c = code, s = statut, n = naissance, t = terme,
// ok[] = rendez-vous faits "TYPE@date", p = prochain rendez-vous "TYPE@date"). Aucun nom.

export const PICTO_QR = { V: '💉 Vaccin', C: '🤰 Consultation prénatale', P: '⚖️ Pesée / mesure', N: '🥣 Nutrition' }

/** "V@2026-09-01" → { picto, libelle, date }. Type inconnu : affiché tel quel. */
export function lireEntree(entree) {
  const [type, date] = String(entree || '').split('@')
  return { picto: PICTO_QR[type] || `📌 ${type}`, date: date || '' }
}

/** Met le contenu brut du serveur en forme pour l'affichage. */
export function lireSuivi(contenu) {
  if (!contenu || typeof contenu !== 'object') return null
  return {
    famille: contenu.fam || '',
    genere: contenu.g || '',
    enfants: (contenu.e || []).map((e) => ({
      code: e.c || '',
      statut: e.s || '',
      naissance: e.n || '',
      terme: e.t || '',
      faits: e.ok || [],
      prochain: e.p || '',
    })),
  }
}
