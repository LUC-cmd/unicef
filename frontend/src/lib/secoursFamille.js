// Famille de démonstration de secours : toutes les données sont fictives. Elle s'ouvre quand le serveur de démonstration
// ne répond pas, pour que la démonstration ne tombe jamais. Rien n'est envoyé au serveur depuis ce mode.
const CRECHE = (code, nom, zone) => ({ code, nom, zone, telephone: '', horaires: '', ageMinMois: 12, ageMaxMois: 60, capacite: 25, ouverture: '07:00', fermeture: '17:00', jours: 'LUN,MAR,MER,JEU,VEN', conditions: 'Enfant de 1 à 5 ans, carnet de santé à jour.', aApporter: 'Un change, une gourde', tarif: '300 FCFA par jour (fictif)' })

export const PROFIL_SECOURS = {
  codeFamille: 'F-0001', zoneCode: 'GOLFE', zone: 'Golfe (Lomé)', enfantsDeclares: 3, enfantsSuivis: 3,
  enfants: [
    { codeEnfant: 'E-0001', statut: 'ENFANT', ageMois: 30, termePrevu: null, acte: 'RETIRE' },
    { codeEnfant: 'E-0002', statut: 'ENFANT', ageMois: 7, termePrevu: null, acte: 'ETABLI' },
    { codeEnfant: 'E-0003', statut: 'GROSSESSE', ageMois: null, termePrevu: new Date(Date.now() + 70 * 864e5).toISOString().slice(0, 10) },
  ],
}

export const PROCHES_SECOURS = [
  { creche: CRECHE('CR-GOLFE', 'Crèche communautaire du Golfe (fictive)', 'Golfe'), distanceKm: 0, proximite: 'Dans votre zone' },
  { creche: CRECHE('CR-AGOE', 'Crèche inclusive d’Agoè (fictive)', 'Agoè'), distanceKm: 12, proximite: 'À environ 12 km (Agoè-Nyivé)' },
]

const jour = (n) => new Date(Date.now() - n * 864e5).toISOString()
export const MESSAGES_SECOURS = [
  { id: 3, type: 'RAPPEL', message: 'Rappel : un rendez-vous de vaccination approche, jeudi au centre de santé. Répondez OK pour confirmer.', envoyeLe: jour(1), statut: 'ENVOYE' },
  { id: 2, type: 'JEU', message: 'Jeu du jour : cacher un objet sous un tissu et le faire chercher.', envoyeLe: jour(2), statut: 'INFO' },
  { id: 1, type: 'RAPPEL_GENERAL', message: 'Fil d’Or : une consultation prénatale est prévue le mois prochain. Notez-la sur votre carte.', envoyeLe: jour(4), statut: 'INFO' },
]
