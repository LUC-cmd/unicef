// Libellés lisibles pour les valeurs techniques venues du serveur.
export const STATUT_DECLARATION = { ENVOYEE: 'À traiter', VALIDEE: 'Validées', REJETEE: 'Rejetées', BROUILLON: 'Brouillons' }
export const COULEUR_STATUT = { ENVOYEE: '#E0A100', VALIDEE: '#00833D', REJETEE: '#E2231A', BROUILLON: '#8A94A0' }
export const SOURCE_DECLARATION = { AGENT: 'Agent de santé', CENTRE_SANTE: 'Centre de santé', HOPITAL: 'Hôpital' }
export const ROLES = { AGENT: 'Agents de santé', MAIRIE: 'État civil', DECIDEUR: 'Responsables régionaux', STRUCTURE: 'Centres de santé', ADMIN: 'Administrateurs' }
export const STATUT_RAPPEL = { ENVOYE: 'Envoyés', ACQUITTE: 'Acquittés', SANS_REPONSE: 'Sans réponse' }
export const STATUT_RDV = { PLANIFIE: 'Planifiés', REALISE: 'Réalisés', MANQUE: 'Manqués' }
export const MUAC = { VERT: 'Normal', JAUNE: 'À surveiller', ROUGE: 'Urgent' }
export const COULEUR_MUAC = { VERT: '#00833D', JAUNE: '#E0A100', ROUGE: '#E2231A' }
const ACTIONS = {
  CONSULTER_ENFANT: 'Fiche enfant consultée', SYNCHRONISER: 'Synchronisation reçue', LISTER_DECLARATIONS: 'Déclarations consultées',
  DECLARER_NAISSANCE: 'Naissance déclarée', CONSULTER_ZONES: 'Zones consultées', REPONDRE_DEMANDE: 'Demande traitée',
  VALIDER_DECLARATION: 'Déclaration validée', REJETER_DECLARATION: 'Déclaration rejetée', VOIR_PREUVE: 'Preuve consultée',
}
export const libelleAction = (a) => ACTIONS[a] ?? a.toLowerCase().replaceAll('_', ' ').replace(/^./, (c) => c.toUpperCase())
export const heure = (iso) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
export const dateHeure = (iso) => new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
