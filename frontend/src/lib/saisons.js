// Conseils de saison pour les familles. Les périodes sont indicatives pour le sud du Togo ; les textes de santé doivent être validés par un professionnel.
const SAISONS = [
  { mois: [3, 4, 5, 6], nom: 'Grandes pluies', picto: 'alerte', conseils: ['Dormir sous une moustiquaire, tous les soirs, pour toute la famille.', 'Vider les eaux qui stagnent autour de la maison : les moustiques y naissent.', 'Fièvre chez l’enfant : aller au centre de santé le jour même, sans attendre.', 'Laver les mains avec du savon et boire une eau propre pour éviter la diarrhée.'] },
  { mois: [7, 8], nom: 'Petite saison sèche', picto: 'soleil', conseils: ['Garder la moustiquaire : les moustiques restent là.', 'Donner à boire souvent à l’enfant quand il fait chaud.', 'Profiter de la saison pour faire les vaccins en retard.'] },
  { mois: [9, 10, 11], nom: 'Petites pluies', picto: 'alerte', conseils: ['Dormir sous une moustiquaire, tous les soirs.', 'Faire attention à l’eau de boisson : bouillie ou traitée.', 'Diarrhée : donner à boire, et aller au centre de santé si elle dure ou si l’enfant est très fatigué.'] },
  { mois: [12, 1, 2], nom: 'Saison sèche et harmattan', picto: 'soleil', conseils: ['Couvrir l’enfant la nuit et le protéger de la poussière.', 'Rhume ou toux qui dure : montrer l’enfant à l’agent de santé.', 'Donner à boire souvent : la peau et les lèvres sèchent vite.'] },
]
export const saisonDuMois = (date = new Date()) => { const m = date.getMonth() + 1; return SAISONS.find((s) => s.mois.includes(m)) ?? SAISONS[0] }
