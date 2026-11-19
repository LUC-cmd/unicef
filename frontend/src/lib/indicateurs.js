// Indicateurs de résultats. TOUTES LES VALEURS SONT FICTIVES (démonstration) : elles seront calculées sur les vraies données du déploiement.
export const PERIODE = '2026Q4'
export const INDICATEURS = [
  { id: 'IND_NAIS45', nom: 'Naissances déclarées sous 45 jours', valeur: 71, cible: 90, unite: '%' },
  { id: 'IND_VACC', nom: 'Enfants avec tous leurs vaccins à jour', valeur: 64, cible: 90, unite: '%' },
  { id: 'IND_CPN4', nom: 'Femmes enceintes ayant fait 4 consultations prénatales', valeur: 58, cible: 80, unite: '%' },
  { id: 'IND_SUIVIS', nom: 'Enfants suivis par un agent', valeur: 76, cible: 100, unite: ' enfants' },
  { id: 'IND_BRAS', nom: 'Enfants mesurés (bras) ce trimestre', valeur: 52, cible: 76, unite: ' enfants' },
  { id: 'IND_DEV', nom: 'Bilans de développement faits par les familles', valeur: 31, cible: 76, unite: ' enfants' },
  { id: 'IND_CRECHE', nom: 'Places de crèche occupées', valeur: 120, cible: 200, unite: ' places' },
  { id: 'IND_FILLES', nom: 'Filles libérées pour l’école (scénario)', valeur: 18, cible: 40, unite: ' filles' },
]
const ORG = 'ORG_REGION_MARITIME_FICTIVE'
/** Au format dataValueSet de DHIS2 : codes fictifs, à faire correspondre avec ceux du ministère de la Santé. */
export const versDhis2 = () => ({ dataValues: INDICATEURS.map((i) => ({ dataElement: i.id, period: PERIODE, orgUnit: ORG, value: String(i.valeur) })) })
