/** Aides d'affichage du suivi : états des références, priorités des villages, délais lisibles, anneau de couverture. */
export const ETATS_REF = { envoyee: 'Envoyée', recue: 'Reçue', arrivee: 'Arrivée au centre', prise: 'Prise en charge', suivie: 'Suivie à la maison' }
export const PRIORITES = { prioritaire: 'Prioritaire', renforcer: 'À renforcer', bonne: 'En bonne voie' }

export function delaiLisible(min) {
  if (min == null || Number.isNaN(min)) return '–'
  if (min < 60) return `${Math.max(0, Math.round(min))} min`
  const h = Math.floor(min / 60), m = Math.round(min % 60)
  if (h < 24) return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`
  const j = Math.floor(h / 24)
  return `${j} j ${h % 24} h`
}

export function anneau(pct, r = 26) {
  const p = Math.min(100, Math.max(0, Number(pct) || 0))
  const c = +(2 * Math.PI * r).toFixed(2)
  return { r, c, reste: +(c * (1 - p / 100)).toFixed(2) }
}

export function heureCourte(iso) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}
